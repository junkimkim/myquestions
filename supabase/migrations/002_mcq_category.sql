-- MCQ(객관식) 유형을 5개 카테고리로 분류하기 위한 저장 컬럼
-- 값이 null이면 프론트의 휴리스틱 분류(기본값)에 따릅니다.

alter table public.custom_question_types
  add column if not exists mcq_category text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'custom_question_types_mcq_category_check'
  ) then
    alter table public.custom_question_types
      add constraint custom_question_types_mcq_category_check
        check (
          mcq_category is null
          or mcq_category in ('topic-title', 'comprehension', 'blank', 'order-insert', 'summary')
        );
  end if;
end$$;

