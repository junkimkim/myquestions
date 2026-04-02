-- 사용자별 선호 GPT 모델 (유형 관리 /types 에서 설정)
alter table public.profiles
  add column if not exists preferred_gpt_model text;

comment on column public.profiles.preferred_gpt_model is 'OpenAI chat 모델 id (예: gpt-5.4-mini). null이면 앱 기본값.';
