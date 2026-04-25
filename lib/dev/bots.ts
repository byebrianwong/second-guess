"use client";

import { joinGame, submitAnswer } from "@/lib/actions";
import { AVATAR_EMOJI } from "@/lib/avatars";

const BOTS_KEY = "second_guess.bots";

export interface BotPlayer {
  id: string;
  name: string;
  avatar: string;
}

const BOT_NAME_POOL = [
  "Robo",
  "Nibbles",
  "Pixel",
  "Tofu",
  "Beep",
  "Boop",
  "Doodle",
  "Zigzag",
  "Mochi",
  "Cosmo",
  "Pip",
  "Sprout",
  "Twiggy",
  "Marble",
  "Whisker",
  "Ziggy",
  "Plinko",
  "Squeak",
  "Pebble",
  "Banjo",
];

const ANSWER_POOL = [
  "Lego",
  "Doll",
  "Teddy bear",
  "Ball",
  "Book",
  "Blocks",
  "Truck",
  "Crayon",
  "Puzzle",
  "Stuffy",
  "Bunny",
  "Plane",
  "Train",
  "Bike",
  "Pizza",
  "Ice cream",
  "Cookie",
  "Apple",
  "Banana",
  "Cheese",
];

const HEAVY_HITTERS = ["Lego", "Teddy bear", "Doll"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function readBots(code: string): BotPlayer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BOTS_KEY);
    const map = (raw ? JSON.parse(raw) : {}) as Record<string, BotPlayer[]>;
    return map[code.toUpperCase()] ?? [];
  } catch {
    return [];
  }
}

function writeBots(code: string, bots: BotPlayer[]) {
  try {
    const raw = window.localStorage.getItem(BOTS_KEY);
    const map = (raw ? JSON.parse(raw) : {}) as Record<string, BotPlayer[]>;
    map[code.toUpperCase()] = bots;
    window.localStorage.setItem(BOTS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getBots(code: string): BotPlayer[] {
  return readBots(code);
}

export async function addBot(opts: {
  gameId: string;
  code: string;
}): Promise<BotPlayer> {
  const existing = readBots(opts.code);
  const taken = new Set(existing.map((b) => b.name.toLowerCase()));
  let name = "";
  for (let i = 0; i < 200; i++) {
    const base = pick(BOT_NAME_POOL);
    const candidate =
      i < BOT_NAME_POOL.length ? base : `${base} ${Math.floor(i / BOT_NAME_POOL.length) + 1}`;
    if (!taken.has(candidate.toLowerCase())) {
      name = candidate;
      break;
    }
  }
  if (!name) name = `Bot ${Date.now()}`;

  const avatar = pick(AVATAR_EMOJI);
  const id = crypto.randomUUID();
  await joinGame({ gameId: opts.gameId, playerId: id, name, avatar });
  const bot: BotPlayer = { id, name, avatar };
  writeBots(opts.code, [...existing, bot]);
  return bot;
}

export function removeAllBots(code: string) {
  writeBots(code, []);
}

export function pickBotAnswer(): string {
  // 60% chance of picking a "heavy hitter" so ties happen frequently.
  if (Math.random() < 0.6) return pick(HEAVY_HITTERS);
  return pick(ANSWER_POOL);
}

export async function botAnswerNow(opts: {
  questionId: string;
  bot: BotPlayer;
}) {
  const text = pickBotAnswer();
  try {
    await submitAnswer({
      questionId: opts.questionId,
      playerId: opts.bot.id,
      rawText: text,
    });
  } catch {
    // bot already answered or question closed — ignore
  }
}
