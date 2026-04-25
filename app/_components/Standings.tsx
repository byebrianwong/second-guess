"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Player, RoundScore } from "@/lib/types";
import { Card } from "./ui";

interface Row {
  player: Player;
  total: number;
  rank: number;
  prevRank: number;
  deltaPoints: number;
}

function buildRows(
  players: Player[],
  scores: RoundScore[],
  currentQuestionId: string | null,
): Row[] {
  const totals = new Map<string, number>();
  const prevTotals = new Map<string, number>();
  for (const p of players) {
    totals.set(p.id, 0);
    prevTotals.set(p.id, 0);
  }
  for (const s of scores) {
    totals.set(s.player_id, (totals.get(s.player_id) ?? 0) + s.points);
    if (s.question_id !== currentQuestionId) {
      prevTotals.set(s.player_id, (prevTotals.get(s.player_id) ?? 0) + s.points);
    }
  }

  const assignRanks = (map: Map<string, number>): Map<string, number> => {
    const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const ranks = new Map<string, number>();
    let prevValue: number | null = null;
    let currentRank = 0;
    entries.forEach(([id, value], i) => {
      if (prevValue === null || value !== prevValue) {
        currentRank = i + 1;
        prevValue = value;
      }
      ranks.set(id, currentRank);
    });
    return ranks;
  };

  const currRanks = assignRanks(totals);
  const prevRanks = assignRanks(prevTotals);

  const rows: Row[] = players.map((p) => ({
    player: p,
    total: totals.get(p.id) ?? 0,
    rank: currRanks.get(p.id) ?? players.length,
    prevRank: prevRanks.get(p.id) ?? players.length,
    deltaPoints:
      (totals.get(p.id) ?? 0) - (prevTotals.get(p.id) ?? 0),
  }));

  return rows.sort((a, b) => b.total - a.total);
}

export function Standings({
  players,
  scores,
  currentQuestionId = null,
  selfId = null,
  showMovement = false,
  className,
  title = "Standings",
}: {
  players: Player[];
  scores: RoundScore[];
  currentQuestionId?: string | null;
  selfId?: string | null;
  showMovement?: boolean;
  className?: string;
  title?: string;
}) {
  const rows = buildRows(players, scores, showMovement ? currentQuestionId : null);

  if (players.length === 0) return null;

  return (
    <Card className={className}>
      <h3 className="font-display text-lg font-bold mb-3">{title}</h3>
      <ul className="space-y-1.5 relative">
        <AnimatePresence>
          {rows.map((row) => (
            <motion.li
              key={row.player.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className={`flex items-center gap-2 sm:gap-3 text-sm rounded-pill px-2 py-1 ${
                row.player.id === selfId ? "bg-blush/40" : ""
              }`}
            >
              <span className="w-6 text-right text-ink-soft tabular-nums">
                {row.rank}.
              </span>
              <span className="text-xl">{row.player.avatar}</span>
              <span className="flex-1 font-semibold truncate">
                {row.player.name}
              </span>
              {showMovement && (
                <MovementBadge row={row} />
              )}
              <span className="font-display font-bold tabular-nums w-8 text-right">
                {row.total}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </Card>
  );
}

function MovementBadge({ row }: { row: Row }) {
  const delta = row.prevRank - row.rank; // positive => moved up
  if (row.deltaPoints > 0 && delta > 0) {
    return (
      <span className="text-xs font-bold text-emerald-600 tabular-nums">
        ▲{delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="text-xs font-bold text-rose-500 tabular-nums">
        ▼{Math.abs(delta)}
      </span>
    );
  }
  if (row.deltaPoints > 0) {
    return (
      <span className="text-xs font-bold text-emerald-600">
        +{row.deltaPoints}
      </span>
    );
  }
  return <span className="text-xs text-ink-faint w-6 text-center">—</span>;
}
