"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnswerGroup, RoundScore } from "@/lib/types";
import { pointsForRank, computeRanks } from "@/lib/scoring/normalize";
import { Pill } from "./ui";

interface RevealRow {
  rank: number;
  group: AnswerGroup;
  points: number;
}

const RANK_TONES: Array<"blush" | "mint" | "lavender" | "lemon" | "sky"> = [
  "blush",
  "mint",
  "lavender",
  "lemon",
  "sky",
];

const RANK_LABEL: Record<number, string> = {
  1: "#1 — most popular",
  2: "#2 — silver",
  3: "#3 — bronze",
  4: "#4",
};

export function RevealStage({
  groups,
  scores,
  selfId,
  skipAnimation = false,
  question,
}: {
  groups: AnswerGroup[];
  scores: RoundScore[];
  selfId?: string | null;
  skipAnimation?: boolean;
  question: string;
}) {
  const top = groups.slice(0, 5);
  const max = Math.max(1, ...top.map((g) => g.count));
  const total = scores.length;

  const rows: RevealRow[] = computeRanks(top).map((g) => ({
    rank: g.rank,
    group: g,
    points: pointsForRank(g.rank),
  }));

  const [phase, setPhase] = useState<"tabulating" | "revealing" | "done">(
    skipAnimation ? "done" : "tabulating",
  );
  const [revealedRanks, setRevealedRanks] = useState<number[]>(
    skipAnimation ? rows.map((r) => r.rank) : [],
  );

  useEffect(() => {
    if (skipAnimation) return;
    const ttab = setTimeout(() => setPhase("revealing"), 1200);
    return () => clearTimeout(ttab);
  }, [skipAnimation]);

  useEffect(() => {
    if (phase !== "revealing") return;
    const order = [...rows].reverse(); // reveal #5 -> #4 -> ... -> #1
    if (order.length === 0) {
      setPhase("done");
      return;
    }
    let cancelled = false;
    let i = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      if (cancelled) return;
      if (i >= order.length) {
        setPhase("done");
        return;
      }
      const rank = order[i].rank;
      setRevealedRanks((r) => [...r, rank]);
      i += 1;
      timeoutId = setTimeout(tick, 900);
    };
    tick();

    return () => {
      cancelled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const selfScore = scores.find((s) => s.player_id === selfId);
  const selfAnswerGroup = (() => {
    if (!selfId) return null;
    for (const g of groups) {
      if (g.rawAnswers.some((r) => r.playerId === selfId)) return g;
    }
    return null;
  })();
  const selfRank = selfAnswerGroup
    ? (rows.find((r) => r.group.key === selfAnswerGroup.key)?.rank ?? 0)
    : 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <p className="text-center text-ink-soft text-sm mb-2">{total} answers in</p>
      <h2 className="font-display text-2xl sm:text-3xl text-center mb-6 font-bold">
        {question}
      </h2>

      {phase === "tabulating" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="text-6xl"
          >
            🧮
          </motion.div>
          <p className="font-display text-xl">Tabulating answers…</p>
        </div>
      )}

      {phase !== "tabulating" && (
        <div className="space-y-3">
          {rows.map((row) => {
            const visible = revealedRanks.includes(row.rank);
            const tone = RANK_TONES[row.rank - 1];
            const isSelfGroup =
              selfId &&
              row.group.rawAnswers.some((r) => r.playerId === selfId);
            return (
              <AnimatePresence key={row.group.key}>
                {visible && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 20 }}
                    className={`relative bg-white rounded-card p-4 overflow-hidden ${
                      isSelfGroup ? "ring-2 ring-blush-deep" : ""
                    }`}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(row.group.count / max) * 100}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      className={`absolute inset-y-0 left-0 opacity-50 ${BAR_COLOR[tone]}`}
                    />
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Pill tone={tone}>{RANK_LABEL[row.rank] ?? `#${row.rank}`}</Pill>
                        <div className="font-display text-lg sm:text-2xl font-bold truncate">
                          {row.group.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-right shrink-0">
                        <div className="font-display text-2xl font-bold">
                          {row.group.count}
                        </div>
                        <div className="text-xs text-ink-soft">
                          {row.points > 0 ? `+${row.points}` : "0"} pts
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}
        </div>
      )}

      {phase === "done" && selfId && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 16, delay: 0.3 }}
          className="mt-8 text-center bg-white rounded-card p-6 shadow-[0_12px_40px_-16px_rgba(42,36,56,0.28)]"
        >
          <p className="text-sm uppercase tracking-widest text-ink-soft mb-1">
            Your round
          </p>
          <p className="font-display text-5xl font-bold mb-1">
            {selfScore ? (selfScore.points > 0 ? `+${selfScore.points}` : "0") : "—"}
          </p>
          <p className="text-sm text-ink-soft">
            {selfAnswerGroup
              ? selfRank > 0
                ? `You said "${selfAnswerGroup.label}" — ranked #${selfRank}`
                : `You said "${selfAnswerGroup.label}"`
              : "No answer this round"}
          </p>
        </motion.div>
      )}
    </div>
  );
}

const BAR_COLOR: Record<string, string> = {
  blush: "bg-blush",
  mint: "bg-mint",
  lavender: "bg-lavender",
  lemon: "bg-lemon",
  sky: "bg-sky",
};
