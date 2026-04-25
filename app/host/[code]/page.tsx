"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Share2 } from "lucide-react";
import { Button, Card, Logo, Pill } from "@/app/_components/ui";
import { Lobby } from "@/app/_components/Lobby";
import { Reactions } from "@/app/_components/Reactions";
import { RevealStage } from "@/app/_components/RevealStage";
import { useGameChannel } from "@/lib/supabase/realtime";
import { getSupabase } from "@/lib/supabase/client";
import { groupAnswers } from "@/lib/scoring/normalize";
import {
  startGame,
  endQuestion,
  revealQuestion,
  nextQuestion,
  mergeAnswerGroups,
  unmergeAnswerGroup,
} from "@/lib/actions";
import { getHostSecret } from "@/lib/session/storage";
import type { Game } from "@/lib/types";

export default function HostGamePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const [gameId, setGameId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const secret = getHostSecret(code);
    if (!secret) {
      setAuthError("This browser isn't the host of this game.");
      return;
    }
    const supabase = getSupabase();
    supabase
      .from("games")
      .select("id, host_secret, status")
      .eq("code", code)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const g = data as (Game & { host_secret: string }) | null;
        if (!g) {
          setAuthError("Game not found.");
          return;
        }
        if (g.host_secret !== secret) {
          setAuthError("Host secret mismatch.");
          return;
        }
        setGameId(g.id);
      });
  }, [code]);

  const { snapshot } = useGameChannel(gameId);

  const currentQuestion = useMemo(() => {
    if (!snapshot.game) return null;
    return (
      snapshot.questions.find(
        (q) => q.position === snapshot.game!.current_round,
      ) ?? null
    );
  }, [snapshot]);

  const currentAnswers = useMemo(() => {
    if (!currentQuestion) return [];
    return snapshot.answers.filter((a) => a.question_id === currentQuestion.id);
  }, [snapshot.answers, currentQuestion]);

  const currentScores = useMemo(() => {
    if (!currentQuestion) return [];
    return snapshot.scores.filter((s) => s.question_id === currentQuestion.id);
  }, [snapshot.scores, currentQuestion]);

  const totals = useMemo(() => {
    const t = new Map<string, number>();
    for (const s of snapshot.scores) {
      t.set(s.player_id, (t.get(s.player_id) ?? 0) + s.points);
    }
    return t;
  }, [snapshot.scores]);

  if (authError) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <h1 className="font-display text-2xl mb-2">Hmm.</h1>
          <p className="text-ink-soft mb-4">{authError}</p>
          <Link href="/">
            <Button variant="soft">Back to home</Button>
          </Link>
        </Card>
      </main>
    );
  }

  if (!snapshot.game) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-ink-soft">Loading game…</p>
      </main>
    );
  }

  const game = snapshot.game;
  const totalQuestions = snapshot.questions.length;

  return (
    <main className="flex-1 px-4 sm:px-6 py-6 max-w-3xl mx-auto w-full pb-32">
      <header className="flex items-center justify-between mb-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Pill tone="lavender">HOST</Pill>
        </div>
      </header>

      <Card className="mb-6 text-center">
        <p className="text-xs uppercase tracking-widest text-ink-soft mb-1">
          Room code
        </p>
        <p className="font-display text-6xl font-bold tracking-[0.3em] text-blush-deep">
          {code}
        </p>
        <ShareInvite code={code} />
      </Card>

      {game.status === "lobby" && (
        <>
          <Lobby players={snapshot.players} />
          <div className="mt-8 flex flex-col items-center gap-2">
            <Button
              size="lg"
              onClick={() => startGame(game.id)}
              disabled={snapshot.players.length === 0 || totalQuestions === 0}
            >
              Start the game →
            </Button>
            <p className="text-xs text-ink-soft">
              {totalQuestions} {totalQuestions === 1 ? "question" : "questions"} ready
            </p>
          </div>
        </>
      )}

      {game.status === "active" && currentQuestion && (
        <>
          <div className="flex items-center justify-between mb-3 px-1">
            <Pill tone="mint">
              Question {game.current_round} of {totalQuestions}
            </Pill>
            <Pill tone="lemon">{stateLabel(currentQuestion.state)}</Pill>
          </div>

          {currentQuestion.state === "open" && (
            <>
              <Card className="mb-4">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-4">
                  {currentQuestion.prompt}
                </h2>
                <p className="text-center text-ink-soft mb-4">
                  {currentAnswers.length} of {snapshot.players.length} answered
                </p>
                <AnswerProgress
                  count={currentAnswers.length}
                  total={snapshot.players.length}
                />
              </Card>
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={() => endQuestion(currentQuestion.id)}
                  disabled={currentAnswers.length === 0}
                >
                  End question →
                </Button>
              </div>
            </>
          )}

          {currentQuestion.state === "reviewing" && (
            <ReviewScreen
              questionId={currentQuestion.id}
              prompt={currentQuestion.prompt}
              groups={groupAnswers(currentAnswers)}
              onMerge={(from, into) =>
                mergeAnswerGroups({
                  questionId: currentQuestion.id,
                  fromKey: from,
                  intoKey: into,
                })
              }
              onUnmerge={(key) =>
                unmergeAnswerGroup({
                  questionId: currentQuestion.id,
                  groupKey: key,
                })
              }
              onReveal={() => revealQuestion(currentQuestion.id)}
            />
          )}

          {currentQuestion.state === "revealed" && (
            <>
              <RevealStage
                groups={groupAnswers(currentAnswers)}
                scores={currentScores}
                question={currentQuestion.prompt}
              />
              <div className="mt-8 flex justify-center">
                <Button
                  size="lg"
                  onClick={() =>
                    nextQuestion({
                      gameId: game.id,
                      currentRound: game.current_round,
                      totalQuestions,
                    })
                  }
                >
                  {game.current_round < totalQuestions
                    ? "Next question →"
                    : "Show final leaderboard →"}
                </Button>
              </div>
            </>
          )}

          <Standings
            players={snapshot.players}
            totals={totals}
            className="mt-10"
          />
        </>
      )}

      {game.status === "finished" && (
        <FinalLeaderboard players={snapshot.players} totals={totals} />
      )}

      <Reactions gameId={gameId} />
    </main>
  );
}

function ShareInvite({ code }: { code: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/play/${code}`);
  }, [code]);

  const canNativeShare =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function";

  async function copy() {
    if (await tryCopy(url)) {
      setCopyState("copied");
    } else {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 2000);
  }

  async function nativeShare() {
    try {
      await navigator.share({
        title: "Second Guess",
        text: `Join my Second Guess game — code ${code}`,
        url,
      });
    } catch {
      // user cancelled, ignore
    }
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 w-full max-w-md">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => e.currentTarget.select()}
          className="flex-1 px-4 py-2.5 rounded-pill bg-cream-deep/60 text-sm text-ink-soft text-left font-mono w-0 border-none focus:outline-none focus:ring-2 focus:ring-blush-deep/40"
        />
        <button
          onClick={copy}
          className={`h-10 px-4 rounded-pill font-semibold text-sm flex items-center gap-1.5 transition active:scale-95 ${
            copyState === "copied"
              ? "bg-mint text-emerald-900"
              : copyState === "failed"
                ? "bg-red-100 text-red-700"
                : "bg-blush-deep text-white hover:bg-blush-deep/90"
          }`}
          aria-label="Copy invite link"
        >
          {copyState === "copied" ? (
            <Check size={16} />
          ) : (
            <Copy size={16} />
          )}
          {copyState === "copied"
            ? "Copied"
            : copyState === "failed"
              ? "Select & copy"
              : "Copy link"}
        </button>
        {canNativeShare && (
          <button
            onClick={nativeShare}
            className="h-10 px-3 rounded-pill bg-white border border-ink-faint/40 text-ink-soft hover:border-blush-deep transition active:scale-95"
            aria-label="Share invite"
          >
            <Share2 size={16} />
          </button>
        )}
      </div>
      <p className="text-xs text-ink-soft">
        Send this link, or have players type{" "}
        <span className="font-bold text-ink">{code}</span> on the home page.
      </p>
    </div>
  );
}

function stateLabel(state: string) {
  switch (state) {
    case "open":
      return "answering";
    case "closed":
      return "closed";
    case "reviewing":
      return "reviewing";
    case "revealed":
      return "revealed";
    default:
      return state;
  }
}

function AnswerProgress({ count, total }: { count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="h-3 bg-ink-faint/20 rounded-pill overflow-hidden">
      <motion.div
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="h-full bg-blush-deep rounded-pill"
      />
    </div>
  );
}

function ReviewScreen({
  questionId: _questionId,
  prompt,
  groups,
  onMerge,
  onUnmerge,
  onReveal,
}: {
  questionId: string;
  prompt: string;
  groups: ReturnType<typeof groupAnswers>;
  onMerge: (fromKey: string, intoKey: string) => Promise<void>;
  onUnmerge: (key: string) => Promise<void>;
  onReveal: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  async function tap(key: string) {
    if (!selected) {
      setSelected(key);
      return;
    }
    if (selected === key) {
      setSelected(null);
      return;
    }
    // Merge `selected` into `key` (key wins as the surviving group).
    await onMerge(selected, key);
    setSelected(null);
  }

  return (
    <>
      <Card className="mb-4">
        <h2 className="font-display text-2xl font-bold text-center mb-1">
          {prompt}
        </h2>
        <p className="text-center text-ink-soft text-sm mb-4">
          Tap two groups to merge them. Tap a merged group's × to split it.
        </p>

        <ul className="space-y-2">
          <AnimatePresence>
            {groups.map((g) => (
              <motion.li
                layout
                key={g.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex items-center gap-2 p-3 rounded-pill border-2 cursor-pointer transition ${
                  selected === g.key
                    ? "border-blush-deep bg-blush/30"
                    : "border-ink-faint/30 bg-white hover:border-blush-deep/50"
                }`}
                onClick={() => tap(g.key)}
              >
                <span className="font-display text-lg font-bold flex-1 truncate">
                  {g.label}
                </span>
                <Pill tone="mint">×{g.count}</Pill>
                {g.rawAnswers.length > 1 && (
                  <span className="text-xs text-ink-soft hidden sm:inline">
                    {[...new Set(g.rawAnswers.map((r) => r.rawText))]
                      .slice(0, 3)
                      .join(", ")}
                  </span>
                )}
                {hasMergedKeys(g) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnmerge(g.key);
                    }}
                    className="text-ink-soft hover:text-red-500 px-2"
                    title="Split this group"
                  >
                    split
                  </button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </Card>

      <div className="flex justify-center gap-2">
        <Button onClick={onReveal} size="lg">
          Reveal answers ✨
        </Button>
      </div>
    </>
  );
}

function hasMergedKeys(g: ReturnType<typeof groupAnswers>[number]): boolean {
  // If this group has more than one underlying raw text variant, treat as mergeable/splittable.
  const distinct = new Set(g.rawAnswers.map((r) => r.rawText.toLowerCase()));
  return distinct.size > 1;
}

function Standings({
  players,
  totals,
  className,
}: {
  players: { id: string; name: string; avatar: string }[];
  totals: Map<string, number>;
  className?: string;
}) {
  const sorted = [...players].sort(
    (a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0),
  );
  return (
    <Card className={className}>
      <h3 className="font-display text-lg font-bold mb-3">Standings</h3>
      <ul className="space-y-1.5">
        {sorted.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3 text-sm">
            <span className="w-5 text-right text-ink-soft">{i + 1}.</span>
            <span className="text-xl">{p.avatar}</span>
            <span className="flex-1 font-semibold truncate">{p.name}</span>
            <span className="font-display font-bold">
              {totals.get(p.id) ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function FinalLeaderboard({
  players,
  totals,
}: {
  players: { id: string; name: string; avatar: string }[];
  totals: Map<string, number>;
}) {
  const router = useRouter();
  const sorted = [...players].sort(
    (a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0),
  );
  const winner = sorted[0];

  function startNewGame() {
    if (
      window.confirm(
        "Start a brand new game? This room will be left behind and you'll get a new code.",
      )
    ) {
      router.push("/host/new");
    }
  }

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 14 }}
        className="text-7xl mb-2"
      >
        🏆
      </motion.div>
      <h1 className="font-display text-4xl font-bold mb-2">
        {winner ? winner.name : "Game over"}!
      </h1>
      <p className="text-ink-soft mb-6">
        {winner ? `${totals.get(winner.id) ?? 0} points` : ""}
      </p>
      <Card>
        <ol className="space-y-2 text-left">
          {sorted.map((p, i) => (
            <li
              key={p.id}
              className={`flex items-center gap-3 p-2 rounded-pill ${
                i === 0 ? "bg-lemon" : ""
              }`}
            >
              <span className="w-6 text-right font-display font-bold">
                {i + 1}
              </span>
              <span className="text-2xl">{p.avatar}</span>
              <span className="flex-1 font-semibold truncate">{p.name}</span>
              <span className="font-display text-xl font-bold">
                {totals.get(p.id) ?? 0}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <button
        onClick={startNewGame}
        className="mt-6 text-xs text-ink-soft underline underline-offset-4 hover:text-ink transition"
      >
        Start a new game
      </button>
    </div>
  );
}

async function tryCopy(text: string): Promise<boolean> {
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
