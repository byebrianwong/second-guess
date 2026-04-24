"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { REACTION_EMOJI } from "@/lib/avatars";
import { cn } from "@/lib/utils";

interface Float {
  id: string;
  emoji: string;
  x: number;
}

export function Reactions({
  gameId,
  className,
}: {
  gameId: string | null;
  className?: string;
}) {
  const [floats, setFloats] = useState<Float[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!gameId) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`reactions:${gameId}`)
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        const f: Float = {
          id: `${Date.now()}-${Math.random()}`,
          emoji: (payload as { emoji: string }).emoji,
          x: 10 + Math.random() * 80,
        };
        setFloats((arr) => [...arr, f]);
        setTimeout(() => {
          setFloats((arr) => arr.filter((x) => x.id !== f.id));
        }, 1700);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [gameId]);

  function send(emoji: string) {
    const channel = channelRef.current;
    if (!channel) return;
    const now = Date.now();
    if (now - lastSent.current < 700) return;
    lastSent.current = now;
    channel.send({ type: "broadcast", event: "reaction", payload: { emoji } });
  }

  if (!gameId) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        <AnimatePresence>
          {floats.map((f) => (
            <motion.div
              key={f.id}
              initial={{ y: 0, opacity: 0, scale: 0.4 }}
              animate={{ y: -260, opacity: [0, 1, 1, 0], scale: 1.1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
              className="absolute bottom-24 text-5xl"
              style={{ left: `${f.x}%` }}
            >
              {f.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-white/90 backdrop-blur px-3 py-2 rounded-pill shadow-[0_12px_40px_-16px_rgba(42,36,56,0.28)]",
          className,
        )}
      >
        {REACTION_EMOJI.map((e) => (
          <button
            key={e}
            onClick={() => send(e)}
            className="text-2xl w-11 h-11 rounded-full hover:bg-blush/40 active:scale-90 transition"
            aria-label={`React with ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </>
  );
}
