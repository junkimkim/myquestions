/** 메인 화면 5칸 → 프롬프트 {vocab} 치환용 */
export function formatVocabList(wordsFive) {
  if (!Array.isArray(wordsFive)) return '';
  return wordsFive.map((w, i) => `${i + 1}. ${w}`).join('\n');
}
