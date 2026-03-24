import { randomUUID } from 'crypto';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { loadSeedPrompts, loadSeedTypes } from '@/lib/customTypesSeed.server';
import { mergeTypesAndPrompts } from '@/lib/mergeCustomTypesPayload';
import { defaultCustomPromptForKind } from '@/lib/defaultPrompts';

export const dynamic = 'force-dynamic';

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
    const message = e instanceof Error ? e.message : String(e);
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
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return Response.json({ ok: true, id });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
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
      const name = typeof it.name === 'string' ? it.name : it.id;
      const description = typeof it.desc === 'string' ? it.desc : '';
      const prompt =
        typeof it.prompt === 'string' && it.prompt.trim()
          ? it.prompt.trim()
          : defaultCustomPromptForKind(kind);
      rows.push({ id: it.id, name, description, kind, prompt, updated_at: now });
    }

    if (rows.length > 0) {
      const { error } = await supabase.from('custom_question_types').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }

    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ error: message }, { status: 500 });
  }
}
