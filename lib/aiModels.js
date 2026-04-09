/**
 * AI 모델 통합 목록 (OpenAI + Anthropic Claude).
 * 드롭다운·서버 검증·provider 분기에 사용합니다.
 */

// ── OpenAI ───────────────────────────────────────────────────────────────────

export const OPENAI_MODEL_IDS = [
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

// ── Anthropic Claude ─────────────────────────────────────────────────────────
// 최신 모델 ID 기준: https://docs.anthropic.com/en/docs/about-claude/models
// claude-3.5 계열(20241022)은 2026-02-19 retired, claude-3-opus는 2026-04-19 retiring.

export const CLAUDE_MODEL_IDS = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-opus-4-5-20251101',
  'claude-sonnet-4-5-20250929',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
];

// ── 통합 ─────────────────────────────────────────────────────────────────────

/** 앱·서버 기본 모델 */
export const DEFAULT_MODEL = 'gpt-5.4-mini';

/** 드롭다운·서버 검증용 전체 목록 */
export const ALL_MODEL_IDS = [...OPENAI_MODEL_IDS, ...CLAUDE_MODEL_IDS];

const ALL_MODEL_SET = new Set(ALL_MODEL_IDS);

export function isAllowedModelId(id) {
  return typeof id === 'string' && ALL_MODEL_SET.has(id.trim());
}

/** Claude 모델 여부 */
export function isClaudeModel(id) {
  return typeof id === 'string' && id.trim().toLowerCase().startsWith('claude-');
}

/** GPT-5 계열 — temperature 미전달 등 */
export function isGpt5FamilyModel(model) {
  if (!model || typeof model !== 'string') return false;
  return model.trim().toLowerCase().startsWith('gpt-5');
}

// ── 하위 호환 re-export (기존 openaiModels.js 이름 그대로) ──────────────────

/** @deprecated isAllowedModelId 를 사용하세요 */
export const ALLOWED_GPT_MODEL_IDS = ALL_MODEL_IDS;

/** @deprecated isAllowedModelId 를 사용하세요 */
export const isAllowedGptModelId = isAllowedModelId;

/** @deprecated DEFAULT_MODEL 을 사용하세요 */
export const DEFAULT_GPT_MODEL = DEFAULT_MODEL;
