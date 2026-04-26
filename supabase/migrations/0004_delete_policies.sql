-- Second Guess — fix silent-fail deletes on players / answers / round_scores.
--
-- The initial migration enabled RLS on every gameplay table but only added
-- a DELETE policy for `questions`. Without an explicit DELETE policy, any
-- delete from the anon-key client is silently dropped — no row removed, no
-- error returned. Visible symptoms:
--   - Players who click "Leave the game" or are removed by the host stay in
--     the DB. Re-joining with the same name then trips the unique
--     (game_id, lower(name)) constraint.
--   - "End game & return to lobby" calls resetGameToLobby() which deletes
--     answers + round_scores. Those deletes silently fail, so the next
--     round starts with stale data attached to the same question_ids.
--
-- Re-run this in the Supabase SQL editor.

create policy players_delete      on players      for delete using (true);
create policy answers_delete      on answers      for delete using (true);
create policy round_scores_delete on round_scores for delete using (true);
