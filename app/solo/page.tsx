"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button, Card, Input, Logo, Pill } from "@/app/_components/ui";
import { Reactions } from "@/app/_components/Reactions";
import { RevealStage } from "@/app/_components/RevealStage";
import { Standings } from "@/app/_components/Standings";
import { SoundToggle } from "@/app/_components/SoundToggle";
import { useGameChannel } from "@/lib/supabase/realtime";
import { groupAnswers } from "@/lib/scoring/normalize";
import {
  createSoloGame,
  nextQuestion,
  revealQuestion,
  startGame,
  submitAnswer,
} from "@/lib/actions";
import { saveHostSecret, savePlayerSession } from "@/lib/session/storage";
import { botAnswerNow, type BotPlayer } from "@/lib/dev/bots";
import { AVATAR_EMOJI } from "@/lib/avatars";
import { joinNames, tieRanks } from "@/lib/utils";
import { playFanfare } from "@/lib/sounds";
import type { Game, Question } from "@/lib/types";

export default function SoloPage() {
  const [setup, setSetup] = useState<SoloSetup | null>(null);
  return setup ? (
    <SoloRunner setup={setup} />
  ) : (
    <SoloEntry onStart={setSetup} />
  );
}

interface SoloSetup {
  game: Game;
  questions: Question[];
  userPlayerId: string;
  bots: BotPlayer[];
  userName: string;
  userAvatar: string;
}

function SoloEntry({ onStart }: { onStart: (setup: SoloSetup) => void }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_EMOJI[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Pick a name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await createSoloGame({
        playerName: trimmed,
        playerAvatar: avatar,
      });
      saveHostSecret(result.game.code, result.game.host_secret);
      savePlayerSession(result.game.code, {
        playerId: result.userPlayerId,
        name: trimmed,
        avatar,
      });
      onStart({
        ...result,
        userName: trimmed,
        userAvatar: avatar,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 px-6 py-8 max-w-md mx-auto w-full flex flex-col">
      <header className="flex items-center justify-between mb-6">
        <Link href="/" className="hover:opacity-80 transition" aria-label="Home">
          <Logo />
        </Link>
        <Pill tone="lavender">solo</Pill>
      </header>

      <Card>
        <h1 className="font-display text-2xl font-bold mb-1">Quick solo game</h1>
        <p className="text-ink-soft text-sm mb-4">
          5 random questions vs. 15 computer players. Aim for #2.
        </p>

        <form onSubmit={start} className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold mb-1 block">Your name</span>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sarah"
              maxLength={20}
            />
          </label>
          <div>
            <span className="text-sm font-semibold mb-2 block">Pick an avatar</span>
            <div className="grid grid-cols-8 gap-1.5">
              {AVATAR_EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setAvatar(e)}
                  className={`text-2xl aspect-square rounded-xl flex items-center justify-center transition active:scale-90 ${
                    avatar === e
                      ? "bg-blush ring-2 ring-blush-deep"
                      : "bg-cream-deep/50 hover:bg-blush/30"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={busy} size="lg" className="w-full">
            {busy ? "Setting up…" : "Start solo game →"}
          </Button>
        </form>
      </Card>
    </main>
  );
}

/**
 * Runs the solo game in a single tab. We act as both player and host:
 * - Host duties (start game, reveal, advance) are auto-driven by effects.
 * - Player duties (submit answer) are manual via the answer card UI.
 * - The bot bench auto-answers each open question with topic-matched picks.
 */
function SoloRunner({ setup }: { setup: SoloSetup }) {
  const { snapshot } = useGameChannel(setup.game.id);
  const router = useRouter();

  const startedRef = useRef(false);
  const botAnsweredRef = useRef<Set<string>>(new Set());
  const advancedRef = useRef<Set<string>>(new Set());
  const revealQueuedRef = useRef<Set<string>>(new Set());

  const game = snapshot.game ?? setup.game;
  const totalQuestions = setup.questions.length;

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
    for (const s of snapshot.scores)
      t.set(s.player_id, (t.get(s.player_id) ?? 0) + s.points);
    return t;
  }, [snapshot.scores]);

  const myAnswer = useMemo(
    () =>
      currentQuestion
        ? snapshot.answers.find(
            (a) =>
              a.question_id === currentQuestion.id &&
              a.player_id === setup.userPlayerId,
          )
        : null,
    [snapshot.answers, currentQuestion, setup.userPlayerId],
  );

  // Everyone's already inserted (createSoloGame awaited each row). Don't
  // wait for realtime to deliver the initial snapshot — just kick the
  // game off so the player isn't stuck staring at a "loading" state.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startGame(setup.game.id);
  }, [setup.game.id]);

  // Bots auto-answer when a question opens.
  useEffect(() => {
    if (!currentQuestion || currentQuestion.state !== "open") return;
    const qid = currentQuestion.id;
    const prompt = currentQuestion.prompt;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    for (const bot of setup.bots) {
      const key = `${qid}:${bot.id}`;
      if (botAnsweredRef.current.has(key)) continue;
      botAnsweredRef.current.add(key);
      const delay = 800 + Math.random() * 4500;
      timeouts.push(
        setTimeout(() => {
          botAnswerNow({ questionId: qid, prompt, bot });
        }, delay),
      );
    }
    return () => timeouts.forEach(clearTimeout);
  }, [currentQuestion?.id, currentQuestion?.state, setup.bots]);

  // Auto-reveal once everyone has answered (small delay so the host's
  // "everyone's in!" moment registers before the bars start tabulating).
  useEffect(() => {
    if (!currentQuestion || currentQuestion.state !== "open") return;
    if (currentAnswers.length < snapshot.players.length) return;
    if (revealQueuedRef.current.has(currentQuestion.id)) return;
    revealQueuedRef.current.add(currentQuestion.id);
    const t = setTimeout(() => revealQuestion(currentQuestion.id), 1200);
    return () => clearTimeout(t);
  }, [currentAnswers.length, snapshot.players.length, currentQuestion]);

  // Auto-advance once the reveal has had time to play out — give people
  // time to read the bars + leaderboard before snapping to the next round.
  useEffect(() => {
    if (!snapshot.game) return;
    if (!currentQuestion || currentQuestion.state !== "revealed") return;
    if (advancedRef.current.has(currentQuestion.id)) return;
    advancedRef.current.add(currentQuestion.id);
    const t = setTimeout(() => {
      nextQuestion({
        gameId: snapshot.game!.id,
        currentRound: snapshot.game!.current_round,
        totalQuestions,
      });
    }, 12000);
    return () => clearTimeout(t);
  }, [currentQuestion, snapshot.game, totalQuestions]);

  return (
    <main className="flex-1 px-4 sm:px-6 py-6 max-w-xl mx-auto w-full pb-32">
      <header className="flex items-center justify-between mb-4">
        <Link href="/" className="hover:opacity-80 transition" aria-label="Home">
          <Logo />
        </Link>
        <div className="flex gap-2 items-center">
          <SoundToggle />
          <Pill tone="mint">{totals.get(setup.userPlayerId) ?? 0} pts</Pill>
          <Pill tone="lavender">solo</Pill>
        </div>
      </header>

      {game.status === "lobby" && (
        <Card className="text-center">
          <motion.div
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="text-5xl mb-2"
          >
            🎈
          </motion.div>
          <p className="font-display text-2xl">Starting up…</p>
        </Card>
      )}

      {game.status === "active" && currentQuestion && (
        <>
          <div className="flex items-center justify-between mb-3 px-1">
            <Pill tone="mint">
              Question {game.current_round} of {totalQuestions}
            </Pill>
          </div>

          {currentQuestion.state === "open" && (
            <SoloAnswerCard
              prompt={currentQuestion.prompt}
              questionId={currentQuestion.id}
              playerId={setup.userPlayerId}
              hasAnswered={Boolean(myAnswer)}
              myAnswerText={myAnswer?.raw_text ?? null}
              answeredCount={currentAnswers.length}
              totalCount={snapshot.players.length}
            />
          )}

          {(currentQuestion.state === "closed" ||
            currentQuestion.state === "reviewing") && (
            <Card className="text-center">
              <p className="font-display text-2xl">Tallying it up…</p>
            </Card>
          )}

          {currentQuestion.state === "revealed" && (
            <>
              <RevealStage
                groups={groupAnswers(currentAnswers)}
                scores={currentScores}
                selfId={setup.userPlayerId}
                question={currentQuestion.prompt}
              />
              <Standings
                players={snapshot.players}
                scores={snapshot.scores}
                currentQuestionId={currentQuestion.id}
                showMovement
                selfId={setup.userPlayerId}
                className="mt-6"
                title="Leaderboard"
              />
            </>
          )}
        </>
      )}

      {game.status === "finished" && (
        <SoloFinalLeaderboard
          players={snapshot.players}
          totals={totals}
          selfId={setup.userPlayerId}
          onReplay={() => router.push("/solo")}
        />
      )}

      <Reactions gameId={snapshot.game?.id ?? null} />
    </main>
  );
}

function SoloAnswerCard({
  prompt,
  questionId,
  playerId,
  hasAnswered,
  myAnswerText,
  answeredCount,
  totalCount,
}: {
  prompt: string;
  questionId: string;
  playerId: string;
  hasAnswered: boolean;
  myAnswerText: string | null;
  answeredCount: number;
  totalCount: number;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await submitAnswer({ questionId, playerId, rawText: text });
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (hasAnswered) {
    return (
      <Card className="text-center">
        <p className="text-xs uppercase tracking-widest text-ink-soft mb-1">
          You answered
        </p>
        <p className="font-display text-3xl font-bold mb-3">{myAnswerText}</p>
        <Pill tone="mint">
          {answeredCount} of {totalCount} answered
        </Pill>
        <p className="text-ink-soft text-sm mt-4 italic">
          Aim for #2! The most popular answer wins zero.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-4">
        {prompt}
      </h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <Input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your answer…"
          maxLength={60}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button
          type="submit"
          disabled={busy || text.trim().length === 0}
          size="lg"
          className="w-full"
        >
          {busy ? "Sending…" : "Submit"}
        </Button>
      </form>
      <p className="text-xs text-center text-ink-soft mt-3">
        {answeredCount} of {totalCount} answered
      </p>
    </Card>
  );
}

function SoloFinalLeaderboard({
  players,
  totals,
  selfId,
  onReplay,
}: {
  players: { id: string; name: string; avatar: string }[];
  totals: Map<string, number>;
  selfId: string;
  onReplay: () => void;
}) {
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
  const youRank = (() => {
    const idx = sorted.findIndex((p) => p.id === selfId);
    return idx >= 0 ? ranks[idx] : 0;
  })();
  const iWon = winners.some((w) => w.id === selfId);

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
      <h1 className="font-display text-4xl font-bold mb-1">
        {winners.length > 0 ? `${winnerNames} ${verb}!` : "Game over"}
      </h1>
      {youRank > 0 && (
        <p className="text-ink-soft mb-6">
          {iWon
            ? `You won with ${totals.get(selfId) ?? 0} points!`
            : `You came in #${youRank} with ${totals.get(selfId) ?? 0} points`}
        </p>
      )}
      <Card>
        <ol className="space-y-2 text-left">
          {sorted.map((p, i) => (
            <li
              key={p.id}
              className={`flex items-center gap-3 p-2 rounded-pill ${
                ranks[i] === 1 ? "bg-lemon" : ""
              } ${p.id === selfId ? "ring-2 ring-blush-deep" : ""}`}
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

      <div className="mt-6 flex gap-2 justify-center">
        <Button onClick={onReplay} size="lg">
          Play again →
        </Button>
        <Link href="/">
          <Button variant="soft" size="lg">
            Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
