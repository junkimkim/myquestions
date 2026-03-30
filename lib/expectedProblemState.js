/** 한 슬롯(1~30번)의 지문·유형별 추가 입력 — 메인 페이지 상태와 동일 필드명 */
export function createEmptyProblemState() {
  return {
    passage: '',
    typeId: null,
    vocabWords: ['', '', '', '', ''],
    awkwardVocaWords: ['', '', '', '', ''],
    grammarPassageExprs: ['', '', '', '', ''],
    grammarAnswerForms: ['', '', '', '', ''],
    writingAnswer: '',
    underlinedStentence: '',
    grammarWrongCount: 2,
    grammarWrongLetters: ['B', 'C', 'D', 'E'],
    grammarWrongCorrections: ['', '', '', ''],
    descriptiveAnswerText: '',
    descriptiveAnswerCount: 1,
    descriptiveAnswerEntries: [''],
    specialDescriptiveAnswerCount: 1,
    specialDescriptiveAnswerEntries: [''],
  };
}
