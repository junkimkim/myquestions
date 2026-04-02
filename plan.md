# QuizForge 변형문제 서비스 수익화 설계 (초안)

이 문서는 현재 앱(지문 → AI 변형문제 생성)을 **로그인·크레딧·결제·이력 보관** 중심으로 확장하기 위한 설계 초안이다. 구현 시 법무·세무·PG 계약은 반드시 별도 검토한다.

---

## 1. 목표와 범위

| 목표 | 설명 |
|------|------|
| 수익 | 선불 충전 후 **생성 1회당 크레딧 차감** |
| 신뢰 | Supabase Auth로 **구글·카카오** 로그인 |
| 재방문 | **마이페이지**에서 생성 이력 조회 (보관 **2주**) |
| 결제 | 1차 **토스페이먼츠**, 그 외 PG(카카오페이 등)는 후순위로 확장 |

---

## 2. 사용자 흐름 (요약)

1. 비로그인: 랜딩·요금 안내·일부 제한 미리보기(선택).
2. 로그인: Supabase OAuth(구글 / 카카오).
3. 충전: **토스페이먼츠** 등 PG로 **원화 결제 → 크레딧 적립**.
4. 생성: 변형문제 생성 API 호출 성공 시 **크레딧 차감** (실패 시 차감 없음 권장).
5. 마이페이지: 최근 2주간 생성 결과 목록·상세(지문 일부·생성 텍스트·유형·일시).

---

## 3. 인증 (Supabase Auth + OAuth)

### 3.1 공급자

- **Google OAuth**: Supabase 대시보드에서 Client ID/Secret 연동.
- **Kakao OAuth**: Kakao Developers 앱 생성 → Redirect URI를 Supabase 콜백 URL과 일치시킴.

### 3.2 클라이언트

- Next.js(App Router)에서 `@supabase/ssr` 또는 `@supabase/auth-helpers-nextjs` 패턴으로 **세션 쿠키** 유지.
- 보호 라우트: `/mypage`, `/checkout`, 생성 API 등은 **로그인 필수** (미들웨어 또는 서버 컴포넌트에서 세션 검증).

### 3.3 DB 연동

- `auth.users`와 1:1인 **`public.profiles`** (또는 `user_credits`) 테이블: `user_id`, `display_name`, `avatar_url`, `created_at` 등.

---

## 4. 크레딧·결제 도메인 설계

### 4.1 개념

- **크레딧**: 앱 내부 화폐(정수 단위 권장, 예: 1크레딧 = 1원 가치가 아니라 **“포인트”**).
- **충전**: 외부 PG 결제 완료 → **ledger에 `charge` 기록** + `balance` 증가.
- **차감**: 변형문제 **생성 성공 시** `spend` 기록 + `balance` 감소.

### 4.2 권장 테이블 (예시)

| 테이블 | 용도 |
|--------|------|
| `user_wallets` | `user_id`, `balance` (크레딧 잔액), `updated_at` |
| `credit_ledger` | `id`, `user_id`, `type` (`charge` \| `spend` \| `refund` \| `adjust`), `amount` (양수/부호 규약 통일), `balance_after`, `reference` (결제건 ID·생성 job ID), `created_at` |
| `payments` | PG 주문번호, `provider` (`tosspayments`…), `amount_krw`, `status`, `user_id`, `metadata` |
| `generation_jobs` | `user_id`, `created_at`, `cost_credits`, `model`, `status`, `input_summary`(해시/길이), 결과 저장소 FK |

**동시성**: 차감은 **트랜잭션 + 행 잠금(`SELECT … FOR UPDATE`)** 또는 Supabase RPC로 원자적 처리.

### 4.3 생성 시 차감 정책

- **권장**: OpenAI API **응답 200 + 본문 존재** 확인 후에만 차감 (사용자 신뢰·분쟁 감소).
- **선택**: 요청 전 선차감 후 실패 시 환불 — 구현 복잡도↑.
- **비로그인 생성 금지** 또는 **데모 1회만**으로 제한해 악용 방지.

---

## 5. 마이페이지·저장 2주

### 5.1 저장 내용

- 최소: `생성일시`, `문제 유형명`, `모델`, **생성 결과 텍스트**(또는 요약), (가능하면) 지문 **해시/앞부분 미리보기만** — **전체 지문 장기 저장은 개인정보·저작권 이슈** 검토.
- `generation_jobs` + `generation_outputs` (텍스트는 크기 제한 또는 압축).

### 5.2 보관 기간 2주

- **일괄 삭제**: Supabase **pg_cron** 또는 외부 스케줄러(Vercel Cron)로 `created_at < now() - 14 days` 행 삭제.
- 사용자에게 UI/약관에 **“2주 후 자동 삭제”** 명시.

### 5.3 UI

- 목록: 카드/테이블, 필터(날짜·유형).
- 상세: 당시 생성 결과 읽기 전용, (선택) 동일 설정 재생성은 **재차 크레딧**.

---

## 6. 결제: 토스페이먼츠 및 대안

### 6.1 1차: 토스페이먼츠

- **토스페이먼츠** 가맹·정산 계약 후 **시크릿 키·클라이언트 키** 등으로 연동.
- 흐름: 결제 요청(결제위젯 또는 API) → 사용자 승인 → 서버에서 **결제 승인·서명 검증** → `payments` 성공 처리 → 크레딧 충전.
- 공식 문서·샌드박스·운영 전환 절차가 정리되어 있어 1차 PG로 채택.

### 6.2 추가 제안 (국내 서비스 기준)

| 방식 | 장점 | 비고 |
|------|------|------|
| **카카오페이** | 국내 사용자에게 친숙 | 별도 가맹·연동 |
| **네이버페이 / 페이코** | 특정 사용자층 | 연동 별도 |
| **일반 카드 (나이스·KG·이니시스 등)** | 전 연령 | PC/모바일 대응·PCI 범위 |
| **Stripe** | 해외 카드·구독 | 국내 원화·세금계산서는 별도 검토 |

**추천 순서 (일반적)**: **토스페이먼츠**(1차) → 필요 시 **카카오페이**·**이니시스/나이스** 등 추가 → 네이버/기타.

### 6.3 법·운영 체크리스트 (요약)

- **전자상거래법**: 환불·청약철회·고객센터 안내.
- **부가세**: 과세 사업자 여부에 따라 세금계산서/현금영수증 정책.
- **PG**: 에스크로·본인인증 요구사항은 상품 성격(디지털 콘텐츠)에 맞게 확인.

---

## 7. OpenAI 비용 대비 “차감 단가” 산정

### 7.1 비용 구조 (앱 기준)

- 현재 `/api/generate`는 **chat completions** 1회 호출.
- 토큰은 대략 다음에 비례한다.
  - **입력**: 시스템 프롬프트 + 사용자 프롬프트(지문 + 유형별 지시) → 지문이 길수록 **프롬프트 토큰↑**
  - **출력**: `max_tokens` 상한(예: 1200~2800, Paraphrase 시 상한 큼)

### 7.2 단가 예시 (참고용 — 실제는 OpenAI 요금표·모델별 갱신 필요)

모델마다 $/1M input·output이 다르다. 예시로 **입력 4k + 출력 2k 토큰** 가정 시:

- 저가 모델(gpt-4o-mini 등): **대략 수십 원~백 원 미만/건** (환율·모델에 따라 변동).
- 고가 모델(gpt-4o, gpt-5 계열): **건당 수백 원**도 가능.

**권장**: 대시보드에서 **모델별 실측** (한 달간 평균 입·출력 토큰) 후 마진을 얹는다.

### 7.3 크레딧 차감 설계 제안

| 방식 | 설명 |
|------|------|
| **고정 차감** | 생성 1회 = N 크레딧 (구현 단순, 단 짧은 지문도 동일 차감) |
| **구간 차감** | 지문 길이(또는 추정 입력 토큰) 구간별 N, M, L 크레딧 |
| **모델 배율** | `gpt-5-mini` = 1배, `gpt-4o` = 2배 등 |

**마진**: OpenAI 원가 + PG 수수료(약 3%) + VAT + **서버·Supabase·지원 비용** + **이윤**을 합산해 **최소 충전 단위**(예: 5,000원 = X크레딧)를 정한다.

### 7.4 숫자 예시 (가이드라인만)

- 내부 원가를 **건당 평균 80원**으로 잡았다면 → 판매가 **200~300원/건** 수준은 **마진·운영 여유**를 두기 쉬운 구간(실제 원가 측정 후 조정).
- **예상문제 세트**처럼 N번 연속 생성이면 **건당 합산 차감** 또는 **세트 할인** 정책을 명시.

※ 실제 **원/크레딧** 비율은 반드시 **실측 토큰 × 현재 요금**으로 재계산할 것.

---

## 8. 웹사이트(제품) 개선 항목

### 8.1 필수

- 로그인/로그아웃 UI, 프로필 표시.
- **잔액 표시** (헤더), 충전 페이지, 결제 결과 페이지.
- 생성 전 **잔액 부족** 시 충전 유도.
- 마이페이지(2주 이력).
- **이용약관·개인정보처리방침·환불정책** 페이지.

### 8.2 권장

- 관리자(최소): 사용자 검색, 크레딧 수동 조정, 결제 실패 로그.
- 생성 이력 **내보내기**(txt/docx) — 기존 Word 다운로드와 연동.
- 요금제 페이지: 크레딧 환산표, 모델별 안내.
- 알림: 이메일/카카오(선택) — 잔액 부족, 2주 삭제 D-1 등.

### 8.3 기술

- **API 라우트 보호**: `api/generate` 등에서 **서버 측** 세션 검증 + 차감.
- **클라이언트 API 키 제거**: OpenAI 키는 **서버 전용**으로 이전 (이미 서버 프록시라면 유지).
- **Rate limit**: IP·user_id 기준 (악용 방지).
- **감사 로그**: `credit_ledger`로 분쟁 대응.

---

## 9. 구현 단계 제안 (로드맵 요약)

아래 **§11 상세 구현 단계**를 따른다. 순서는 의존성 기준이며, 병렬 가능한 항목은 팀 상황에 맞게 조정한다.

| 단계 | 한 줄 요약 |
|------|------------|
| 0 | 준비: Supabase·Next 환경, 시크릿·배포 파이프라인 |
| 1 | DB: `profiles`, 지갑·원장·생성이력 테이블, RLS |
| 2 | 인증: 구글·카카오 OAuth, 미들웨어, 세션 연동 |
| 3 | 크레딧: RPC(충전·차감), 잔액 조회 API |
| 4 | 생성 파이프라인: `/api/generate` 보호, 성공 시 차감·이력 저장 |
| 5 | UI: 헤더 잔액, 마이페이지, 충전(플레이스홀더) |
| 6 | 결제: 토스페이먼츠(테스트→운영), 승인·웹훅 검증 |
| 7 | 운영: 2주 삭제 Cron, 약관·단가·모니터링 |

---

## 10. 추가로 결정하면 좋은 사항

- **최소 충전 금액**, **크레딧 유효기간**(없음 / 1년 등).
- **환불**: 미사용 크레딧만 부분 환불 가능 여부.
- **B2B**: 학교/학원 단체 계정·세금계산서.
- **다국어**: 영문 약관 여부.

---

## 11. 상세 구현 단계 (체크리스트)

각 단계마다 **완료 기준**을 만족한 뒤 다음 단계로 넘어가는 것을 권장한다.

### Phase 0 — 준비·기반

| # | 작업 | 완료 기준 |
|---|------|-----------|
| 0.1 | Supabase 프로덕션 프로젝트(또는 스테이징) 확정, URL·anon/service role 키 분리 | `.env`에 키 없이 배포되지 않음 |
| 0.2 | Next.js에 `@supabase/ssr` 등 공식 패턴 문서 확인 | 로컬에서 Supabase 클라이언트 생성 가능 |
| 0.3 | OpenAI 호출이 **서버**에만 있는지 점검(클라이언트에 `sk-` 없음) | 빌드·런타임에서 키 노출 없음 |
| 0.4 | (선택) Vercel/호스트, 도메인, HTTPS | 프로덕션 URL 확정 |

**Phase 0 구현 메모 (코드베이스)**

| 항목 | 내용 |
|------|------|
| 0.1 | 루트 `.env.example`에 `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, (선택) `OPENAI_API_KEY` 안내. `.gitignore`에 `.env` 추가, `!.env.example` 예외. |
| 0.2 | `@supabase/ssr` 설치. `lib/supabase/client.js`(브라우저), `lib/supabase/server.js`(서버·쿠키), `lib/supabase/env.js`(`isSupabaseConfigured`). 루트 `middleware.js`에서 세션 쿠키 갱신(환경 변수 없으면 통과). |
| 0.3 | **Phase 4 이후**: `/api/generate`는 서버 `OPENAI_API_KEY`만 사용·로그인·크레딧 차감. `GET /api/health`로 서버 키 보유 여부 표시. `/prompt`·`/api/prompt-chat`는 아직 클라이언트 키 패턴일 수 있음(별도 정리 가능). |
| 0.4 | 배포 시 호스트 대시보드에 환경 변수 주입(문서만). |

---

### Phase 1 — 데이터베이스 스키마·RLS

| # | 작업 | 완료 기준 |
|---|------|-----------|
| 1.1 | `profiles` 테이블: `id` = `auth.users` FK, `display_name`, `avatar_url`, `created_at` | 회원 가입 시 트리거로 row 생성(또는 첫 로그인 시 upsert) |
| 1.2 | `user_wallets`: `user_id` PK, `balance` (bigint, ≥0), `updated_at` | RLS: 본인 행만 SELECT/UPDATE |
| 1.3 | `credit_ledger`: `user_id`, `type`, `amount`, `balance_after`, `reference`, `created_at` | RLS: 본인만 SELECT, INSERT는 서버(service role) 또는 RPC만 |
| 1.4 | `generation_jobs` + `generation_outputs`(또는 JSONB 컬럼): `user_id`, `cost_credits`, `model`, `type_label`, `result_excerpt`, `created_at` | 마이페이지 목록에 필요한 최소 필드 |
| 1.5 | `payments` (충전 예정): `user_id`, `provider`, `amount_krw`, `status`, `external_id`, `metadata` | RLS: 본인만 SELECT |
| 1.6 | 마이그레이션 파일(`supabase/migrations`)로 버전 관리 | `db push` 또는 CI로 재현 가능 |

**Phase 1 구현 메모 (코드베이스)**

| 항목 | 내용 |
|------|------|
| 마이그레이션 | `supabase/migrations/005_phase1_profiles_wallets_generations.sql` |
| 1.1 | `profiles` + `auth.users` 가입 시 `handle_new_user()` 트리거로 `profiles`·`user_wallets` 자동 생성 |
| 1.2 | `user_wallets`: RLS는 **본인 SELECT만** (잔액 변경은 Phase 3 RPC / service role) |
| 1.3 | `credit_ledger`: `amount`는 양수, `type`으로 충전/차감 구분. `reference` 유니크(멱등). 본인 SELECT만 |
| 1.4 | `generation_jobs` + `generation_outputs.result_text` (목록은 job 메타, 본문은 outputs) |
| 1.5 | `payments` + `(provider, external_id)` 유니크(있을 때) |
| 적용 | 로컬: `npx supabase link` 후 `npm run db:push` (또는 `npx supabase db push`). Windows에서 `supabase` 단독 명령은 PATH에 없으면 실패 — **항상 `npx` 또는 `npm run`** 사용. 또는 Dashboard SQL에서 파일 실행 |

---

### Phase 2 — 인증 (Google·Kakao OAuth)

| # | 작업 | 완료 기준 |
|---|------|-----------|
| 2.1 | Supabase 대시보드에서 Google OAuth 클라이언트 등록 | 로컬 Redirect URI 동작 |
| 2.2 | Kakao Developers 앱 생성, Redirect URI = Supabase 콜백 URL | 카카오 로그인 성공 |
| 2.3 | Next.js App Router: `middleware`에서 세션 쿠키 갱신, 보호 경로 정의 | `/mypage`, `/api/...` 보호 규칙 명시 |
| 2.4 | 로그인 UI: “구글로 시작하기”, “카카오로 시작하기”, 로그아웃 | 세션 없으면 보호 페이지 접근 시 로그인으로 이동 |
| 2.5 | 헤더에 프로필(이름/아바타) 표시 | 로그인 상태 반영 |

**Phase 2 구현 메모 (코드베이스)**

| 항목 | 내용 |
|------|------|
| 2.1~2.2 | 대시보드에서 Google·Kakao Provider 활성화 및 Redirect URL `…/auth/callback` 등록 (`.env.example` 주석 참고) |
| 2.3 | `middleware.js` — 세션 쿠키 갱신. `/mypage` 보호는 **서버** `redirect` (`app/mypage/page.js`) |
| 2.4 | `/login` — `LoginClient`에서 `signInWithOAuth(google \| kakao)`, `/auth/callback` 에서 `exchangeCodeForSession` |
| 2.5 | `AuthNavUser` + `QuizForgeNav` — 이메일 앞부분·로그아웃·마이페이지 링크 |
| 경로 | `/auth/callback`(Route Handler), `/auth/auth-code-error`, `/login`, `/mypage` |

---

### Phase 3 — 크레딧 (지갑·원장·RPC)

| # | 작업 | 완료 기준 |
|---|------|-----------|
| 3.1 | `charge_credits(user_id, amount, reference)` RPC: `user_wallets` 증가 + `credit_ledger` 기록 | 동시 호출 시에도 원장 일관 |
| 3.2 | `spend_credits(user_id, amount, reference)` RPC: 잔액 부족 시 에러, 성공 시 차감 + ledger | **중복 차감 방지**(reference 유니크 등) |
| 3.3 | 서버 API: `GET /api/me/wallet` (잔액) | 로그인 사용자만 |
| 3.4 | 정책 상수: `CREDIT_COST_PER_GENERATION`(또는 모델별·구간별 테이블) | 환경변수 또는 DB 설정으로 변경 가능 |

**Phase 3 구현 메모 (코드베이스)**

| 항목 | 내용 |
|------|------|
| 마이그레이션 | `supabase/migrations/006_phase3_credit_rpc.sql` |
| 3.1~3.2 | `charge_credits` / `spend_credits` — `SECURITY DEFINER`, **`service_role`만 EXECUTE**. `user_wallets` 행 `FOR UPDATE`, 동일 `reference`는 `pg_advisory_xact_lock` + 잠금 후 원장 재확인으로 멱등·경쟁 안전 (PL/pgSQL에서 `ROLLBACK TO SAVEPOINT`는 호환 이슈가 있어 미사용) |
| 3.3 | `GET /api/me/wallet` — `createSupabaseServerClient`로 세션 검증 후 `user_wallets` 조회, `creditCostPerGeneration` 포함 |
| 3.4 | `lib/credits.js` — `CREDIT_COST_PER_GENERATION`(선택 `NEXT_PUBLIC_CREDIT_COST_PER_GENERATION`) |
| 서버 헬퍼 | `lib/serverCredits.js` — `chargeCreditsServer` / `spendCreditsServer` (결제·Phase 4에서 RPC 호출) |

---

### Phase 4 — 생성 API와 연동 (차감·이력)

| # | 작업 | 완료 기준 |
|---|------|-----------|
| 4.1 | OpenAI 호출을 **로그인 사용자만** 허용하도록 `api/generate` 또는 새 라우트에 세션 검증 | 비로그인 401 |
| 4.2 | 요청 전 잔액 **조회**; 부족 시 402 + 메시지 | 프론트에서 충전 페이지로 안내 |
| 4.3 | OpenAI **성공** 후에만 `spend_credits` 호출(동일 `job_id` reference) | 실패 시 차감 없음 |
| 4.4 | 성공 시 `generation_jobs` / `generation_outputs`에 기록(2주 보관용) | 마이페이지에서 조회 가능한 데이터 |
| 4.5 | 메인·`/one_type`·`/expected_questions` 등에서 **클라이언트 API 키 입력 제거** 또는 서버 전용 경로로 통합 | 사용자는 로그인 + 크레딧만 사용 |
| 4.6 | (선택) user_id·IP 기준 rate limit | 과도한 요청 차단 |

**Phase 4 구현 메모 (코드베이스)**

| 항목 | 내용 |
|------|------|
| 4.1~4.3 | `POST /api/generate` — `createSupabaseServerClient` 세션, `OPENAI_API_KEY` 서버만 사용. 잔액 부족 시 402. OpenAI 성공 후 `spend:gen:{job_id}` 로 `spend_credits`. 출력 저장 실패 시 `refund:gen:{job_id}` 로 `charge_credits` 환불 시도 |
| 4.4 | `generation_jobs` pending → (실패 시 failed) → 완료 시 `generation_outputs` + status completed. `/mypage` 에 잔액·최근 20건 미리보기 |
| 4.5 | `lib/callGenerateClient.js`, 메인·`/one_type`·`/expected_questions` 에서 API 키 입력 제거 |
| 4.6 | `lib/generateRateLimit.js` — 사용자당 분당 45회(프로세스 메모리) |

---

### Phase 5 — UI (잔액·마이페이지·충전 자리)

| # | 작업 | 완료 기준 |
|---|------|-----------|
| 5.1 | 전역 헤더에 **크레딧 잔액** 표시 | 실시간 또는 생성 후 갱신 |
| 5.2 | `/mypage`: 최근 생성 목록(2주 이내), 상세 보기 | §5.1 저장 필드와 일치 |
| 5.3 | `/pricing` 또는 `/charge`: 충전 상품(크레딧 팩) 표시, **결제 전** “토스페이먼츠 준비 중” 가능 | CTA 존재 |
| 5.4 | 잔액 부족 모달/토스트 + 충전 페이지 링크 | 생성 버튼 클릭 시 UX |

**Phase 5 구현 메모 (코드베이스)**

| 항목 | 내용 |
|------|------|
| 5.1 | `AuthNavUser` — `/api/me/wallet` 조회, 잔액 표시·`/pricing` 링크. `quizforge:wallet-refresh` 이벤트로 생성 성공 후 갱신 (`lib/walletEvents.js`, `callGeneratePost` 성공 시) |
| 5.2 | `/mypage` — 생성 목록 **2주 이내**·최대 20건. `/mypage/jobs/[id]` 에 전문·메타 **상세** |
| 5.3 | `/pricing` — 예시 크레딧 팩·생성당 비용 안내, 토스페이먼츠 Phase 6 안내. 내비에 **요금·충전** |
| 5.4 | `InsufficientCreditsModal` + `InsufficientCreditsError` — 메인·한 유형 일괄·예상문제 세트에서 402 시 모달·`/pricing` CTA |

---

### Phase 6 — 결제 (토스페이먼츠)

| # | 작업 | 완료 기준 |
|---|------|-----------|
| 6.1 | 토스페이먼츠 가맹·**테스트(샌드박스) 키** 발급 | 테스트 결제 성공 |
| 6.2 | 결제 준비 API 또는 결제위젯 연동, `POST /api/payments/toss/…` 등 서버 라우트에서 `payments` row `pending` | 결제·리다이렉트 흐름 동작 |
| 6.3 | 승인 콜백/웹훅: 서버에서 **서명·금액 검증** 후 `payments` `paid`, `charge_credits` 호출 | 원장에 `charge` 기록 |
| 6.4 | 실패·취소 URL 처리, 사용자에게 결과 페이지 | 중복 충전 방지(idempotency) |
| 6.5 | 운영 전환: **라이브 키**, 로그·알림 |

**Phase 6 구현 메모 (코드베이스)**

| 항목 | 내용 |
|------|------|
| 6.1~6.2 | `POST /api/payments/toss/order` — 로그인·`lib/pricingPacks` 로 금액·크레딧 확정, `payments` `pending` + `external_id`(orderId). `components/PricingCheckout.jsx` — `@tosspayments/tosspayments-sdk` `payment.requestPayment` (카드) |
| 6.3 | `POST /api/payments/toss/confirm` — 토스 `POST /v1/payments/confirm` (`lib/tossPayments.js`), 금액·주문 검증 후 `charge:toss:{orderId}` 로 `charge_credits`, `payments` `paid`, `charge` 멱등 |
| 6.4 | `/payment/toss/success` · `/payment/toss/fail` — 성공 시 confirm API 호출·`dispatchWalletRefresh`; 실패 시 `POST /api/payments/toss/fail` 로 pending → `failed` |
| 6.5 | `.env.example` — `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY`, `TOSS_PAYMENTS_SECRET_KEY` |
| 상품 | `lib/pricingPacks.js` — 스타터/스탠다드/프로 (크레딧·원화) |

---

### Phase 7 — 운영·정책·품질

| # | 작업 | 완료 기준 |
|---|------|-----------|
| 7.1 | **2주 삭제** Job: Supabase `pg_cron` 또는 Vercel Cron → `generation_*` 14일 이전 삭제 | 스케줄 로그 |
| 7.2 | 이용약관·개인정보처리방침·환불정책 **정적 페이지** | 푸터 링크 |
| 7.3 | 크레딧 단가·충전 패키지 금액 확정(§7 참고) | `CREDIT_COST`와 상품 테이블 반영 |
| 7.4 | (선택) 관리자: 특정 사용자 크레딧 조정, 결제 실패 로그 | 내부용 보호 |
| 7.5 | 모니터링: OpenAI/결제/5xx 알림 | |

---

### Phase 8 — 확장 (후순위)

| # | 작업 | 비고 |
|---|------|------|
| 8.1 | 카카오페이 등 **추가 PG** | §6.2 표 참고 |
| 8.2 | 구간·모델별 차감, 예상문제 세트 할인 | §7.3 |
| 8.3 | 이메일 알림(잔액 부족, 삭제 D-1) | §8.2 권장 |
| 8.4 | B2B·세금계산서 | 별도 기획 |

---

### 의존성 그래프 (요약)

```
Phase0 → Phase1 → Phase2 → Phase3 → Phase4 → Phase5
                              ↓
                         Phase6 (결제는 Phase3 이후 가능, UI는 Phase5와 병행 가능)
                              ↓
                         Phase7 → Phase8
```

**최소 MVP**: Phase0~5 + Phase7(약관·삭제만) + **수동 충전**(관리자가 `charge_credits` 호출)으로 PG 없이 베타 테스트 가능. 이후 Phase6으로 유료 전환.

---

## 12. 문서 버전

- 초안 작성: 수익화·결제·크레딧·OAuth·보관기간·OpenAI 단가 가이드 포함.
- **추가**: §11 상세 구현 단계(체크리스트).
- **변경**: 결제 1차 PG를 카카오페이에서 **토스페이먼츠**로 계획 수정(§6, §9, Phase 5~6, Phase 8.1, `payments.provider` 예시).
- 변경 시 날짜와 변경 요약을 본 절에 기록할 것.
