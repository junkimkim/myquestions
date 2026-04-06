# 캐쉬·충전 금액 설정

## 충전 상품(원화 고정)

**파일:** `lib/pricingPacks.js`

결제 금액은 **1,000 / 5,000 / 10,000 / 30,000 / 50,000원** 다섯 가지이며, `CASH_TOPUP_PACKS`로 노출됩니다.

| 결제 금액 | 지급 캐쉬 | 비고 |
|-----------|-----------|------|
| 1,000원 | 1,000 | 1:1 |
| 5,000원 | 5,000 | 1:1 |
| 10,000원 | 10,500 | **5% 보너스** |
| 30,000원 | 31,500 | **5% 보너스** |
| 50,000원 | 52,500 | **5% 보너스** |

**규칙:** `10,000원` 이상 결제분만 지급 캐쉬에 **5%**를 더합니다(원 단위 내림).  
로직은 `cashGrantedForTopup(priceKrw)` 에 있습니다.

## 신규 가입 보너스

- **앱 상수:** `lib/cashRules.js` 의 `SIGNUP_BONUS_CASH` (기본 **100** 캐쉬).
- **DB:** `supabase/migrations/008_signup_bonus_handle_new_user.sql` — `auth.users` 생성 직후 `handle_new_user` 트리거에서 `charge_credits` 로 동일 금액을 멱등 reference `signup_bonus:{user_id}` 로 지급합니다. 금액을 바꿀 때는 마이그레이션 SQL의 리터럴과 상수를 함께 수정하세요.

## 생성 시 캐쉬 차감

**파일:** `lib/cashRules.js`, `lib/credits.js`, `app/api/generate/route.js`

- **메인 문제 생성** (`cashPolicy: 'main'`): 선택한 유형마다 한 번씩 호출되며, **유형 1개당 20 캐쉬** (`CASH_MAIN_PER_TYPE_CALL`).
- **한 유형 일괄** (`cashPolicy: 'one_type'`): 비어 있지 않은 지문마다 한 번씩 호출, **지문 1개 × 선택 유형 수 × 20** (`CASH_ONE_TYPE_PER_PASSAGE_UNIT` × `oneTypeSelectedCount`).
- **예상문제 세트**: `POST /api/expected/start-batch`에서 문항 수(25~30)에 따라 **일괄 선차감** 후, 각 문항 생성 시 `/api/generate`는 `expectedFreeBatchId`로 **추가 차감 없음**. 요금은 `20 × n − 100` (예: 25→400, 30→500).
- 그 외(정책 미지정): `lib/credits.js`의 `getCashCostPerGeneration()` (환경변수 `CASH_COST_PER_GENERATION` 등).

## 결제와의 연결

1. **주문** — `POST /api/payments/toss/order` 가 `getPackById`로 팩을 고르고, `payments.metadata`에 `cashGranted`(및 호환용 `credits`)를 넣습니다.
2. **승인** — `POST /api/payments/toss/confirm` 이 메타데이터의 지급액만큼 `charge_credits` RPC로 잔액을 올립니다(DB 함수명은 기존 그대로).

## 변경 시 확인

- `/pricing` 금액·지급 캐쉬·보너스 문구
- 테스트 결제 후 잔액·개발자센터 결제 금액
