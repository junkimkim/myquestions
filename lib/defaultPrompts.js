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

export const TYPE_KIND_MCQ = 'mcq';
export const TYPE_KIND_WRITING = 'writing';
export const TYPE_KIND_VOCABULARY = 'vocabulary';

/** @param {{ kind?: string } | null | undefined} c */
export function getTypeKind(c) {
  if (!c) return TYPE_KIND_MCQ;
  if (c.kind === TYPE_KIND_WRITING) return TYPE_KIND_WRITING;
  if (c.kind === TYPE_KIND_VOCABULARY) return TYPE_KIND_VOCABULARY;
  return TYPE_KIND_MCQ;
}

/** @param {string} kind mcq | writing | vocabulary */
export function defaultCustomPromptForKind(kind) {
  if (kind === TYPE_KIND_WRITING) return DEFAULT_WRITING_PROMPT;
  if (kind === TYPE_KIND_VOCABULARY) return DEFAULT_VOCAB_PROMPT;
  return DEFAULT_CUSTOM_PROMPT;
}

export const DEFAULT_CUSTOM_PROMPT = `다음 영어 지문을 읽고, 아래 요구에 맞는 변형문제를 생성해 주세요.

[지문]
{passage}

[요구사항]
1. 수능 영어 수준에 맞는 난이도로 작성하세요.
2. 문제, 보기, 정답, 한국어 해설을 명확히 구분해 제시하세요.`;

/** 영작 유형 기본 프롬프트 — 메인 화면 정답 입력값이 {answer}로 치환됩니다. */
export const DEFAULT_WRITING_PROMPT = `다음 [지문]과 [정답 문장]을 사용하여 수능형 영작 문제 1문항을 만들어 주세요.

[지문]
{passage}

[정답 문장](밑줄 (A) 한국어 해석이 가리키는 완성 영문 — 반드시 이 문장과 동일한 영어로 [정답]을 제시할 것)
{answer}

[출력 문제 형식 예시]
밑줄 친 (A)의 우리말과 같은 뜻이 되도록, 아래 <보기>의 단어를 그대로 배열하여 영작하시오.

(지문 앞부분 인용) ... (A) (해당 구의 자연스러운 한국어 해석)!

<보기>
단어1 / 단어2 / 단어3 / ... (정답 문장을 구성하는 단어만, 슬래시로 구분, 순서는 임의)

[정답]
{answer}

[요구사항]
1. 지문에서 (A)에 해당하는 위치와 맥락을 정하고, (A) 자리의 한국어 해석을 제시하세요.
2. <보기>에는 오직 [정답 문장]을 만들 수 있는 단어만 나열하고, 불필요한 단어를 넣지 마세요.
3. 최종 [정답]은 [정답 문장]과 같은 영어 문장(철자·어순 포함)이어야 합니다.
4. 한국어로 짧은 해설을 덧붙이세요.`;

/** 어휘 유형 기본 프롬프트 — 메인에서 입력한 5단어가 {vocab}으로, 지문이 {passage}로 치환됩니다(지문 없이 생성 시 {passage}는 빈 문자열). */
export const DEFAULT_VOCAB_PROMPT = `다음 자료를 바탕으로 어휘 문제를 출제하세요.

[지문]
{passage}

[출제 대상 어휘 5개]
{vocab}

[지침]
1. [지문]이 비어 있지 않으면: 지문 맥락에 기반해 위 5개 표현 각각 1문항씩(총 5문항) 수능형 5지선다로 출제하세요. 지문 속 표기·어형을 따르세요.
2. [지문]이 비어 있으면: [출제 대상 어휘 5개]만으로 각 단어마다 1문항씩(총 5문항) 출제하세요. 각 문항은 5지선다이며, ①~⑤ 보기는 모두 "단어:영영풀이" 형식의 한 줄 문자열이어야 합니다. 정답 보기는 해당 문항의 단어와 올바른 영영풀이를 이 형식으로 쓰고, 오답은 같은 형식으로 서로 구별되게 만드세요.
3. 각 문항마다 정답 번호(①~⑤)와 한국어 해설을 제시하세요.
4. 출력: [1번]~[5번] 순서로 형식을 명확히 구분하세요.`;

export function isBuiltinType(typeId) {
  return QUESTION_TYPES.includes(typeId);
}

export function tagClassForCustom(index) {
  return CUSTOM_TAG_CLASSES[index % CUSTOM_TAG_CLASSES.length];
}

/** @param {{ id: string, name: string, desc: string, kind?: string }[]} customTypes */
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
      kind: TYPE_KIND_MCQ,
    };
  }
  return {
    label: c.name,
    name: c.name,
    desc: c.desc || '',
    tag: '맞춤',
    tagClass: tagClassForCustom(idx),
    kind: getTypeKind(c),
  };
}

export function allTypeIds(customTypes) {
  return [...QUESTION_TYPES, ...customTypes.map((c) => c.id)];
}
