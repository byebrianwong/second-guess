-- Second Guess — make DELETE events visible to filtered realtime subscriptions.
--
-- By default, Postgres only publishes a row's primary key on DELETE. Our
-- realtime subscriptions filter on non-PK columns (e.g. `game_id=eq.X` on
-- players, questions, answers, round_scores), so DELETE events get dropped
-- because the published "old" row has nothing to match against.
--
-- Setting REPLICA IDENTITY FULL publishes the entire row on DELETE so the
-- filters can match. Cost is a bit of WAL volume; at our scale that's a
-- non-issue.
--
-- Re-run this in the Supabase SQL editor.

alter table players      replica identity full;
alter table questions    replica identity full;
alter table answers      replica identity full;
alter table round_scores replica identity full;
