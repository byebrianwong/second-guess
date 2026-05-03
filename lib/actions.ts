"use client";

import { getSupabase } from "./supabase/client";
import { normalize } from "./scoring/normalize";
import { addBot, type BotPlayer } from "./dev/bots";
import { QUESTION_LIBRARY } from "./data/question-library";
import type { Game, Question, Player } from "./types";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ"; // no I/O/L

// FNV-1a 32-bit hashes of 4-letter codes we don't want to display as room
// codes (slurs, slang, harassment terms). Stored as opaque hashes so the
// words themselves never appear in source. To add a new entry, hash with:
//   node -e "let h=0x811c9dc5;for(const c of 'WORD')h=Math.imul(h^c.charCodeAt(0),0x01000193);console.log((h>>>0).toString(16).padStart(8,'0'))"
const BLOCKED_HASHES = new Set([
  "e3c91d8a", "d07fb3be", "03dcd7a2", "0bdce43a", "fcdccc9d", "03fd2b4d",
  "6a3e6c09", "723e78a1", "ba8c7eff", "ad334ad7", "67a292a9", "85ad30de",
  "0a3b48f1", "6059d38a", "4ccc8efc", "453785ff", "a6bc44be", "1b2a33f3",
  "c0306419", "8746039d", "8e124ab9", "a6127081", "a5126eee", "9d126256",
  "164407f5", "c6403122", "63a9efd6", "bbe01333",
]);

function fnv1aHex(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function randomCode(): string {
  // tiny probability of a blocked hit; loop until clean.
  while (true) {
    let s = "";
    for (let i = 0; i < 4; i++) {
      s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    if (!BLOCKED_HASHES.has(fnv1aHex(s))) return s;
  }
}

export async function createGame(opts: {
  prompts: string[];
  theme?: string;
  forceCode?: string;
}): Promise<{ game: Game; questions: Question[] }> {
  const supabase = getSupabase();
  const theme = opts.theme || "baby_shower";

  let game: Game | null = null;

  if (opts.forceCode) {
    const { data, error } = await supabase
      .from("games")
      .insert({
        code: opts.forceCode,
        theme,
        status: "lobby",
        current_round: 0,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") {
        throw new Error(
          `A "${opts.forceCode}" game is already running. End it first.`,
        );
      }
      throw new Error(`Failed to create game: ${error.message}`);
    }
    game = data as Game;
  } else {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = randomCode();
      const { data, error } = await supabase
        .from("games")
        .insert({ code, theme, status: "lobby", current_round: 0 })
        .select("*")
        .single();
      if (!error && data) {
        game = data as Game;
        break;
      }
      lastError = error;
      if (error?.code !== "23505") {
        throw new Error(`Failed to create game: ${error?.message}`);
      }
    }
    if (!game)
      throw new Error(`Code collision after 10 tries: ${String(lastError)}`);
  }

  const rows = opts.prompts.map((prompt, i) => ({
    game_id: game!.id,
    position: i + 1,
    prompt,
    state: "pending" as const,
  }));
  const { data: qs, error: qErr } = await supabase
    .from("questions")
    .insert(rows)
    .select("*")
    .order("position");
  if (qErr) throw new Error(`Failed to insert questions: ${qErr.message}`);

  return { game, questions: (qs as Question[]) ?? [] };
}

/**
 * Pick `count` distinct prompts from the question library, biased toward
 * one-per-category so the solo round feels varied.
 */
function pickRandomLibraryPrompts(count: number): string[] {
  const cats = [...QUESTION_LIBRARY].sort(() => Math.random() - 0.5);
  const picked = new Set<string>();
  for (const cat of cats) {
    if (picked.size >= count) break;
    const shuffled = [...cat.questions].sort(() => Math.random() - 0.5);
    for (const q of shuffled) {
      if (picked.has(q)) continue;
      picked.add(q);
      break;
    }
  }
  while (picked.size < count) {
    const cat = QUESTION_LIBRARY[Math.floor(Math.random() * QUESTION_LIBRARY.length)];
    const q = cat.questions[Math.floor(Math.random() * cat.questions.length)];
    picked.add(q);
  }
  return Array.from(picked);
}

/**
 * Spin up a solo game: random questions, the calling user as a player,
 * plus a bench of bots that will auto-answer once the game starts.
 *
 * Returns everything the caller needs to drive the game from one tab —
 * the host_secret (saved to localStorage so they can also act as host)
 * and the user's player id.
 */
export async function createSoloGame(opts: {
  playerName: string;
  playerAvatar: string;
  questionCount?: number;
  botCount?: number;
}): Promise<{
  game: Game;
  questions: Question[];
  userPlayerId: string;
  bots: BotPlayer[];
}> {
  const prompts = pickRandomLibraryPrompts(opts.questionCount ?? 5);
  const { game, questions } = await createGame({ prompts, theme: "solo" });

  const userPlayerId = crypto.randomUUID();
  await joinGame({
    gameId: game.id,
    playerId: userPlayerId,
    name: opts.playerName,
    avatar: opts.playerAvatar,
  });

  const botCount = opts.botCount ?? 15;
  const bots: BotPlayer[] = [];
  for (let i = 0; i < botCount; i++) {
    bots.push(await addBot({ gameId: game.id, code: game.code }));
  }

  return { game, questions, userPlayerId, bots };
}

export async function getGameByCode(code: string): Promise<Game | null> {
  const supabase = getSupabase();
  // Prefer a non-finished game with this code. Fall back to the most recent
  // finished game so players refreshing on the final leaderboard keep their
  // view until the host explicitly cancels and a new game claims the code.
  const { data } = await supabase
    .from("games")
    .select("*")
    .eq("code", code.toUpperCase())
    .order("ended_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Game) ?? null;
}

export async function joinGame(opts: {
  gameId: string;
  playerId: string;
  name: string;
  avatar: string;
}): Promise<Player> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("players")
    .upsert(
      {
        id: opts.playerId,
        game_id: opts.gameId,
        name: opts.name.trim(),
        avatar: opts.avatar,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("That name's taken in this game — try another.");
    }
    throw new Error(error.message);
  }
  return data as Player;
}

export async function removePlayer(playerId: string) {
  const supabase = getSupabase();
  await supabase.from("players").delete().eq("id", playerId);
}

export async function touchPlayer(playerId: string) {
  const supabase = getSupabase();
  await supabase
    .from("players")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", playerId);
}

export async function startGame(gameId: string) {
  const supabase = getSupabase();
  await supabase.from("games").update({ status: "active", current_round: 1 }).eq("id", gameId);
  await supabase
    .from("questions")
    .update({ state: "open", opened_at: new Date().toISOString() })
    .eq("game_id", gameId)
    .eq("position", 1);
}

export async function submitAnswer(opts: {
  questionId: string;
  playerId: string;
  rawText: string;
}) {
  const supabase = getSupabase();
  const raw = opts.rawText.trim();
  if (!raw) throw new Error("Type something first!");
  const norm = normalize(raw);
  const { error } = await supabase.from("answers").upsert(
    {
      question_id: opts.questionId,
      player_id: opts.playerId,
      raw_text: raw,
      normalized: norm,
    },
    { onConflict: "question_id,player_id" },
  );
  if (error) {
    if (error.code === "23505") throw new Error("You already answered.");
    throw new Error(error.message);
  }
}

export async function mergeAnswerGroups(opts: {
  questionId: string;
  fromKey: string;
  intoKey: string;
}) {
  const supabase = getSupabase();
  // Set group_key on every answer in fromKey to intoKey.
  // Note: this is a coarse update because we don't have group_key on rows yet
  // for never-merged answers. Match by (group_key = fromKey) OR (group_key is null AND normalized = fromKey).
  await supabase
    .from("answers")
    .update({ group_key: opts.intoKey })
    .eq("question_id", opts.questionId)
    .or(`group_key.eq.${opts.fromKey},and(group_key.is.null,normalized.eq.${opts.fromKey})`);
}

export async function unmergeAnswerGroup(opts: {
  questionId: string;
  groupKey: string;
}) {
  const supabase = getSupabase();
  // Fetch every answer that is currently in this group, whether they were
  // manually merged (group_key = opts.groupKey) or auto-grouped purely by
  // normalization (group_key IS NULL and normalized = opts.groupKey).
  const { data: answers } = await supabase
    .from("answers")
    .select("id, raw_text, group_key, normalized")
    .eq("question_id", opts.questionId);

  const targets = (answers ?? []).filter(
    (a: { group_key: string | null; normalized: string }) =>
      a.group_key === opts.groupKey ||
      (a.group_key === null && a.normalized === opts.groupKey),
  ) as { id: string; raw_text: string }[];

  if (targets.length === 0) return;

  // Give each answer a per-raw-text key so identical raw texts stay together
  // ("Lego" + "Lego" → one group) but variants split apart ("Lego" vs
  // "Legos" → two groups). The "raw:" prefix avoids colliding with any
  // normalized key.
  await Promise.all(
    targets.map((a) =>
      supabase
        .from("answers")
        .update({ group_key: `raw:${a.raw_text.trim().toLowerCase()}` })
        .eq("id", a.id),
    ),
  );
}

export async function revealQuestion(questionId: string) {
  const supabase = getSupabase();
  // Lock the question (no new submissions sneak in) before finalizing scores.
  // We intentionally pass through the 'closed' state without a separate
  // host-facing review screen — the merge UI is now live during 'open'.
  await supabase
    .from("questions")
    .update({ state: "closed", closed_at: new Date().toISOString() })
    .eq("id", questionId);
  const { error } = await supabase.rpc("finalize_question", {
    p_question_id: questionId,
  });
  if (error) throw new Error(error.message);
}

export async function cancelGame(gameId: string) {
  const supabase = getSupabase();
  await supabase
    .from("games")
    .update({ status: "finished", ended_at: new Date().toISOString() })
    .eq("id", gameId);
}

export async function resetGameToLobby(gameId: string) {
  const supabase = getSupabase();
  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .eq("game_id", gameId);
  const qIds = (questions ?? []).map((q: { id: string }) => q.id);
  if (qIds.length > 0) {
    await supabase.from("round_scores").delete().in("question_id", qIds);
    await supabase.from("answers").delete().in("question_id", qIds);
    await supabase
      .from("questions")
      .update({ state: "pending", opened_at: null, closed_at: null })
      .eq("game_id", gameId);
  }
  await supabase
    .from("games")
    .update({ status: "lobby", current_round: 0, ended_at: null })
    .eq("id", gameId);
}

export async function nextQuestion(opts: {
  gameId: string;
  currentRound: number;
  totalQuestions: number;
}) {
  const supabase = getSupabase();
  if (opts.currentRound >= opts.totalQuestions) {
    await supabase
      .from("games")
      .update({ status: "finished", ended_at: new Date().toISOString() })
      .eq("id", opts.gameId);
    return;
  }
  const next = opts.currentRound + 1;
  await supabase
    .from("questions")
    .update({ state: "open", opened_at: new Date().toISOString() })
    .eq("game_id", opts.gameId)
    .eq("position", next);
  await supabase.from("games").update({ current_round: next }).eq("id", opts.gameId);
}
