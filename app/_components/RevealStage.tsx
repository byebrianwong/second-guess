"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnswerGroup, RoundScore } from "@/lib/types";
import { pointsForRank, computeRanks } from "@/lib/scoring/normalize";

interface RevealRow {
  rank: number;
  group: AnswerGroup;
  points: number;
}

const RANK_META: Record<
  number,
  { tag: string; bar: string; tagColor: string }
> = {
  1: { tag: "Too popular", bar: "bg-ink-faint/30", tagColor: "text-ink-soft" },
  2: { tag: "Just right!", bar: "bg-lemon", tagColor: "text-amber-800" },
  3: { tag: "So close", bar: "bg-mint", tagColor: "text-emerald-800" },
  4: { tag: "Almost", bar: "bg-lavender", tagColor: "text-indigo-800" },
  5: { tag: "", bar: "bg-sky", tagColor: "text-sky-800" },
};

function pluralPeople(n: number): string {
  return n === 1 ? "1 person" : `${n} people`;
}

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
    if (skipAnimation) {
      // skipAnimation can flip to true *after* mount (e.g. RevealWithMemory's
      // hasSeenReveal effect runs on rerender). Force the final state.
      setPhase("done");
      setRevealedRanks(rows.map((r) => r.rank));
      return;
    }
    const ttab = setTimeout(() => setPhase("revealing"), 1200);
    return () => clearTimeout(ttab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <p className="text-center text-ink-soft text-xs mb-1">{total} answers in</p>
      <h2 className="font-display text-xl sm:text-2xl text-center mb-4 font-bold">
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
        <div className="space-y-2">
          {rows.map((row) => {
            const visible = revealedRanks.includes(row.rank);
            const meta = RANK_META[row.rank] ?? RANK_META[5];
            const isFirst = row.rank === 1;
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
                    className={`relative bg-white rounded-2xl px-4 py-2.5 overflow-hidden ${
                      isSelfGroup
                        ? "ring-4 ring-blush-deep ring-offset-2 ring-offset-cream shadow-[0_0_28px_-6px_rgba(255,159,182,0.7)]"
                        : ""
                    }`}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(row.group.count / max) * 100}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      className={`absolute inset-y-0 left-0 ${meta.bar} ${
                        isFirst ? "opacity-30" : "opacity-50"
                      }`}
                    />
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div
                          className={`flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider ${meta.tagColor}`}
                        >
                          <span>#{row.rank}</span>
                          <span className="text-ink-faint">·</span>
                          <span>{pluralPeople(row.group.count)}</span>
                          {meta.tag && (
                            <>
                              <span className="text-ink-faint">·</span>
                              <span>{meta.tag}</span>
                            </>
                          )}
                          {isSelfGroup && (
                            <motion.span
                              initial={{ scale: 0, rotate: -10 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{
                                type: "spring",
                                stiffness: 280,
                                damping: 14,
                                delay: 0.1,
                              }}
                              className="ml-1 bg-blush-deep text-white text-[10px] font-extrabold tracking-widest px-2 py-0.5 rounded-pill shadow-[0_4px_12px_-4px_rgba(255,159,182,0.9)]"
                            >
                              👈 YOU
                            </motion.span>
                          )}
                        </div>
                        <div
                          className={`relative inline-block font-display text-base sm:text-xl font-bold truncate max-w-full leading-tight ${
                            isFirst ? "text-ink-soft" : "text-ink"
                          }`}
                        >
                          <span>{row.group.label}</span>
                          {isFirst && (
                            <motion.span
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{
                                delay: 0.45,
                                duration: 0.5,
                                ease: "easeOut",
                              }}
                              style={{ originX: 0, transformOrigin: "left" }}
                              className="absolute left-0 right-0 top-1/2 h-[3px] bg-ink-soft/70 -translate-y-1/2 rounded-full pointer-events-none"
                            />
                          )}
                        </div>
                      </div>
                      <PointsBadge points={row.points} />
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
          className="mt-4 text-center bg-white rounded-2xl px-4 py-3 shadow-[0_12px_40px_-16px_rgba(42,36,56,0.28)]"
        >
          <p className="text-[11px] uppercase tracking-widest text-ink-soft">
            Your round
          </p>
          <p className="font-display text-4xl font-bold leading-tight">
            {selfScore ? (selfScore.points > 0 ? `+${selfScore.points}` : "0") : "—"}
          </p>
          <p className="text-xs text-ink-soft">
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

function PointsBadge({ points }: { points: number }) {
  if (points >= 3) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: -3 }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 12,
          delay: 0.3,
        }}
        className="shrink-0 bg-lemon text-amber-900 font-display font-extrabold pl-2 pr-3 py-1.5 rounded-pill border-2 border-amber-300 shadow-[0_6px_16px_-6px_rgba(180,120,0,0.5)] flex items-center gap-1"
      >
        <span className="text-base">🌟</span>
        <span className="text-base sm:text-lg leading-none">+{points}</span>
      </motion.div>
    );
  }
  if (points === 2) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 16,
          delay: 0.25,
        }}
        className="shrink-0 bg-mint text-emerald-900 font-display font-bold px-2.5 py-1 rounded-pill border border-emerald-300 flex items-center gap-1 text-sm"
      >
        <span>⭐</span>
        <span className="leading-none">+{points}</span>
      </motion.div>
    );
  }
  if (points === 1) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.2 }}
        className="shrink-0 bg-lavender/60 text-indigo-900 font-display font-bold px-2 py-0.5 rounded-pill text-xs"
      >
        +{points}
      </motion.div>
    );
  }
  return (
    <span className="shrink-0 text-xs italic text-ink-faint line-through tabular-nums">
      0 pts
    </span>
  );
}
