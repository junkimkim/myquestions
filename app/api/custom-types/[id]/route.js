import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadSeedTypeById } from '@/lib/customTypesSeed.server';
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

export async function PATCH(request, context) {
  const authClient = await createSupabaseServerClient();
  const { data: { user }, error: authErr } = await authClient.auth.getUser();
  if (authErr || !user) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const id = params?.id;
    if (!id || typeof id !== 'string') {
      return Response.json({ error: 'id 필요' }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const supabase = createSupabaseAdmin();
    const { data: existing } = await supabase.from('custom_question_types').select('*').eq('id', id).maybeSingle();
    const seed = await loadSeedTypeById(id);

    const nextKind = ['writing', 'vocabulary', 'mcq'].includes(body.kind)
      ? body.kind
      : existing?.kind ?? (seed?.kind && ['writing', 'vocabulary'].includes(seed.kind) ? seed.kind : 'mcq');

    const is_descriptive = typeof body.is_descriptive === 'boolean' ? body.is_descriptive : existing?.is_descriptive ?? false;

    const name =
      typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : existing?.name ?? seed?.name ?? id;

    const description =
      body.desc !== undefined
        ? String(body.desc)
        : body.description !== undefined
          ? String(body.description)
          : existing?.description ?? seed?.desc ?? '';

    let prompt =
      typeof body.prompt === 'string'
        ? body.prompt
        : existing?.prompt ?? '';

    if (!prompt || !String(prompt).trim()) {
      prompt = defaultCustomPromptForKind(nextKind);
    }

    if (nextKind === 'writing' && !String(prompt).includes('{answer}')) {
      prompt = defaultCustomPromptForKind('writing');
    }
    if (nextKind === 'vocabulary' && !String(prompt).includes('{vocab}')) {
      prompt = defaultCustomPromptForKind('vocabulary');
    }

    const { error } = await supabase.from('custom_question_types').upsert(
      {
        id,
        name,
        description,
        kind: nextKind,
        prompt: String(prompt).trim(),
        ...(nextKind === 'mcq' ? { is_descriptive } : {}),
        ...(nextKind === 'mcq' &&
        body.mcq_category !== undefined
          ? MCQ_CATEGORIES.has(String(body.mcq_category).trim())
            ? { mcq_category: String(body.mcq_category).trim() }
            : { mcq_category: null }
          : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    const message = normalizeErrorMessage(e);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const authClient = await createSupabaseServerClient();
  const { data: { user }, error: authErr } = await authClient.auth.getUser();
  if (authErr || !user) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const id = params?.id;
    if (!id || typeof id !== 'string') {
      return Response.json({ error: 'id 필요' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    await supabase.from('custom_question_types').delete().eq('id', id);
    const { error } = await supabase.from('removed_question_type_ids').upsert({ id }, { onConflict: 'id' });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    const message = normalizeErrorMessage(e);
    return Response.json({ error: message }, { status: 500 });
  }
}
