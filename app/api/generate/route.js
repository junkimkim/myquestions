export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  const { apiKey, model, messages, max_tokens, temperature } = body;

  if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('sk-')) {
    return Response.json({ error: { message: 'OpenAI API 키가 필요합니다. (sk-로 시작)' } }, { status: 400 });
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages,
      max_tokens: max_tokens ?? 1200,
      temperature: temperature ?? 0.7,
    }),
  });

  const data = await res.json();
  return Response.json(data, { status: res.ok ? 200 : res.status });
}
