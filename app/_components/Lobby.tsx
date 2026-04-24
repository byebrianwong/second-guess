"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Player } from "@/lib/types";
import { Pill } from "./ui";

export function Lobby({
  players,
  selfId,
}: {
  players: Player[];
  selfId?: string | null;
}) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="font-display text-2xl font-bold">In the room</h2>
        <Pill tone="mint">{players.length} {players.length === 1 ? "player" : "players"}</Pill>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        <AnimatePresence>
          {players.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ scale: 0, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className={`bg-white rounded-card p-3 flex flex-col items-center gap-1 shadow-[0_6px_24px_-12px_rgba(42,36,56,0.18)] ${
                p.id === selfId ? "ring-2 ring-blush-deep" : ""
              }`}
            >
              <span className="text-4xl">{p.avatar}</span>
              <span className="text-sm font-semibold text-center truncate w-full" title={p.name}>
                {p.name}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
