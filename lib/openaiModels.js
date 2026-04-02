/**
 * OpenAI Chat Completions용 모델 id.
 * GPT-5 세대(gpt-5*)는 temperature 전달 방식이 4세대와 다를 수 있습니다.
 */

/** 앱·서버 기본 모델 (프로필 미설정 시) */
export const DEFAULT_GPT_MODEL = 'gpt-5.4-mini';

/** 드롭다운·서버 검증에 사용 */
export const ALLOWED_GPT_MODEL_IDS = [
  'gpt-5.4-mini',
  'gpt-5.1',
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-5-chat-latest',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
];

const ALLOWED_SET = new Set(ALLOWED_GPT_MODEL_IDS);

export function isAllowedGptModelId(id) {
  return typeof id === 'string' && ALLOWED_SET.has(id.trim());
}

/** GPT-5 계열 — temperature 미전달 등 */
export function isGpt5FamilyModel(model) {
  if (!model || typeof model !== 'string') return false;
  return model.trim().toLowerCase().startsWith('gpt-5');
}
