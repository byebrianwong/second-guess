"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button, Input, Logo, Pill } from "./_components/ui";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onJoin(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!/^[A-HJ-NP-Z]{4}$/.test(c)) {
      setError("Enter a 4-letter code (no I, O, or L).");
      return;
    }
    router.push(`/play/${c}`);
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <Logo className="mb-2" />
      <Pill tone="lavender" className="mb-6">a real-time party game</Pill>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="bg-white rounded-card p-8 max-w-md w-full shadow-[0_12px_40px_-16px_rgba(42,36,56,0.28)]"
      >
        <h1 className="font-display text-3xl font-bold mb-2 text-center">
          Don't be first.
        </h1>
        <p className="text-ink-soft text-center mb-6">
          The most popular answer is worth zero. Aim for #2.
        </p>

        <form onSubmit={onJoin} className="space-y-3">
          <label className="block">
            <span className="text-sm font-semibold mb-1 block">Game code</span>
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="ABCD"
              maxLength={4}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="text-center font-display text-3xl tracking-[0.4em] font-bold"
            />
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" size="lg" className="w-full">
            Join the room
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-ink-faint text-xs uppercase tracking-widest">
          <div className="flex-1 h-px bg-ink-faint/30" />
          or
          <div className="flex-1 h-px bg-ink-faint/30" />
        </div>

        <Link href="/host/new" className="block">
          <Button variant="soft" size="lg" className="w-full">
            🎤 Host a new game
          </Button>
        </Link>
      </motion.div>
    </main>
  );
}
