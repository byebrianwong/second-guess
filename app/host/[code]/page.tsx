"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Share2 } from "lucide-react";
import { Button, Card, Logo, Pill } from "@/app/_components/ui";
import { Lobby } from "@/app/_components/Lobby";
import { Reactions } from "@/app/_components/Reactions";
import { RevealStage } from "@/app/_components/RevealStage";
import { Standings } from "@/app/_components/Standings";
import { SoundToggle } from "@/app/_components/SoundToggle";
import { useGameChannel } from "@/lib/supabase/realtime";
import { getSupabase } from "@/lib/supabase/client";
import { groupAnswers } from "@/lib/scoring/normalize";
import {
  startGame,
  revealQuestion,
  nextQuestion,
  mergeAnswerGroups,
  unmergeAnswerGroup,
  resetGameToLobby,
  cancelGame,
  removePlayer,
} from "@/lib/actions";
import { getHostSecret } from "@/lib/session/storage";
import { joinNames, tieRanks } from "@/lib/utils";
import { playFanfare } from "@/lib/sounds";
import {
  addBot,
  botAnswerNow,
  getBots,
  removeAllBots,
} from "@/lib/dev/bots";
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

  // Cumulative ranks (tie-aware) before this round's points get added.
  // Used to label live answers as e.g. "Banjo (2)".
  const playerLookup = useMemo(() => {
    const sorted = [...snapshot.players].sort(
      (a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0),
    );
    const ranks = tieRanks(sorted, (p) => totals.get(p.id) ?? 0);
    const lookup = new Map<string, { name: string; rank: number }>();
    sorted.forEach((p, i) => {
      lookup.set(p.id, { name: p.name, rank: ranks[i] });
    });
    return lookup;
  }, [snapshot.players, totals]);

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
      <header className="flex items-center justify-between mb-4 gap-2">
        <Logo compact={game.status === "active"} />
        <div className="flex items-center gap-2 min-w-0">
          {game.status === "active" && <CompactShare code={code} />}
          <SoundToggle />
          <Pill tone="lavender">HOST</Pill>
        </div>
      </header>

      {game.status !== "active" && (
        <Card className="mb-6 text-center">
          <p className="text-xs uppercase tracking-widest text-ink-soft mb-1">
            Room code
          </p>
          <p className="font-display text-6xl font-bold tracking-[0.3em] text-blush-deep">
            {code}
          </p>
          <ShareInvite code={code} />
        </Card>
      )}

      <BotPanel
        gameId={game.id}
        code={code}
        currentQuestion={currentQuestion}
      />

      {game.status === "lobby" && (
        <>
          <Lobby
            players={snapshot.players}
            onRemove={(p) => {
              if (window.confirm(`Remove ${p.name} from this game?`)) {
                removePlayer(p.id);
              }
            }}
          />
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
          <CancelGameButton
            gameId={game.id}
            code={code}
            partyMode={game.theme === "baby_shower_party"}
            className="mt-10"
          />
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

          {(currentQuestion.state === "open" ||
            currentQuestion.state === "closed" ||
            currentQuestion.state === "reviewing") && (
            <>
              <Card className="mb-4">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-3">
                  {currentQuestion.prompt}
                </h2>
                <p className="text-center text-ink-soft mb-3 text-sm">
                  {currentAnswers.length} of {snapshot.players.length} answered
                </p>
                <AnswerProgress
                  count={currentAnswers.length}
                  total={snapshot.players.length}
                />
              </Card>

              {/* Sticky reveal button — stays visible after the prompt
                  card scrolls off the top. */}
              <div className="sticky top-2 z-30 mb-4 flex justify-center pointer-events-none">
                <div className="pointer-events-auto">
                  <Button
                    size="lg"
                    onClick={() => revealQuestion(currentQuestion.id)}
                    disabled={currentAnswers.length === 0}
                  >
                    Reveal answers →
                  </Button>
                </div>
              </div>

              {currentAnswers.length > 0 && (
                <AnswerGroupsPanel
                  groups={groupAnswers(currentAnswers)}
                  playerLookup={playerLookup}
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
                  hint="Group as you go. Tap two answers to merge (2nd name is kept)"
                />
              )}

              <PlayerAnswerRoster
                players={snapshot.players}
                answers={currentAnswers}
                className="mb-4"
              />
            </>
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
            scores={snapshot.scores}
            currentQuestionId={currentQuestion.id}
            showMovement={currentQuestion.state === "revealed"}
            className="mt-10"
          />

          <Card className="mt-12 text-center">
            <p className="text-xs uppercase tracking-widest text-ink-soft mb-1">
              Room code
            </p>
            <p className="font-display text-5xl font-bold tracking-[0.3em] text-blush-deep">
              {code}
            </p>
            <ShareInvite code={code} />
          </Card>

          <EndGameButton gameId={game.id} className="mt-6" />
        </>
      )}

      {game.status === "finished" && (
        <FinalLeaderboard
          players={snapshot.players}
          totals={totals}
          partyMode={game.theme === "baby_shower_party"}
        />
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

function CompactShare({ code }: { code: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/play/${code}`);
  }, [code]);

  async function onClick() {
    if (await tryCopy(url)) {
      setState("copied");
    } else {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1800);
  }

  const label =
    state === "copied"
      ? "Copied!"
      : state === "failed"
        ? "Couldn't copy"
        : code;

  return (
    <button
      onClick={onClick}
      className={`h-9 px-3 rounded-pill flex items-center gap-1.5 text-sm font-bold tracking-widest transition active:scale-95 ${
        state === "copied"
          ? "bg-mint text-emerald-900"
          : state === "failed"
            ? "bg-red-100 text-red-700"
            : "bg-cream-deep/70 text-ink hover:bg-cream-deep"
      }`}
      aria-label={`Copy invite link for ${code}`}
    >
      {state === "copied" ? <Check size={14} /> : <Copy size={14} />}
      <span>{label}</span>
    </button>
  );
}

function CancelGameButton({
  gameId,
  code,
  partyMode = false,
  className,
}: {
  gameId: string;
  code: string;
  partyMode?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (
      !window.confirm(
        "Cancel this game? The room will be closed and you'll go back to host setup.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await cancelGame(gameId);
      // Forget bots tied to this code — the next game with the same code
      // (party mode reuses BABY) should start fresh.
      removeAllBots(code);
      router.push(partyMode ? "/host/new?party=1" : "/host/new");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex justify-center ${className ?? ""}`}>
      <button
        onClick={onClick}
        disabled={busy}
        className="text-xs text-ink-soft underline underline-offset-4 hover:text-red-500 transition disabled:opacity-40"
      >
        {busy ? "Canceling…" : "Cancel this game"}
      </button>
    </div>
  );
}

function EndGameButton({
  gameId,
  className,
}: {
  gameId: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (
      !window.confirm(
        "End this game and send everyone back to the lobby? All answers and scores from this game will be cleared.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await resetGameToLobby(gameId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex justify-center ${className ?? ""}`}>
      <button
        onClick={onClick}
        disabled={busy}
        className="text-xs text-ink-soft underline underline-offset-4 hover:text-red-500 transition disabled:opacity-40"
      >
        {busy ? "Ending…" : "End game & return to lobby"}
      </button>
    </div>
  );
}

function BotPanel({
  gameId,
  code,
  currentQuestion,
}: {
  gameId: string;
  code: string;
  currentQuestion: {
    id: string;
    state: string;
    prompt: string;
  } | null;
}) {
  const [open, setOpen] = useState(false);
  const [bots, setBots] = useState<ReturnType<typeof getBots>>([]);
  const [busy, setBusy] = useState(false);
  const answeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setBots(getBots(code));
  }, [code]);

  // Auto-answer for bots whenever a question is in 'open' state.
  useEffect(() => {
    if (!currentQuestion || currentQuestion.state !== "open") return;
    const qid = currentQuestion.id;
    const prompt = currentQuestion.prompt;
    const fresh = getBots(code);
    if (fresh.length === 0) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    for (const bot of fresh) {
      const key = `${qid}:${bot.id}`;
      if (answeredRef.current.has(key)) continue;
      answeredRef.current.add(key);
      const delay = 400 + Math.random() * 2600;
      const t = setTimeout(() => {
        botAnswerNow({ questionId: qid, prompt, bot });
      }, delay);
      timeouts.push(t);
    }
    return () => {
      for (const t of timeouts) clearTimeout(t);
    };
  }, [currentQuestion?.id, currentQuestion?.state, currentQuestion?.prompt, code]);

  async function add(n: number) {
    setBusy(true);
    try {
      for (let i = 0; i < n; i++) {
        await addBot({ gameId, code });
      }
      setBots(getBots(code));
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  function clearAll() {
    if (!window.confirm(`Forget all ${bots.length} bots locally? They'll stay in the lobby on screen until the game ends.`)) {
      return;
    }
    removeAllBots(code);
    setBots([]);
    answeredRef.current = new Set();
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-ink-soft hover:text-ink underline underline-offset-4"
      >
        🤖 Test bots {bots.length > 0 ? `(${bots.length})` : ""} {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="mt-2 bg-cream-deep/40 p-3 rounded-card space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="soft" size="sm" disabled={busy} onClick={() => add(1)} type="button">
              +1
            </Button>
            <Button variant="soft" size="sm" disabled={busy} onClick={() => add(3)} type="button">
              +3
            </Button>
            <Button variant="soft" size="sm" disabled={busy} onClick={() => add(8)} type="button">
              +8
            </Button>
            {bots.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                type="button"
                className="ml-auto"
              >
                Forget all
              </Button>
            )}
          </div>
          <p className="text-xs text-ink-soft">
            Bots auto-answer each question with random picks. Useful for testing alone.
          </p>
        </div>
      )}
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

function AnswerGroupsPanel({
  groups,
  playerLookup,
  onMerge,
  onUnmerge,
  hint,
}: {
  groups: ReturnType<typeof groupAnswers>;
  playerLookup: Map<string, { name: string; rank: number }>;
  onMerge: (fromKey: string, intoKey: string) => Promise<void>;
  onUnmerge: (key: string) => Promise<void>;
  hint?: string;
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
    // Merge `selected` into `key` — the second-clicked group's key wins,
    // so its label survives in the merged display.
    await onMerge(selected, key);
    setSelected(null);
  }

  return (
    <Card className="mb-4">
      {hint && (
        <p className="text-center text-ink-soft text-xs mb-3">{hint}</p>
      )}
      <ul className="space-y-2">
        <AnimatePresence>
          {groups.map((g) => (
            <motion.li
              layout
              key={g.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-3 rounded-2xl border-2 cursor-pointer transition ${
                selected === g.key
                  ? "border-blush-deep bg-blush/30"
                  : "border-ink-faint/30 bg-white hover:border-blush-deep/50"
              }`}
              onClick={() => tap(g.key)}
            >
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold flex-1 truncate">
                  {g.label}
                </span>
                <Pill tone="mint">×{g.count}</Pill>
                {hasMergedKeys(g) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnmerge(g.key);
                    }}
                    className="text-ink-soft hover:text-red-500 px-2 text-xs"
                    title="Split this group"
                  >
                    split
                  </button>
                )}
              </div>
              {g.rawAnswers.length > 0 && (() => {
                const labels = g.rawAnswers
                  .map((r) => {
                    const info = playerLookup.get(r.playerId);
                    return info ? `${info.name} (${info.rank})` : null;
                  })
                  .filter((s): s is string => Boolean(s));
                if (labels.length === 0) return null;
                const full = labels.join(", ");
                return (
                  <div
                    className="mt-1 text-xs text-ink-soft truncate"
                    title={full}
                  >
                    {full}
                  </div>
                );
              })()}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </Card>
  );
}

function PlayerAnswerRoster({
  players,
  answers,
  className,
}: {
  players: { id: string; name: string; avatar: string }[];
  answers: { player_id: string; raw_text: string }[];
  className?: string;
}) {
  const byPlayer = new Map(answers.map((a) => [a.player_id, a]));
  const answered = players.filter((p) => byPlayer.has(p.id));
  const waiting = players.filter((p) => !byPlayer.has(p.id));
  // Most recently arrived first within "answered" so the host sees new
  // submissions at the top.
  return (
    <Card className={className}>
      <h3 className="font-display text-lg font-bold mb-2">Players</h3>
      <ul className="space-y-1.5 text-sm">
        <AnimatePresence>
          {answered.map((p) => (
            <motion.li
              key={p.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="flex items-center gap-2"
            >
              <span className="text-xl shrink-0">{p.avatar}</span>
              <span className="font-semibold w-24 sm:w-32 truncate">
                {p.name}
              </span>
              <span className="font-mono text-ink truncate flex-1">
                {byPlayer.get(p.id)!.raw_text}
              </span>
            </motion.li>
          ))}
          {waiting.map((p) => (
            <motion.li
              key={p.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="flex items-center gap-2 opacity-60"
            >
              <span className="text-xl shrink-0">{p.avatar}</span>
              <span className="font-semibold w-24 sm:w-32 truncate">
                {p.name}
              </span>
              <span className="text-ink-faint italic flex-1">
                …answering
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </Card>
  );
}

function hasMergedKeys(g: ReturnType<typeof groupAnswers>[number]): boolean {
  // If this group has more than one underlying raw text variant, treat as mergeable/splittable.
  const distinct = new Set(g.rawAnswers.map((r) => r.rawText.toLowerCase()));
  return distinct.size > 1;
}

function FinalLeaderboard({
  players,
  totals,
  partyMode = false,
}: {
  players: { id: string; name: string; avatar: string }[];
  totals: Map<string, number>;
  partyMode?: boolean;
}) {
  const router = useRouter();
  useEffect(() => {
    playFanfare();
  }, []);
  const sorted = [...players].sort(
    (a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0),
  );
  const ranks = tieRanks(sorted, (p) => totals.get(p.id) ?? 0);
  const topScore = sorted.length > 0 ? totals.get(sorted[0].id) ?? 0 : 0;
  const winners = sorted.filter((p) => (totals.get(p.id) ?? 0) === topScore);
  const winnerNames = joinNames(winners.map((w) => w.name));
  const verb = winners.length > 1 ? "win" : "wins";

  function startNewGame() {
    if (
      window.confirm(
        "Start a brand new game? This room will be left behind and you'll get a new code.",
      )
    ) {
      router.push(partyMode ? "/host/new?party=1" : "/host/new");
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
        {winners.length > 0 ? `${winnerNames} ${verb}!` : "Game over!"}
      </h1>
      <p className="text-ink-soft mb-6">
        {winners.length > 0 ? `${topScore} points` : ""}
      </p>
      <Card>
        <ol className="space-y-2 text-left">
          {sorted.map((p, i) => (
            <li
              key={p.id}
              className={`flex items-center gap-3 p-2 rounded-pill ${
                ranks[i] === 1 ? "bg-lemon" : ""
              }`}
            >
              <span className="w-6 text-right font-display font-bold">
                {ranks[i]}
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
