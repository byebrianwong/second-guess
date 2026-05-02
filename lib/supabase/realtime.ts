"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "./client";
import type { Game, Question, Player, Answer, RoundScore } from "../types";

export interface GameSnapshot {
  game: Game | null;
  questions: Question[];
  players: Player[];
  answers: Answer[];
  scores: RoundScore[];
}

const empty: GameSnapshot = {
  game: null,
  questions: [],
  players: [],
  answers: [],
  scores: [],
};

export function useGameChannel(gameId: string | null) {
  const [snapshot, setSnapshot] = useState<GameSnapshot>(empty);

  useEffect(() => {
    if (!gameId) {
      setSnapshot(empty);
      return;
    }

    const supabase = getSupabase();
    let cancelled = false;

    async function loadInitial() {
      const [g, q, p, a, s] = await Promise.all([
        supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
        supabase
          .from("questions")
          .select("*")
          .eq("game_id", gameId)
          .order("position"),
        supabase.from("players").select("*").eq("game_id", gameId),
        supabase
          .from("answers")
          .select("*, questions!inner(game_id)")
          .eq("questions.game_id", gameId),
        supabase
          .from("round_scores")
          .select("*, questions!inner(game_id)")
          .eq("questions.game_id", gameId),
      ]);
      if (cancelled) return;
      setSnapshot({
        game: (g.data as Game) ?? null,
        questions: (q.data as Question[]) ?? [],
        players: (p.data as Player[]) ?? [],
        answers: ((a.data as Answer[]) ?? []).map(stripJoin),
        scores: ((s.data as RoundScore[]) ?? []).map(stripJoin),
      });
    }

    loadInitial();

    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          setSnapshot((s) => ({ ...s, game: payload.new as Game }));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter: `game_id=eq.${gameId}` },
        (payload) => {
          setSnapshot((s) => ({
            ...s,
            questions: upsert(s.questions, payload.new as Question, "id").sort(
              (a, b) => a.position - b.position,
            ),
          }));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setSnapshot((s) => ({
              ...s,
              players: s.players.filter((p) => p.id !== (payload.old as Player).id),
            }));
          } else {
            setSnapshot((s) => ({
              ...s,
              players: upsert(s.players, payload.new as Player, "id"),
            }));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "answers" },
        (payload) => {
          const a = payload.new as Answer;
          setSnapshot((s) => {
            if (!s.questions.some((q) => q.id === a.question_id)) return s;
            return { ...s, answers: upsert(s.answers, a, "id") };
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "answers" },
        (payload) => {
          const a = payload.new as Answer;
          setSnapshot((s) => {
            if (!s.questions.some((q) => q.id === a.question_id)) return s;
            return { ...s, answers: upsert(s.answers, a, "id") };
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "round_scores" },
        (payload) => {
          const r = payload.new as RoundScore;
          setSnapshot((s) => {
            if (!s.questions.some((q) => q.id === r.question_id)) return s;
            return {
              ...s,
              scores: upsertCompound(s.scores, r, ["question_id", "player_id"]),
            };
          });
        },
      )
      .subscribe((status) => {
        // Re-sync once the channel is fully subscribed. There's a race
        // between the initial fetch and the channel actually subscribing
        // — any updates that land in that gap aren't delivered. Hitting
        // loadInitial again on SUBSCRIBED guarantees the snapshot reflects
        // the post-subscribe DB state.
        if (status === "SUBSCRIBED") {
          loadInitial();
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { snapshot };
}

function upsert<T>(arr: T[], item: T, key: keyof T): T[] {
  const idx = arr.findIndex((x) => x[key] === item[key]);
  if (idx === -1) return [...arr, item];
  const next = arr.slice();
  next[idx] = item;
  return next;
}

function upsertCompound<T>(arr: T[], item: T, keys: (keyof T)[]): T[] {
  const idx = arr.findIndex((x) => keys.every((k) => x[k] === item[k]));
  if (idx === -1) return [...arr, item];
  const next = arr.slice();
  next[idx] = item;
  return next;
}

function stripJoin<T>(row: T): T {
  const copy = { ...row } as T & { questions?: unknown };
  delete copy.questions;
  return copy;
}
