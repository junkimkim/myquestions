const CUSTOM_KEY = 'quizforge_custom_types_v1';
const PROMPTS_KEY = 'quizforge_prompts_v1';

export function loadCustomTypes() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const a = JSON.parse(raw);
    if (!Array.isArray(a)) return [];
    return a.filter((x) => x && typeof x.id === 'string' && typeof x.name === 'string');
  } catch {
    return [];
  }
}

export function saveCustomTypes(types) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(types));
}

export function loadPromptsPartial() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROMPTS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return typeof p === 'object' && p !== null ? p : null;
  } catch {
    return null;
  }
}

export function savePromptsPartial(prompts) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
}
