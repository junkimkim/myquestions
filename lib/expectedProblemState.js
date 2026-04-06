/** 한 슬롯(1~30번)의 지문·유형별 추가 입력 — 메인 페이지 상태와 동일 필드명 */
export function createEmptyProblemState() {
  return {
    passage: '',
    /** 이 문항만 Paraphrase 2단계 생성 적용 */
    paraphraseEnabled: false,
    typeId: null,
    vocabWords: ['', '', '', '', ''],
    awkwardVocaWords: ['', '', '', '', ''],
    grammarPassageExprs: ['', '', '', '', ''],
    grammarAnswerForms: ['', '', '', '', ''],
    writingAnswer: '',
    underlinedSentence: '',
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
