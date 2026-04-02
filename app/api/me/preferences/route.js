import { DEFAULT_GPT_MODEL, isAllowedGptModelId } from '@/lib/openaiModels';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return Response.json({ preferredGptModel: DEFAULT_GPT_MODEL });
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return Response.json({ preferredGptModel: DEFAULT_GPT_MODEL });
  }

  const { data: row, error } = await supabase
    .from('profiles')
    .select('preferred_gpt_model')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const preferred =
    row?.preferred_gpt_model && isAllowedGptModelId(row.preferred_gpt_model)
      ? row.preferred_gpt_model.trim()
      : DEFAULT_GPT_MODEL;

  return Response.json({ preferredGptModel: preferred });
}

export async function PATCH(request) {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Supabase 미구성' }, { status: 503 });
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const raw = typeof body.preferredGptModel === 'string' ? body.preferredGptModel.trim() : '';
  if (!raw || !isAllowedGptModelId(raw)) {
    return Response.json({ error: '유효하지 않은 모델입니다.' }, { status: 400 });
  }

  const { error } = await supabase.from('profiles').update({ preferred_gpt_model: raw }).eq('id', user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, preferredGptModel: raw });
}
