# QuizForge 프로젝트 점검 결과

> 점검일: 2026-04-07

---

## 우선순위별 보완 항목

### 즉시 처리

#### 1. `/api/custom-types` 인증 없음
- **파일**: `app/api/custom-types/route.js`, `app/api/custom-types/[id]/route.js`
- **문제**: `POST`, `PUT`, `PATCH`, `DELETE` 핸들러가 `createSupabaseAdmin()`만 사용하고 세션 확인을 하지 않음. 누구나 커스텀 문항 타입을 생성/수정/삭제 가능.
- **조치**: 각 핸들러 상단에 `getUser()` 세션 확인 추가. 관리자만 허용할 경우 별도 role 체크 추가.

#### 2. `/api/generate` 모델 ID 미검증
- **파일**: `app/api/generate/route.js` (lines 130–163)
- **문제**: 클라이언트가 임의의 `model` 값을 전달할 수 있음. `isAllowedGptModelId` 체크가 선호도 저장에는 있지만 실제 생성 호출에는 빠져 있음. 비싼 모델로 요청 가능 (비용 남용).
- **조치**: `resolvedModel` 결정 후 `isAllowedGptModelId(resolvedModel)` 검증 추가.

---

### 출시 전 처리

#### 3. `/api/prompt-chat` 인증 없음 + 속도 제한 없음
- **파일**: `app/api/prompt-chat/route.js`
- **문제**: 사용자 OpenAI 키를 그대로 프록시하는 오픈 릴레이. 인증도 없고 속도 제한도 없어 악용 시 키 요금 문제 발생.
- **조치**: 세션 확인 추가 또는 IP 기반 속도 제한 추가. BYOK(Bring Your Own Key) 정책이라면 최소한 요청 빈도 제한 필요.

#### 4. 인메모리 상태 — 서버리스 환경에서 신뢰 불가
- **파일**: `lib/expectedBatchRegistry.js`, `lib/generateRateLimit.js`
- **문제**: 선불 배치 ID와 요청 속도 제한이 프로세스 메모리에 저장됨. Vercel 등 멀티 인스턴스/서버리스 환경에서 인스턴스 간 상태가 공유되지 않아 "invalid batch" 오류나 속도 제한 우회 발생 가능.
- **조치**: Redis (Upstash 등) 또는 Supabase DB로 상태 이전.

#### 5. OpenAI 응답 에러 처리 미흡
- **파일**: `lib/callGenerateClient.js` (line 29), `app/api/generate/route.js` (line 174)
- **문제**: `await res.json()` 호출에 try/catch 없음. OpenAI가 JSON이 아닌 에러를 반환하면 unhandled throw 발생. 또한 에러 시 OpenAI 내부 오류 메시지가 클라이언트에 그대로 노출될 수 있음.
- **조치**: `res.json()` 호출을 try/catch로 감싸고, 에러 응답 시 내부 메시지를 제거하거나 별도 안전한 메시지로 대체.

#### 6. OpenAI API 키 포맷 검증 로직
- **파일**: `app/api/generate/route.js` (lines 76–81)
- **문제**: `startsWith('sk-')` 체크만 사용. 최신 OpenAI 키 포맷(`sk-proj-...`, `sk-svcacct-...` 등)은 동일하게 통과하지만, 향후 포맷 변경 시 운영 리스크.
- **조치**: `startsWith('sk-')` 조건 유지하되 주석으로 이유 문서화. 또는 길이/패턴 기반으로 보완.

#### 7. `mypage` 아바타 URL 미검증
- **파일**: `app/mypage/page.js` (lines 108–112)
- **문제**: `<img src={profile.avatar_url} />` — DB에 신뢰하지 않는 URL이 저장된 경우 XSS 벡터 가능.
- **조치**: `avatar_url`이 신뢰된 도메인(`lh3.googleusercontent.com`, `k.kakaocdn.net` 등)인지 검증하거나 `next/image`의 `domains` 설정으로 제한.

---

### 코드 개선

#### 8. 오타 "Paraphraze" → "Paraphrase" (3곳)
- **파일**:
  - `app/page.js` (line ~1014)
  - `app/one_type/page.js` (line ~322)
  - `app/expected_questions/page.js` (lines ~515, ~565)
- **문제**: UI에 노출되는 텍스트 오타.
- **조치**: `Paraphraze` → `Paraphrase` 로 일괄 수정.

#### 9. 내부 필드명 오타 `underlinedStentence`
- **파일**: `app/page.js` (lines 117, 159, 193, 449, 821), `lib/paraphrasePrompt.js` (lines 79–85)
- **문제**: 프롬프트 placeholder `{underlined_stentence}`와 연동된 의도적 오타로 보이지만, 코드 어디에도 명시가 없어 "오타 수정"으로 한쪽만 바꾸면 기능이 깨짐.
- **조치**: 전체 일괄 수정(`underlinedStentence` → `underlinedSentence`, `{underlined_stentence}` → `{underlined_sentence}`)하거나, 코드 주석으로 의도적 오타임을 명시.

#### 10. `globals.css` `.modalOverlay` 중복 정의
- **파일**: `app/globals.css` (lines ~519, ~2116)
- **문제**: 동일 선택자가 두 번 정의되어 있어 뒤쪽이 앞쪽을 덮어씌움. 예상치 못한 스타일 동작 발생 가능.
- **조치**: 두 블록을 병합하여 하나로 통합.

#### 11. `vocabPrompt.js` 배열 검증 누락
- **파일**: `lib/vocabPrompt.js` (lines 2–4)
- **문제**: `formatVocabList`에서 `Array.isArray()` 체크 없이 `.map` 호출. 배열이 아닌 값이 들어오면 throw 발생.
- **조치**: `Array.isArray(wordsFive) ? wordsFive.map(...) : []` 형태로 방어 처리 추가.

#### 12. Toss `amount` NaN 가능성
- **파일**: `lib/tossPayments.js` (lines 35–38)
- **문제**: `Math.floor(Number(amount))`에서 잘못된 값이 들어오면 `NaN`이 Toss API로 전송됨.
- **조치**: 호출부에서 사전 검증하거나 `isNaN(amount)` 가드 추가.

---

### 추후 개선

#### 13. 홈 페이지 페이지별 메타데이터 없음
- **파일**: `app/page.js`
- **문제**: `'use client'` 컴포넌트라 `export const metadata` 사용 불가. OG 태그, `<title>` 등이 루트 `layout.js` 기본값만 사용됨.
- **조치**: `app/page.js`를 서버 컴포넌트로 분리(서버 컴포넌트 래퍼 + 클라이언트 컴포넌트 분리)하거나, 별도 `app/head.js` 활용.

#### 14. 접근성 미완
- **파일**: `components/InsufficientCreditsModal.jsx` 외 모달 컴포넌트들
- **문제**: `aria-labelledby`, 포커스 트랩이 없는 모달 존재. 키보드 접근성 미흡.
- **조치**: 각 모달에 `aria-labelledby` 연결, `useEffect`로 포커스 트랩 또는 `@radix-ui/react-dialog` 등 접근성 지원 라이브러리 도입 검토.

#### 15. `/types`, `/prompt` 페이지 네비게이션 누락
- **파일**: `components/QuizForgeNav.jsx`
- **문제**: URL을 직접 알아야만 접근 가능. 관리자용이라면 의도적일 수 있으나 문서화 필요.
- **조치**: 관리자/개발자용임을 코드 주석으로 명시하거나, 조건부 노출(관리자 role) 네비게이션 링크 추가.

#### 16. `lib/envLocalFile.js` 에러 조용히 삼킴
- **파일**: `lib/envLocalFile.js` (lines 44–63)
- **문제**: `.env.local` 파싱 실패 시 `null` 반환으로 조용히 넘어감. 권한 오류나 파일 손상 시 원인 파악 어려움.
- **조치**: `console.warn` 또는 별도 에러 로깅 추가.

---

## 요약 체크리스트

| # | 항목 | 우선순위 | 완료 |
|---|------|----------|------|
| 1 | `/api/custom-types` 인증 추가 | 즉시 | [x] |
| 2 | `/api/generate` 모델 ID 검증 | 즉시 | [x] |
| 3 | `/api/prompt-chat` 인증/속도제한 | 출시 전 | [x] 페이지·API 삭제 |
| 4 | 인메모리 상태 → Redis/DB 이전 | 출시 전 | [x] |
| 5 | OpenAI JSON 파싱 에러 처리 | 출시 전 | [x] |
| 6 | OpenAI 키 포맷 검증 주석 | 출시 전 | [x] |
| 7 | 아바타 URL 도메인 검증 | 출시 전 | [x] |
| 8 | "Paraphraze" 오타 수정 (3곳) | 개선 | [x] |
| 9 | `underlinedStentence` 오타 처리 | 개선 | [x] |
| 10 | `globals.css` `.modalOverlay` 중복 제거 | 개선 | [x] |
| 11 | `vocabPrompt.js` 배열 검증 추가 | 개선 | [x] |
| 12 | Toss `amount` NaN 가드 추가 | 개선 | [x] |
| 13 | 홈 페이지 메타데이터 분리 | 추후 | [x] |
| 14 | 모달 접근성 개선 | 추후 | [x] |
| 15 | 숨겨진 페이지 네비게이션/문서화 | 추후 | [x] |
| 16 | `envLocalFile.js` 에러 로깅 추가 | 추후 | [x] |
