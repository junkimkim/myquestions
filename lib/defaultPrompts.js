export const DEFAULT_PROMPTS = {
  blank: `다음 영어 지문을 읽고, 수능 영어 빈칸 추론 문제를 1문항 생성해 주세요.

[지문]
{passage}

[요구사항]
1. 지문에서 핵심 내용을 담은 어구(단어 또는 짧은 구)를 선정하여 빈칸(_____)으로 처리하세요.
2. 빈칸이 포함된 지문 전체를 제시하세요.
3. 정답을 포함한 5개의 선택지를 만드세요. 오답도 지문 맥락과 유사하게 만드세요.
4. 정답 번호와 해설(한국어)을 제시하세요.
5. 출력 형식:
   [문제] ... 
   ① ② ③ ④ ⑤
   [정답] 
   [해설]`,

  order: `다음 영어 지문을 읽고, 수능 영어 순서 배열 문제를 1문항 생성해 주세요.

[지문]
{passage}

[요구사항]
1. 지문을 주어진 첫 문장(도입부) 1개와 (A), (B), (C) 세 단락으로 나누세요.
2. 도입 문장을 제시한 후, (A)/(B)/(C) 세 단락을 섞어서 제시하세요.
3. 올바른 순서를 포함한 5개의 보기를 만드세요 (예: ① (A)-(C)-(B) 형식).
4. 정답 번호와 순서 근거를 한국어로 해설하세요.
5. 출력 형식:
   [문제] 주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?
   [도입 문장] ...
   (A) ... (B) ... (C) ...
   ① ② ③ ④ ⑤
   [정답]
   [해설]`,

  title: `다음 영어 지문을 읽고, 수능 영어 제목/주제 추론 문제를 2문항 생성해 주세요.

[지문]
{passage}

[요구사항]
1. 첫 번째 문항: 글의 제목으로 가장 적절한 것을 고르는 문제 (영어 선택지 5개)
2. 두 번째 문항: 글의 주제로 가장 적절한 것을 고르는 문제 (한국어 선택지 5개)
3. 오답 선택지는 지문과 관련은 있지만 핵심을 벗어난 내용으로 만드세요.
4. 각 문항마다 정답 번호와 한국어 해설을 제시하세요.
5. 출력 형식:
   [1번 - 제목 추론]
   ① ② ③ ④ ⑤
   [정답] [해설]
   [2번 - 주제 추론]
   ① ② ③ ④ ⑤
   [정답] [해설]`,

  grammar: `다음 영어 지문을 읽고, 수능 영어 어법 문제를 1문항 생성해 주세요.

[지문]
{passage}

[요구사항]
1. 지문의 5곳에 밑줄(또는 번호 표시)을 치고, 어법상 맞는 표현 또는 틀린 표현을 고르는 문제를 만드세요.
2. 형식은 "다음 밑줄 친 부분 중 어법상 틀린 것은?" 형태로 하세요.
3. 밑줄 친 부분에 ①②③④⑤ 번호를 매기세요. 나머지 4개는 옳고 1개만 틀리도록 구성하세요.
4. 정답 번호와 문법적 설명을 한국어로 해설하세요.
5. 출력 형식:
   [문제] 다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?
   [지문 - 밑줄 표시 포함]
   [정답]
   [해설]`,
};

export const TYPE_INFO = {
  blank: { label: '빈칸 추론', tagClass: 't1', name: '빈칸 추론', desc: '핵심 어구를 빈칸으로 처리하고 5지선다 보기 생성', tag: '수능형' },
  order: { label: '순서 배열', tagClass: 't2', name: '순서 배열', desc: '문단을 섞어서 올바른 순서를 찾는 문제', tag: '논리형' },
  title: { label: '제목/주제 추론', tagClass: 't3', name: '제목/주제 추론', desc: '글의 제목 또는 주제를 고르는 5지선다 문제', tag: '독해형' },
  grammar: { label: '문법/어법', tagClass: 't4', name: '문법/어법', desc: '어법상 옳은/틀린 표현 찾기 문제 생성', tag: '문법형' },
};

export const QUESTION_TYPES = ['blank', 'order', 'title', 'grammar'];

/** 맞춤 유형 배지 색 순환 */
export const CUSTOM_TAG_CLASSES = ['t1', 't2', 't3', 't4', 't5'];

export const DEFAULT_CUSTOM_PROMPT = `다음 영어 지문을 읽고, 아래 요구에 맞는 변형문제를 생성해 주세요.

[지문]
{passage}

[요구사항]
1. 수능 영어 수준에 맞는 난이도로 작성하세요.
2. 문제, 보기, 정답, 한국어 해설을 명확히 구분해 제시하세요.`;

export function isBuiltinType(typeId) {
  return QUESTION_TYPES.includes(typeId);
}

export function tagClassForCustom(index) {
  return CUSTOM_TAG_CLASSES[index % CUSTOM_TAG_CLASSES.length];
}

/** @param {{ id: string, name: string, desc: string, tag?: string }[]} customTypes */
export function getTypeInfo(typeId, customTypes) {
  if (isBuiltinType(typeId)) return TYPE_INFO[typeId];
  const idx = customTypes.findIndex((c) => c.id === typeId);
  const c = idx >= 0 ? customTypes[idx] : null;
  if (!c) {
    return {
      label: typeId,
      name: typeId,
      desc: '',
      tag: '맞춤',
      tagClass: 't5',
    };
  }
  return {
    label: c.name,
    name: c.name,
    desc: c.desc || '',
    tag: c.tag?.trim() || '맞춤',
    tagClass: tagClassForCustom(idx),
  };
}

export function allTypeIds(customTypes) {
  return [...QUESTION_TYPES, ...customTypes.map((c) => c.id)];
}
