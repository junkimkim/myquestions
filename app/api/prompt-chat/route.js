const PROMPT_ASSISTANT_SYSTEM = `당신은 고등학교 내신 영어 문제 출제를 위한 "변형 문제 생성" 앱(QuizForge)에서 쓰는 프롬프트 작성을 돕는 조력자입니다.

[앱에서 쓰는 플레이스홀더]
- {passage} : 학생에게 줄 영어 지문 (대부분의 객관식·서술형에 필요)
- {answer} : 서술형·영작 등 모범 답안 또는 정답 문맥
- {vocab} : 출제할 단어 목록 (어휘 유형)
- {voca} : 지문에 나오는 어휘 5개(예: 문맥상 어색한 낱말 객관식용, 메인 화면 전용 5칸)
- {grammar_exprs} : 어법상 틀린 곳 찾기용 지문 표현 5개(밑줄 후보·맞는/틀린 보기 근거)
- {underlined_sentence} 또는 {underlined_stentence} : 밑줄 친 표현
- {answer_count} : 정답 항목 개수(서술형 다중 정답 등)
- {n} : 어법상 틀린 곳 찾기(객관식)에서 틀린 밑줄 개수(앱에서 1 또는 2만 선택)

[역할]
- 사용자가 원하는 문제 유형·난이도·출력 형식을 물으면, 위 플레이스홀더를 쓴 붙여넣기 가능한 프롬프트 초안을 제시합니다.
- 한국 고등학교 내신 맥락을 고려하고, 지시는 구체적으로 씁니다.
- 최종 프롬프트는 코드 블록(백틱 세 개)으로 감싸 주면 사용자가 복사하기 좋습니다.`;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  const { apiKey, model, messages, max_tokens } = body;

  if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('sk-')) {
    return Response.json({ error: { message: 'OpenAI API 키가 필요합니다. (sk-로 시작)' } }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: { message: 'messages 배열이 필요합니다.' } }, { status: 400 });
  }

  const safeMessages = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 32000) }));

  if (safeMessages.length === 0) {
    return Response.json({ error: { message: '유효한 대화 메시지가 없습니다.' } }, { status: 400 });
  }

  const resolvedModel = model || 'gpt-5-mini';
  const openaiBody = {
    model: resolvedModel,
    messages: [{ role: 'system', content: PROMPT_ASSISTANT_SYSTEM }, ...safeMessages],
    max_tokens: Math.min(Math.max(Number(max_tokens) || 2500, 256), 8192),
  };

  if (!/^gpt-5/i.test(resolvedModel)) {
    openaiBody.temperature = 0.65;
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
