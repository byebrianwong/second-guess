"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";
import { Button, Card, Logo, Pill } from "@/app/_components/ui";
import { QuestionLibrary } from "@/app/_components/QuestionLibrary";
import { createGame } from "@/lib/actions";
import { saveHostSecret } from "@/lib/session/storage";
import { removeAllBots } from "@/lib/dev/bots";
import {
  BABY_SHOWER_QUESTIONS,
  BABY_SHOWER_PARTY_QUESTIONS,
  GENERAL_STARTER_QUESTIONS,
} from "@/lib/data/baby-shower-questions";

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
  // useSearchParams() needs to live inside a Suspense boundary so this
  // route can prerender; without it, Next.js bails the build.
  return (
    <Suspense fallback={null}>
      <HostNewInner />
    </Suspense>
  );
}

function HostNewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partyMode = searchParams.get("party") === "1";

  const [prompts, setPrompts] = useState<PromptItem[]>(() =>
    makeItems(
      partyMode
        ? BABY_SHOWER_PARTY_QUESTIONS
        : BABY_SHOWER_QUESTIONS.slice(0, 8),
    ),
  );
  const [theme, setTheme] = useState(
    partyMode ? "baby_shower_party" : "baby_shower",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Id of a prompt that was just added — its row will autofocus on mount.
  const [autoFocusId, setAutoFocusId] = useState<string | null>(null);

  function setPromptText(id: string, value: string) {
    setPrompts((p) => p.map((x) => (x.id === id ? { ...x, text: value } : x)));
  }

  function addPrompt() {
    const item = makeItem("");
    setPrompts((p) => [...p, item]);
    setAutoFocusId(item.id);
  }

  function loadGeneral() {
    setPrompts(makeItems(GENERAL_STARTER_QUESTIONS));
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
      const { game } = await createGame({
        prompts: cleaned,
        theme,
        forceCode: partyMode ? "BABY" : undefined,
      });
      // Clear any bots cached against this code from a previous game with
      // the same code (party-mode reuses BABY) so they don't ghost-answer
      // the fresh game's questions.
      removeAllBots(game.code);
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
        <Link href="/" className="hover:opacity-80 transition" aria-label="Home">
          <Logo />
        </Link>
        <Pill tone={partyMode ? "blush" : "mint"}>
          {partyMode ? "BABY party setup" : "host setup"}
        </Pill>
      </header>

      <Card className="mb-6">
        <h1 className="font-display text-2xl font-bold mb-1">Build your game</h1>
        <p className="text-ink-soft text-sm mb-4">
          {partyMode
            ? "Tweak the party questions if you want — or just hit Create. Players join with code BABY."
            : "Edit the question list. Players join with a 4-letter code."}
        </p>

        <div className="flex gap-2 flex-wrap">
          {partyMode ? (
            <Button
              variant="soft"
              size="sm"
              onClick={() => setPrompts(makeItems(BABY_SHOWER_PARTY_QUESTIONS))}
              type="button"
            >
              Reset to party defaults
            </Button>
          ) : (
            <>
              <Button variant="soft" size="sm" onClick={loadStarter} type="button">
                Load 10 baby-shower starters
              </Button>
              <Button variant="soft" size="sm" onClick={loadGeneral} type="button">
                Load general starter list
              </Button>
              <Button variant="ghost" size="sm" onClick={shuffle} type="button">
                🎲 Shuffle
              </Button>
            </>
          )}
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
              autoFocus={p.id === autoFocusId}
              onChange={(text) => setPromptText(p.id, text)}
              onRemove={() => removePrompt(p.id)}
            />
          ))}
        </Reorder.Group>
      </Card>

      <QuestionLibrary
        currentPrompts={prompts.map((p) => p.text)}
        onAdd={(prompt) => {
          const item = makeItem(prompt);
          setPrompts((p) => [...p, item]);
        }}
        className="mb-6"
      />

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
  autoFocus = false,
  onChange,
  onRemove,
}: {
  item: PromptItem;
  index: number;
  autoFocus?: boolean;
  onChange: (text: string) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When this row was just added via "+ Add question", focus the textarea
  // and bring it into view so the host can start typing immediately.
  useEffect(() => {
    if (!autoFocus || !textareaRef.current) return;
    textareaRef.current.focus();
    textareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    // Mount-only — we don't want to keep refocusing on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        ref={textareaRef}
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
