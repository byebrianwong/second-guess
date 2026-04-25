"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";
import { Button, Card, Logo, Pill } from "@/app/_components/ui";
import { createGame } from "@/lib/actions";
import { saveHostSecret } from "@/lib/session/storage";
import { BABY_SHOWER_QUESTIONS } from "@/lib/data/baby-shower-questions";

interface PromptItem {
  id: string;
  text: string;
}

function makeItem(text: string): PromptItem {
  return { id: crypto.randomUUID(), text };
}

function makeItems(texts: string[]): PromptItem[] {
  return texts.map(makeItem);
}

export default function HostNewPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<PromptItem[]>(() =>
    makeItems(BABY_SHOWER_QUESTIONS.slice(0, 8)),
  );
  const [theme, setTheme] = useState("baby_shower");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setPromptText(id: string, value: string) {
    setPrompts((p) => p.map((x) => (x.id === id ? { ...x, text: value } : x)));
  }

  function addPrompt() {
    setPrompts((p) => [...p, makeItem("")]);
  }

  function removePrompt(id: string) {
    setPrompts((p) => p.filter((x) => x.id !== id));
  }

  function loadStarter() {
    setPrompts(makeItems(BABY_SHOWER_QUESTIONS.slice(0, 10)));
  }

  function shuffle() {
    setPrompts((p) => {
      const pool = BABY_SHOWER_QUESTIONS.slice();
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return makeItems(pool.slice(0, p.length));
    });
  }

  async function onCreate() {
    const cleaned = prompts.map((p) => p.text.trim()).filter(Boolean);
    if (cleaned.length < 1) {
      setError("Add at least one question.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { game } = await createGame({ prompts: cleaned, theme });
      saveHostSecret(game.code, game.host_secret);
      router.push(`/host/${game.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
      <header className="flex items-center justify-between mb-6">
        <Logo />
        <Pill tone="mint">host setup</Pill>
      </header>

      <Card className="mb-6">
        <h1 className="font-display text-2xl font-bold mb-1">Build your game</h1>
        <p className="text-ink-soft text-sm mb-4">
          Edit the question list. Players join with a 4-letter code.
        </p>

        <div className="flex gap-2 flex-wrap">
          <Button variant="soft" size="sm" onClick={loadStarter} type="button">
            Load 10 baby-shower starters
          </Button>
          <Button variant="ghost" size="sm" onClick={shuffle} type="button">
            🎲 Shuffle
          </Button>
          <Button variant="ghost" size="sm" onClick={addPrompt} type="button">
            + Add question
          </Button>
        </div>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-bold">Questions</h2>
          <Pill tone="blush">{prompts.length}</Pill>
        </div>
        <p className="text-ink-soft text-xs mb-3">Drag the handle to reorder.</p>
        <Reorder.Group
          axis="y"
          values={prompts}
          onReorder={setPrompts}
          className="space-y-2 list-none p-0"
        >
          {prompts.map((p, i) => (
            <QuestionRow
              key={p.id}
              item={p}
              index={i}
              onChange={(text) => setPromptText(p.id, text)}
              onRemove={() => removePrompt(p.id)}
            />
          ))}
        </Reorder.Group>
      </Card>

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      <Button onClick={onCreate} disabled={busy} size="lg" className="w-full">
        {busy ? "Creating…" : "Create the game →"}
      </Button>
    </main>
  );
}

function QuestionRow({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: PromptItem;
  index: number;
  onChange: (text: string) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="flex items-start gap-2 bg-white"
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 12px 40px -16px rgba(42,36,56,0.4)",
        zIndex: 10,
      }}
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="touch-none cursor-grab active:cursor-grabbing text-ink-faint hover:text-ink-soft p-1 -ml-1 shrink-0 mt-2.5"
        aria-label="Drag to reorder"
      >
        <GripVertical size={18} />
      </button>
      <span className="text-ink-faint w-6 text-right shrink-0 tabular-nums mt-2.5">
        {index + 1}.
      </span>
      <textarea
        value={item.text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Name a..."
        rows={1}
        className="flex-1 min-w-0 px-4 py-2.5 rounded-2xl bg-white border border-ink-faint/40 text-ink placeholder:text-ink-faint focus:outline-none focus:border-blush-deep focus:ring-4 focus:ring-blush/40 transition resize-none leading-snug [field-sizing:content]"
      />
      <button
        onClick={onRemove}
        className="w-9 h-9 rounded-full hover:bg-blush/40 text-ink-soft text-lg shrink-0 mt-1"
        aria-label="Remove question"
        type="button"
      >
        ×
      </button>
    </Reorder.Item>
  );
}
