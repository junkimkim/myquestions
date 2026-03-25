-- 서술형(= 메인에서 사용자가 입력한 {answer}를 프롬프트에 주입해야 하는) 여부

alter table public.custom_question_types
  add column if not exists is_descriptive boolean not null default false;

