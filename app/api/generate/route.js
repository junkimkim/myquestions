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

  const resolvedModel = model || 'gpt-5-mini';
  const openaiBody = {
    model: resolvedModel,
    messages,
    max_tokens: max_tokens ?? 1200,
  };
  // GPT-5 계열은 chat completions에서 temperature 등을 지정하면 400이 날 수 있음 (기본값만 허용)
  if (!/^gpt-5/i.test(resolvedModel)) {
    openaiBody.temperature = temperature ?? 0.7;
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(openaiBody),
  });

  const data = await res.json();
  return Response.json(data, { status: res.ok ? 200 : res.status });
}
