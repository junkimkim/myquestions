-- mcq_category에 객관식 어법(grammar-mcq) 카테고리를 추가

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'custom_question_types_mcq_category_check'
  ) then
    alter table public.custom_question_types
      drop constraint custom_question_types_mcq_category_check;
  end if;

  alter table public.custom_question_types
    add constraint custom_question_types_mcq_category_check
      check (
        mcq_category is null
        or mcq_category in ('topic-title', 'comprehension', 'blank', 'order-insert', 'summary', 'grammar-mcq')
      );
end$$;
