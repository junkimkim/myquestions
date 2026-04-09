import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export async function GET(request) {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return Response.json({ error: 'Supabase 미구성' }, { status: 503 });
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all'; // all | spend | charge
  const month = searchParams.get('month') || '';  // YYYY-MM
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('credit_ledger')
    .select('id, type, amount, balance_after, reference, meta, created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (type === 'spend') {
    query = query.eq('type', 'spend');
  } else if (type === 'charge') {
    query = query.in('type', ['charge', 'refund', 'adjust']);
  }

  if (month) {
    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();
    query = query.gte('created_at', start).lt('created_at', end);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    rows: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
  });
}
