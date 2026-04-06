'use client';

/**
 * 유형별 추가 입력 UI — 메인(`/`)·예상문제(`/expected_questions`)가 동일 컴포넌트를 사용합니다.
 * 문구·레이아웃 변경은 이 파일만 수정하면 됩니다.
 */

import {
  clampGrammarWrongSpotCount,
  grammarNeedsAnswerFormsFive,
  grammarNeedsPassageExprsFive,
  isAwkwardWordMcqType,
  isGrammarExprsOnlyType,
  isGrammarWrongFinderType,
  isResetOnEnterAnswerCountType,
  isSentenceGrammarMcqType,
  promptHasAnswerCount,
  promptRequiresUnderlined,
  promptRequiresVoca,
  getGrammarPassageExprsFiveHint,
  getGrammarPassageExprsFiveSectionLabel,
} from '@/lib/typeExtraInput';
import { getTypeKind } from '@/lib/defaultPrompts';

export default function ProblemSupplementFields({ problemIndex, typeId, customTypes, prompts, problem, onPatch }) {
  const c = customTypes.find((x) => x.id === typeId);
  if (!c) return null;
  const kind = getTypeKind(c);
  const showVocab = kind === 'vocabulary';
  const showWriting = kind === 'writing';
  const showUnderlined = promptRequiresUnderlined(typeId, customTypes, prompts);
  const grammarWrongFinder = isGrammarWrongFinderType(typeId, customTypes, prompts);
  const grammarExprsOnly = isGrammarExprsOnlyType(typeId, customTypes);
  const isSentenceGrammarMcq = isSentenceGrammarMcqType(typeId);
  const showGrammarWrongSymbolMode =
    grammarWrongFinder && !promptHasAnswerCount(prompts, typeId) && !grammarExprsOnly;
  const showGrammarPassageExprsFive = grammarNeedsPassageExprsFive(typeId, customTypes, prompts);
  const showGrammarAnswerFormsFive = grammarNeedsAnswerFormsFive(typeId, customTypes);
  const showDescriptiveCount =
    promptHasAnswerCount(prompts, typeId) &&
    (Boolean(c.is_descriptive) || grammarWrongFinder) &&
    !grammarExprsOnly;
  const showDescriptiveSingle =
    Boolean(c.is_descriptive) && !grammarWrongFinder && !promptHasAnswerCount(prompts, typeId);
  const activeAnswerCount = isResetOnEnterAnswerCountType(typeId)
    ? problem.specialDescriptiveAnswerCount
    : problem.descriptiveAnswerCount;
  const activeAnswerEntries = isResetOnEnterAnswerCountType(typeId)
    ? problem.specialDescriptiveAnswerEntries
    : problem.descriptiveAnswerEntries;
  const showAwkwardPassageVoca =
    kind === 'mcq' && (isAwkwardWordMcqType(c) || promptRequiresVoca(typeId, customTypes, prompts));

  const px = `eq${problemIndex}`;

  const setVocabAt = (i, v) => {
    onPatch({ vocabWords: problem.vocabWords.map((x, j) => (j === i ? v : x)) });
  };
  const setAwkwardVocaAt = (i, v) => {
    onPatch({ awkwardVocaWords: problem.awkwardVocaWords.map((x, j) => (j === i ? v : x)) });
  };
  const setGrammarPassageExprAt = (i, v) => {
    onPatch({ grammarPassageExprs: problem.grammarPassageExprs.map((x, j) => (j === i ? v : x)) });
  };
  const setGrammarAnswerFormAt = (i, v) => {
    onPatch({ grammarAnswerForms: problem.grammarAnswerForms.map((x, j) => (j === i ? v : x)) });
  };

  const setActiveAnswerCount = (fn) => {
    if (isResetOnEnterAnswerCountType(typeId)) {
      onPatch({ specialDescriptiveAnswerCount: fn(problem.specialDescriptiveAnswerCount) });
    } else {
      onPatch({ descriptiveAnswerCount: fn(problem.descriptiveAnswerCount) });
    }
  };

  return (
    <div className="inlineTypeConfig typeSupplementCard">
      {showVocab && (
        <>
          <div className="sectionLabel" style={{ marginTop: 4 }}>
            보기 어휘 5개
          </div>
          <p className="vocabSectionHint">
            지문에서 선택지로 만들고 싶은 어휘 5개를 입력합니다. 무작위로 보기 하나의 영영풀이를 어색하게 만들고 변형문제를 생성합니다.
          </p>
          <div className={isSentenceGrammarMcq ? 'vocabWordsRow vocabWordsRowStack' : 'vocabWordsRow'}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="vocabWordCell">
                <label className="vocabWordLabel" htmlFor={`${px}-vocab-${i}`}>
                  {i + 1}
                </label>
                <input
                  id={`${px}-vocab-${i}`}
                  type="text"
                  className="vocabWordInput"
                  value={problem.vocabWords[i]}
                  onChange={(e) => setVocabAt(i, e.target.value)}
                  placeholder={`단어 ${i + 1}`}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        </>
      )}

      {showAwkwardPassageVoca && (
        <>
          <div className="sectionLabel" style={{ marginTop: showVocab ? 20 : 4 }}>
            어휘 보기 5개
          </div>
          <p className="vocabSectionHint">
            지문에 보기로 만들고 싶은 단어를 5개 입력하세요. 무작위로 단어 하나를 어색하게 만들고 변형문제를 생성합니다.
          </p>
          <div className="vocabWordsRow">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="vocabWordCell">
                <label className="vocabWordLabel" htmlFor={`${px}-awkward-${i}`}>
                  {i + 1}
                </label>
                <input
                  id={`${px}-awkward-${i}`}
                  type="text"
                  className="vocabWordInput"
                  value={problem.awkwardVocaWords[i]}
                  onChange={(e) => setAwkwardVocaAt(i, e.target.value)}
                  placeholder={`지문 어휘 ${i + 1}`}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        </>
      )}

      {showWriting && (
        <>
          <div className="sectionLabel" style={{ marginTop: showVocab || showAwkwardPassageVoca ? 20 : 4 }}>
            영작 정답 문장
          </div>
          <div className="passageWrap">
            <textarea
              value={problem.writingAnswer}
              onChange={(e) => onPatch({ writingAnswer: e.target.value })}
              placeholder="영작 문제의 기준이 되는 완성 영문을 입력하세요. (예: It seems like we might make our funding goal!)"
            />
            <span className="charCount">{problem.writingAnswer.length.toLocaleString()}자</span>
          </div>
        </>
      )}

      {showUnderlined && (
        <>
          <div className="sectionLabel" style={{ marginTop: 20 }}>
            지문에서 숨은 의미를 묻고 싶은 문장이나 표현을 그대로 복사해서 아래에 붙여넣으세요.
          </div>
          <input
            type="text"
            className="vocabWordInput"
            value={problem.underlinedSentence}
            onChange={(e) => onPatch({ underlinedSentence: e.target.value })}
            placeholder="밑줄 친 표현(원문 그대로)을 입력하세요."
            autoComplete="off"
          />
        </>
      )}

      {showGrammarPassageExprsFive && (
        <>
          <div className="sectionLabel" style={{ marginTop: 20 }}>
            {getGrammarPassageExprsFiveSectionLabel(typeId, customTypes)}
          </div>
          <p className="grammarWrongNHint">{getGrammarPassageExprsFiveHint(typeId, customTypes)}</p>
          <div className={isSentenceGrammarMcq ? 'vocabWordsRow vocabWordsRowStack' : 'vocabWordsRow'}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="vocabWordCell">
                <label className="vocabWordLabel" htmlFor={`${px}-gexpr-${i}`}>
                  {i + 1}
                </label>
                {isSentenceGrammarMcq ? (
                  <textarea
                    id={`${px}-gexpr-${i}`}
                    className="vocabWordInput grammarCompactTextarea"
                    rows={1}
                    style={{ resize: 'vertical' }}
                    value={problem.grammarPassageExprs[i]}
                    onChange={(e) => setGrammarPassageExprAt(i, e.target.value)}
                    placeholder={`보기 문장 ${i + 1}`}
                  />
                ) : (
                  <input
                    id={`${px}-gexpr-${i}`}
                    type="text"
                    className="vocabWordInput"
                    value={problem.grammarPassageExprs[i]}
                    onChange={(e) => setGrammarPassageExprAt(i, e.target.value)}
                    placeholder={grammarExprsOnly ? `보기 ${i + 1}` : `지문 표현 ${i + 1}`}
                    autoComplete="off"
                  />
                )}
              </div>
            ))}
          </div>
          {showGrammarAnswerFormsFive && (
            <>
              {/* <div className="sectionLabel" style={{ marginTop: 14 }}>
                객관식 어법 — 오답 5개
              </div> */}
              <p className="grammarWrongNHint">
              위에서 입력한 다섯 개 문장에서 정답으로 만들고 싶은 문장의 일부를 '틀리게' 수정하여 같은 숫자 칸에 입력하세요. 오답을 입력하지 않는 보기는 맞는 보기로 처리됩니다.
              </p>
              <div className="vocabWordsRow">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="vocabWordCell">
                    <label className="vocabWordLabel" htmlFor={`${px}-gans-${i}`}>
                      {i + 1}
                    </label>
                    {isSentenceGrammarMcq ? (
                      <textarea
                        id={`${px}-gans-${i}`}
                        className="vocabWordInput grammarCompactTextarea"
                        rows={3}
                        style={{ resize: 'vertical' }}
                        value={problem.grammarAnswerForms[i]}
                        onChange={(e) => setGrammarAnswerFormAt(i, e.target.value)}
                        placeholder={`틀리게 고칠 부분 ${i + 1}`}
                      />
                    ) : (
                      <input
                        id={`${px}-gans-${i}`}
                        type="text"
                        className="vocabWordInput"
                        value={problem.grammarAnswerForms[i]}
                        onChange={(e) => setGrammarAnswerFormAt(i, e.target.value)}
                        placeholder={`오답 ${i + 1}`}
                        autoComplete="off"
                      />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {showGrammarWrongSymbolMode && (
        <>
          <div className="sectionLabel" style={{ marginTop: showGrammarPassageExprsFive ? 18 : 20 }}>
            어법상 틀린 곳 (객관식) — 기호·고쳐 쓰기
          </div>
          <p className="grammarWrongNHint">지문에서 어법상 틀린 밑줄 개수를 고릅니다.</p>
          <div className="grammarWrongNChoice" role="group" aria-label="틀린 곳 개수">
            <span className="grammarWrongNChoiceLabel">틀린 곳 개수</span>
            <label className="grammarWrongNRadio">
              <input
                type="radio"
                name={`${px}-grammar-wrong-spot`}
                checked={clampGrammarWrongSpotCount(problem.grammarWrongCount) === 1}
                onChange={() => onPatch({ grammarWrongCount: 1 })}
              />
              1개
            </label>
            <label className="grammarWrongNRadio">
              <input
                type="radio"
                name={`${px}-grammar-wrong-spot`}
                checked={clampGrammarWrongSpotCount(problem.grammarWrongCount) === 2}
                onChange={() => onPatch({ grammarWrongCount: 2 })}
              />
              2개
            </label>
          </div>
          <div className="sectionLabel" style={{ marginTop: 16 }}>
            정답 기호·고쳐 쓰기 ({clampGrammarWrongSpotCount(problem.grammarWrongCount)}개)
          </div>
          <div className="grammarWrongFinderInputs">
            {[0, 1].slice(0, clampGrammarWrongSpotCount(problem.grammarWrongCount)).map((_, i) => (
              <div key={i} className="grammarWrongFinderRow">
                <div className="grammarWrongFinderHead">
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>기호 {i + 1}</span>
                </div>
                <div className="grammarWrongFinderControls">
                  <select
                    value={String(problem.grammarWrongLetters[i] ?? '').trim().toUpperCase()}
                    onChange={(e) => {
                      const v = e.target.value;
                      onPatch({
                        grammarWrongLetters: problem.grammarWrongLetters.map((x, j) => (j === i ? v : x)),
                      });
                    }}
                    className="modelSelect"
                    style={{ width: 130 }}
                  >
                    {['A', 'B', 'C', 'D', 'E'].map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="vocabWordInput"
                    style={{ flex: 1, minHeight: 78, resize: 'vertical' }}
                    value={problem.grammarWrongCorrections[i] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      onPatch({
                        grammarWrongCorrections: problem.grammarWrongCorrections.map((x, j) => (j === i ? v : x)),
                      });
                    }}
                    placeholder="고쳐 쓰기 할 밑줄 친 부분 전체(완전한 문장/구)를 입력하세요."
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {(showDescriptiveCount || showDescriptiveSingle) && (
        <>
          <div className="sectionLabel" style={{ marginTop: 20 }}>
            서술형 정답 입력
          </div>
          {showDescriptiveCount ? (
            <>
              <div className="countAdjustRow">
                <button
                  type="button"
                  className="btnSm btnGhost"
                  onClick={() => setActiveAnswerCount((n) => Math.max(1, n - 1))}
                  disabled={activeAnswerCount <= 1}
                >
                  - 삭제
                </button>
                <span className="countAdjustRowMeta">현재 {activeAnswerCount}개</span>
                <button
                  type="button"
                  className="btnSm btnGhost"
                  onClick={() => setActiveAnswerCount((n) => Math.min(4, n + 1))}
                  disabled={activeAnswerCount >= 4}
                >
                  + 추가
                </button>
              </div>
              <div className="grammarWrongFinderInputs">
                {[0, 1, 2, 3].slice(0, activeAnswerCount).map((_, i) => (
                  <div key={i} className="grammarWrongFinderRow">
                    <div className="grammarWrongFinderHead">
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>정답 항목 {i + 1}</span>
                    </div>
                    <div className="grammarWrongFinderControls">
                      <textarea
                        className="vocabWordInput"
                        style={{ flex: 1, minHeight: 78, resize: 'vertical' }}
                        value={activeAnswerEntries[i] ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          const key = isResetOnEnterAnswerCountType(typeId)
                            ? 'specialDescriptiveAnswerEntries'
                            : 'descriptiveAnswerEntries';
                          const prev = problem[key];
                          const next = [...prev];
                          next[i] = v;
                          onPatch({ [key]: next });
                        }}
                        placeholder="- 정답이 되는 온전한 문장 전체를 입력하세요."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="passageWrap">
              <textarea
                value={problem.descriptiveAnswerText}
                onChange={(e) => onPatch({ descriptiveAnswerText: e.target.value })}
                placeholder="서술형 정답으로 쓸 내용을 입력하세요."
                style={{ minHeight: 120 }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
