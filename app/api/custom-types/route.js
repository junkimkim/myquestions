import { randomUUID } from 'crypto';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { loadSeedPrompts, loadSeedTypes } from '@/lib/customTypesSeed.server';
import { mergeTypesAndPrompts } from '@/lib/mergeCustomTypesPayload';
import { defaultCustomPromptForKind } from '@/lib/defaultPrompts';

export const dynamic = 'force-dynamic';

const MCQ_CATEGORIES = new Set(['topic-title', 'comprehension', 'blank', 'order-insert', 'summary', 'grammar-mcq']);

function normalizeErrorMessage(e, fallback = '요청 처리 중 오류가 발생했습니다.') {
  if (e instanceof Error && e.message) return e.message;
  if (e && typeof e === 'object') {
    if (typeof e.message === 'string' && e.message.trim()) return e.message;
    if (typeof e.details === 'string' && e.details.trim()) return e.details;
    if (typeof e.hint === 'string' && e.hint.trim()) return e.hint;
    try {
      const s = JSON.stringify(e);
      if (s && s !== '{}' && s !== 'null') return s;
    } catch {}
  }
  if (typeof e === 'string' && e.trim()) return e;
  return fallback;
}

export async function GET() {
  try {
    const supabase = createSupabaseAdmin();
    const [{ data: rows, error: errRows }, { data: removedRows, error: errRemoved }] = await Promise.all([
      supabase.from('custom_question_types').select('*').order('updated_at', { ascending: false }),
      supabase.from('removed_question_type_ids').select('id'),
    ]);
    if (errRows) throw errRows;
    if (errRemoved) throw errRemoved;

    const seedTypes = await loadSeedTypes();
    const seedPrompts = await loadSeedPrompts();
    const removedIds = (removedRows || []).map((r) => r.id);
    const { types, prompts } = mergeTypesAndPrompts(seedTypes, seedPrompts, rows || [], removedIds);

    return Response.json({ types, prompts });
  } catch (e) {
    const message = normalizeErrorMessage(e);
    return Response.json({ error: message }, { status: 500 });
  }
}

/** 새 유형 추가 */
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return Response.json({ error: 'name 필수' }, { status: 400 });

    const kind = ['writing', 'vocabulary'].includes(body.kind) ? body.kind : 'mcq';
    const is_descriptive = typeof body.is_descriptive === 'boolean' ? body.is_descriptive : false;
    const mcqCategory =
      typeof body.mcq_category === 'string' && MCQ_CATEGORIES.has(body.mcq_category.trim()) ? body.mcq_category.trim() : null;
    const desc = typeof body.desc === 'string' ? body.desc.trim() : '';
    const promptRaw = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const prompt = promptRaw || defaultCustomPromptForKind(kind);

    const id =
      typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `c_${randomUUID().replace(/-/g, '')}`;

    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from('custom_question_types').insert({
      id,
      name,
      description: desc || '사용자 정의 유형',
      kind,
      prompt,
      mcq_category: kind === 'mcq' ? mcqCategory : null,
      is_descriptive,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return Response.json({ ok: true, id });
  } catch (e) {
    const message = normalizeErrorMessage(e);
    return Response.json({ error: message }, { status: 500 });
  }
}

/** 프롬프트 일괄 저장(메인 모달) */
export async function PUT(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const items = body.items;
    if (!Array.isArray(items)) return Response.json({ error: 'items 배열 필수' }, { status: 400 });

    const supabase = createSupabaseAdmin();
    const now = new Date().toISOString();

    const rows = [];
    for (const it of items) {
      if (!it || typeof it.id !== 'string') continue;
      const kind = ['writing', 'vocabulary'].includes(it.kind) ? it.kind : 'mcq';
      const is_descriptive = typeof it.is_descriptive === 'boolean' ? it.is_descriptive : false;
      const mcqCategory =
        kind === 'mcq' &&
        typeof it.mcq_category === 'string' &&
        MCQ_CATEGORIES.has(it.mcq_category.trim())
          ? it.mcq_category.trim()
          : null;
      const name = typeof it.name === 'string' ? it.name : it.id;
      const description = typeof it.desc === 'string' ? it.desc : '';
      const prompt =
        typeof it.prompt === 'string' && it.prompt.trim()
          ? it.prompt.trim()
          : defaultCustomPromptForKind(kind);
      const row = { id: it.id, name, description, kind, prompt, updated_at: now };
      // mcq_category가 없으면 기존 DB 값 유지(업서트 컬럼 생략)
      if (kind === 'mcq' && it.mcq_category !== undefined) row.mcq_category = mcqCategory;
      if (it.is_descriptive !== undefined) row.is_descriptive = is_descriptive;
      rows.push(row);
    }

    if (rows.length > 0) {
      const { error } = await supabase.from('custom_question_types').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }

    return Response.json({ ok: true });
  } catch (e) {
    const message = normalizeErrorMessage(e);
    return Response.json({ error: message }, { status: 500 });
  }
}
