# Second Guess

A real-time party game where the most popular answer is worth **zero**. Aim for #2.

Built for baby showers, birthdays, and any group who's tired of the obvious answer.

## Mechanics

- Host creates a game, gets a 4-letter code, and edits a list of questions tangentially related to a theme (e.g. "Name a toddler's favorite toy").
- Players join from their phones with the code + a name + an avatar emoji.
- Each round, players answer a question with one short free-text response.
- After everyone's in, the host reviews the grouped answers (it auto-merges "lego" / "Legos" / "LEGO", and the host can hand-merge near-synonyms like "binky" / "pacifier").
- Reveal animation: bar graph tabulates, then unveils #1 (0 pts — easy collusion), #2 (3 pts), #3 (2 pts), #4 (1 pt). Each player sees how they did.
- Highest cumulative score wins.

## Stack

- **Next.js 16** (App Router) on **Vercel**
- **Supabase** Postgres + Realtime (Postgres Changes for game state, Broadcast for emoji reactions). No Supabase Auth — players are anonymous, identified by a UUID stored in `localStorage`.
- **Tailwind CSS v4** + **Framer Motion**
- TypeScript

## Setup

### 1. Supabase project

1. Create a new project at [supabase.com](https://supabase.com).
2. In the SQL editor, paste and run the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). This creates the schema, RLS policies, the `finalize_question` RPC, and enables Realtime on the gameplay tables.
3. Copy your project URL and anon key from **Settings → API**.

### 2. Local env

```sh
cp .env.local.example .env.local
# then edit .env.local with your Supabase values
```

### 3. Install + run

```sh
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Trying it locally

You'll want three browser windows to feel the realtime flow:

1. **Window A** (host): go to `/`, click *Host a new game*, edit the question list, click *Create*. You'll be taken to `/host/ABCD` showing the room code.
2. **Window B & C** (players): open `/`, type the same code, join with different names + avatars. They'll appear in the host's lobby live.
3. Host clicks *Start*. Players see the question, type answers, host watches the count tick up.
4. Host clicks *End question*, sees the auto-grouped answers, optionally taps two groups to merge them, then clicks *Reveal*.
5. Animation runs on every screen.

Refresh window B mid-question — you stay in the same game with your points intact (player UUID lives in localStorage per game code).

## Limitations (intentional, for MVP)

- **Cleared browser data = lost session.** A player who clears site data has to rejoin with a different name and starts at 0 points. The audience is in the same room — they can shout across.
- **Permissive RLS.** Mutations are allowed for anyone with the anon key and the right ids. The 4-letter code + random `host_secret` are the only soft locks. Acceptable for an ephemeral party game; lock down via Edge Functions if you ever ship this publicly at scale.
- **No profanity filter.** Host can re-end and skip if needed.
- **No scheduled cleanup of old games.** They sit in `lobby` / `active` until the host clicks End, then can be reused.

## Project layout

```
app/
  page.tsx                 # landing — join code or host new
  host/new/page.tsx        # host setup: questions, theme
  host/[code]/page.tsx     # host control panel + review screen + reveal mirror
  play/[code]/page.tsx     # unified player page (lobby/answer/wait/reveal/leaderboard)
  _components/             # Lobby, Reactions, RevealStage, ui primitives

lib/
  supabase/client.ts       # browser Supabase client
  supabase/realtime.ts     # useGameChannel hook (Postgres Changes + Broadcast)
  scoring/normalize.ts     # answer normalization + alias dictionary + ranking
  session/storage.ts       # localStorage helpers (player UUIDs, host secrets)
  data/baby-shower-questions.ts
  actions.ts               # createGame / joinGame / submitAnswer / endQuestion / revealQuestion / nextQuestion / merge

supabase/migrations/0001_init.sql
```

## Storybook

Visual regression / component sandbox for `Lobby`, `Standings`,
`RevealStage`, and the UI primitives. Stories live next to their
components as `*.stories.tsx`.

```sh
pnpm storybook        # runs at http://localhost:6006
pnpm build-storybook  # static build → storybook-static/
```

## Chromatic

Chromatic runs visual snapshots of every story on each push / PR. To
finish setup once:

1. Sign in at [chromatic.com](https://www.chromatic.com) and create a
   new project linked to this GitHub repo.
2. Copy the project token Chromatic gives you.
3. Add it as a GitHub secret named `CHROMATIC_PROJECT_TOKEN` (Settings
   → Secrets and variables → Actions).

The workflow at [.github/workflows/chromatic.yml](.github/workflows/chromatic.yml)
will then run on every push to `main` and every PR. To publish locally:

```sh
CHROMATIC_PROJECT_TOKEN=… pnpm chromatic
```

## Future ideas

- More themes: birthdays, wedding showers, holidays. Each is just a starter question pack + alias dict.
- Public game discovery / replay link.
- "Spectator" mode for the projector.
- Tighter RLS via Supabase Edge Functions if abuse becomes a concern.
