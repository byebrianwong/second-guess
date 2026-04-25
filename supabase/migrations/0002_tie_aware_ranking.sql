-- Second Guess — fix scoring so ties truly tie.
--
-- The original finalize_question used `dense_rank() over (order by cnt desc, gkey asc)`,
-- which broke ties alphabetically and produced consecutive ranks (1, 2, 3 …) even when
-- groups had the same count. We want true ties:
--   counts [5, 5, 3, 2, 1] -> ranks [1, 1, 3, 4, 5]
-- so two answers tied at the top both score 0 (no silver).
--
-- Re-run this in the Supabase SQL editor to replace the function.

create or replace function finalize_question(p_question_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_state text;
begin
  select state into v_state from questions where id = p_question_id;
  if v_state is null then
    raise exception 'no question %', p_question_id;
  end if;
  if v_state not in ('closed','reviewing') then
    return;
  end if;

  delete from round_scores where question_id = p_question_id;

  with groups as (
    select coalesce(group_key, normalized) as gkey, count(*) as cnt
    from answers
    where question_id = p_question_id
    group by coalesce(group_key, normalized)
  ),
  ranked as (
    select gkey, cnt,
           rank() over (order by cnt desc) as rk
    from groups
  )
  insert into round_scores (question_id, player_id, points, rank_group)
  select p_question_id,
         a.player_id,
         case r.rk when 2 then 3 when 3 then 2 when 4 then 1 else 0 end,
         r.rk::int
  from answers a
  join ranked r on r.gkey = coalesce(a.group_key, a.normalized)
  where a.question_id = p_question_id;

  update questions set state = 'revealed' where id = p_question_id;
end;
$$;
