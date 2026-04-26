"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button, Input, Logo, Pill } from "./_components/ui";
import { getGameByCode } from "@/lib/actions";
import { saveHostSecret } from "@/lib/session/storage";

export default function Home() {
  const router = useRouter();
  // Pre-fill BABY so the typical case (joining the party room) is one click.
  // Host clears it and types HOST to drop into the host setup flow.
  const [code, setCode] = useState("BABY");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();

    // Party-mode escape hatch: typing HOST takes over the active BABY game
    // from any device. We pull the existing room's host_secret straight from
    // the DB and write it to this device's localStorage, so any phone in the
    // room can become the host (the secret is exposed via the games row read
    // policy — fine for a private party). If no active BABY game exists, fall
    // through to the setup flow with the party preset pre-loaded.
    if (c === "HOST") {
      setBusy(true);
      setError(null);
      try {
        const existing = await getGameByCode("BABY");
        if (existing && existing.status !== "finished") {
          saveHostSecret("BABY", existing.host_secret);
          router.push("/host/BABY");
        } else {
          router.push("/host/new?party=1");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setBusy(false);
      }
      return;
    }

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
              placeholder="BABY"
              maxLength={4}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="text-center font-display text-3xl tracking-[0.4em] font-bold"
            />
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Loading…" : "Join the room"}
          </Button>
        </form>
      </motion.div>
    </main>
  );
}
