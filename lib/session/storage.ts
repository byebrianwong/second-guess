"use client";

const PLAYERS_KEY = "second_guess.players";
const HOSTS_KEY = "second_guess.host_secrets";
const REVEAL_KEY = "second_guess.last_seen_reveal";

export interface PlayerSession {
  playerId: string;
  name: string;
  avatar: string;
}

function readMap<T>(key: string): Record<string, T> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    return {};
  }
}

function writeMap<T>(key: string, value: Record<string, T>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota
  }
}

export function getPlayerSession(code: string): PlayerSession | null {
  const map = readMap<PlayerSession>(PLAYERS_KEY);
  return map[code.toUpperCase()] ?? null;
}

export function savePlayerSession(code: string, session: PlayerSession) {
  const map = readMap<PlayerSession>(PLAYERS_KEY);
  map[code.toUpperCase()] = session;
  writeMap(PLAYERS_KEY, map);
}

export function clearPlayerSession(code: string) {
  const map = readMap<PlayerSession>(PLAYERS_KEY);
  delete map[code.toUpperCase()];
  writeMap(PLAYERS_KEY, map);
}

export function getHostSecret(code: string): string | null {
  const map = readMap<string>(HOSTS_KEY);
  return map[code.toUpperCase()] ?? null;
}

export function saveHostSecret(code: string, secret: string) {
  const map = readMap<string>(HOSTS_KEY);
  map[code.toUpperCase()] = secret;
  writeMap(HOSTS_KEY, map);
}

export function markRevealSeen(questionId: string) {
  const map = readMap<true>(REVEAL_KEY);
  map[questionId] = true;
  writeMap(REVEAL_KEY, map);
}

export function hasSeenReveal(questionId: string): boolean {
  const map = readMap<true>(REVEAL_KEY);
  return Boolean(map[questionId]);
}
