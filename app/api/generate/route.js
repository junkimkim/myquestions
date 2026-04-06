import { randomUUID } from 'crypto';
import {
  CASH_MAIN_PER_TYPE_CALL,
  CASH_ONE_TYPE_PER_PASSAGE_UNIT,
} from '@/lib/cashRules';
import { getCashCostPerGeneration } from '@/lib/credits';
import {
  assertExpectedBatchReady,
  consumeExpectedBatchSlot,
} from '@/lib/expectedBatchRegistry';
import { checkGenerateRateLimit } from '@/lib/generateRateLimit';
import { DEFAULT_GPT_MODEL, isGpt5FamilyModel } from '@/lib/openaiModels';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { chargeCreditsServer, spendCreditsServer } from '@/lib/serverCredits';

export const dynamic = 'force-dynamic';

function summarizeInput(messages) {
  if (!Array.isArray(messages)) return null;
  const users = messages.filter((m) => m && m.role === 'user');
  const last = users[users.length - 1];
  const t = String(last?.content ?? '').trim();
  if (!t) return null;
  return t.length > 500 ? `${t.slice(0, 500)}…` : t;
}

function errPayload(message, code, extra) {
  return { error: { message, code, ...extra } };
}

/**
 * @param {Record<string, unknown>} body
 * @returns {{ cost: number, expectedFreeBatchId: string | null }}
 */
function resolveGenerationCost(body) {
  const batchId =
    typeof body.expectedFreeBatchId === 'string' && body.expectedFreeBatchId.trim()
      ? body.expectedFreeBatchId.trim()
      : null;
  if (batchId) {
    return { cost: 0, expectedFreeBatchId: batchId };
  }
  if (body.cashPolicy === 'main') {
    return { cost: CASH_MAIN_PER_TYPE_CALL, expectedFreeBatchId: null };
  }
  if (body.cashPolicy === 'one_type') {
    const t = Math.max(1, Math.min(50, Number.parseInt(String(body.oneTypeSelectedCount ?? '1'), 10) || 1));
    return { cost: CASH_ONE_TYPE_PER_PASSAGE_UNIT * t, expectedFreeBatchId: null };
  }
  return { cost: getCashCostPerGeneration(), expectedFreeBatchId: null };
}

export async function POST(request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return Response.json(errPayload('로그인이 필요합니다.', 'UNAUTHORIZED'), { status: 401 });
  }

  const rl = checkGenerateRateLimit(user.id);
  if (!rl.ok) {
    return Response.json(
      errPayload('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 'RATE_LIMITED', { retryAfterSec: rl.retryAfterSec }),
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSec) },
      },
    );
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey || !openaiKey.startsWith('sk-')) {
    return Response.json(
      errPayload('서버에 OpenAI API 키가 설정되지 않았습니다. 관리자에게 문의하세요.', 'OPENAI_NOT_CONFIGURED'),
      { status: 503 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(errPayload('Invalid JSON body', 'BAD_REQUEST'), { status: 400 });
  }

  const { model, messages, max_tokens, temperature, typeLabel, inputSummary } = body;

  if (!messages || !Array.isArray(messages)) {
    return Response.json(errPayload('messages 배열이 필요합니다.', 'BAD_REQUEST'), { status: 400 });
  }

  const { cost, expectedFreeBatchId } = resolveGenerationCost(body);

  if (expectedFreeBatchId) {
    if (!assertExpectedBatchReady(expectedFreeBatchId, user.id)) {
      return Response.json(
        errPayload('예상문제 배치가 유효하지 않거나 남은 횟수가 없습니다. 처음부터 다시 시도해 주세요.', 'BAD_BATCH'),
        { status: 400 },
      );
    }
  }

  const { data: wallet, error: walletErr } = await supabase
    .from('user_wallets')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  if (walletErr) {
    return Response.json(errPayload(walletErr.message, 'WALLET_READ_FAILED'), { status: 500 });
  }

  const balance = wallet?.balance ?? 0;
  if (cost > 0 && balance < cost) {
    return Response.json(
      errPayload(
        `캐쉬가 부족합니다. (필요: ${cost}, 잔액: ${balance}) 충전 후 이용해 주세요.`,
        'INSUFFICIENT_CREDITS',
        { requiredCredits: cost, balance },
      ),
      { status: 402 },
    );
  }

  const resolvedModel = typeof model === 'string' && model.trim() ? model.trim() : DEFAULT_GPT_MODEL;
  const summary =
    typeof inputSummary === 'string' && inputSummary.trim()
      ? inputSummary.trim().slice(0, 500)
      : summarizeInput(messages);
  const label =
    typeof typeLabel === 'string' && typeLabel.trim() ? typeLabel.trim().slice(0, 200) : null;

  const jobId = randomUUID();
  const admin = createSupabaseAdmin();

  const { error: pendErr } = await admin.from('generation_jobs').insert({
    id: jobId,
    user_id: user.id,
    cost_credits: cost,
    model: resolvedModel,
    type_label: label,
    status: 'pending',
    input_summary: summary,
  });

  if (pendErr) {
    console.error('[generate] generation_jobs pending insert failed', pendErr);
    return Response.json(errPayload('생성 작업을 시작할 수 없습니다.', 'JOB_INSERT_FAILED'), { status: 500 });
  }

  const openaiBody = {
    model: resolvedModel,
    messages,
    max_tokens: max_tokens ?? 1200,
  };
  if (!isGpt5FamilyModel(resolvedModel)) {
    openaiBody.temperature = temperature ?? 0.7;
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify(openaiBody),
  });

  const data = await res.json();

  if (!res.ok) {
    await admin.from('generation_jobs').update({ status: 'failed' }).eq('id', jobId);
    return Response.json(data, { status: res.status });
  }

  const content = data?.choices?.[0]?.message?.content;
  if (content == null || typeof content !== 'string') {
    await admin.from('generation_jobs').update({ status: 'failed' }).eq('id', jobId);
    return Response.json(errPayload('OpenAI 응답 형식이 올바르지 않습니다.', 'OPENAI_BAD_RESPONSE'), { status: 502 });
  }

  const ref = `spend:gen:${jobId}`;
  const meta = { model: resolvedModel, path: 'generate', expectedFreeBatchId: expectedFreeBatchId || undefined };

  let spendResult = null;
  if (cost > 0) {
    try {
      spendResult = await spendCreditsServer(user.id, cost, ref, meta);
    } catch (e) {
      const msg = e?.message ?? String(e);
      await admin.from('generation_jobs').update({ status: 'failed' }).eq('id', jobId);
      if (msg.includes('INSUFFICIENT_CREDIT_BALANCE') || msg.includes('INSUFFICIENT')) {
        return Response.json(
          errPayload('캐쉬가 부족합니다. 잠시 후 다시 시도해 주세요.', 'INSUFFICIENT_CREDITS', { race: true }),
          { status: 402 },
        );
      }
      return Response.json(errPayload(msg, 'SPEND_FAILED'), { status: 500 });
    }
  }

  const { error: outErr } = await admin.from('generation_outputs').insert({
    job_id: jobId,
    result_text: content,
  });

  if (outErr) {
    console.error('[generate] generation_outputs insert failed', outErr);
    if (cost > 0) {
      try {
        await chargeCreditsServer(user.id, cost, `refund:gen:${jobId}`, { reason: 'output_insert_failed', jobId });
      } catch (re) {
        console.error('[generate] refund after output failure failed', re);
      }
    }
    await admin.from('generation_jobs').update({ status: 'failed' }).eq('id', jobId);
    return Response.json(errPayload('생성 결과 저장에 실패했습니다. 지원팀에 문의해 주세요.', 'OUTPUT_INSERT_FAILED'), { status: 500 });
  }

  if (expectedFreeBatchId) {
    consumeExpectedBatchSlot(expectedFreeBatchId, user.id);
  }

  await admin.from('generation_jobs').update({ status: 'completed', input_summary: summary }).eq('id', jobId);

  const balanceAfter =
    spendResult?.balance ?? (cost > 0 ? balance - cost : balance);

  return Response.json({
    ...data,
    quizforge: {
      jobId,
      balanceAfter,
      creditsCharged: cost,
      cashCharged: cost,
    },
  });
}
