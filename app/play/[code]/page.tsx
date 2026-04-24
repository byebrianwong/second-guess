"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button, Card, Input, Logo, Pill } from "@/app/_components/ui";
import { Lobby } from "@/app/_components/Lobby";
import { Reactions } from "@/app/_components/Reactions";
import { RevealStage } from "@/app/_components/RevealStage";
import { useGameChannel } from "@/lib/supabase/realtime";
import { groupAnswers } from "@/lib/scoring/normalize";
import {
  getGameByCode,
  joinGame,
  submitAnswer,
  touchPlayer,
} from "@/lib/actions";
import {
  getPlayerSession,
  savePlayerSession,
  hasSeenReveal,
  markRevealSeen,
} from "@/lib/session/storage";
import { AVATAR_EMOJI } from "@/lib/avatars";
import type { Game } from "@/lib/types";

export default function PlayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const [game, setGame] = useState<Game | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGameByCode(code)
      .then((g) => {
        if (cancelled) return;
        if (!g) {
          setLoadError(`No active game with code ${code}.`);
          return;
        }
        setGame(g);
        const session = getPlayerSession(code);
        if (session) setPlayerId(session.playerId);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  // Heartbeat
  useEffect(() => {
    if (!playerId) return;
    const id = setInterval(() => touchPlayer(playerId).catch(() => {}), 30_000);
    return () => clearInterval(id);
  }, [playerId]);

  if (loadError) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <h1 className="font-display text-2xl mb-2">Hmm.</h1>
          <p className="text-ink-soft mb-4">{loadError}</p>
          <Link href="/">
            <Button variant="soft">Back to home</Button>
          </Link>
        </Card>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-ink-soft">Looking for game {code}…</p>
      </main>
    );
  }

  if (!playerId) {
    return (
      <JoinForm
        code={code}
        gameId={game.id}
        onJoined={(id) => setPlayerId(id)}
      />
    );
  }

  return <PlayInGame code={code} gameId={game.id} playerId={playerId} />;
}

function JoinForm({
  code,
  gameId,
  onJoined,
}: {
  code: string;
  gameId: string;
  onJoined: (playerId: string) => void;
}) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_EMOJI[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      setError("Pick a name.");
      return;
    }
    setBusy(true);
    setError(null);
    const playerId = crypto.randomUUID();
    try {
      await joinGame({ gameId, playerId, name: trimmed, avatar });
      savePlayerSession(code, { playerId, name: trimmed, avatar });
      onJoined(playerId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 px-6 py-8 max-w-md mx-auto w-full flex flex-col">
      <header className="flex items-center justify-between mb-6">
        <Logo />
        <Pill tone="lavender">{code}</Pill>
      </header>

      <Card>
        <h1 className="font-display text-2xl font-bold mb-4">Join the room</h1>

        <form onSubmit={onJoin} className="space-y-4">
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
            {busy ? "Joining…" : "Let's play →"}
          </Button>
        </form>
      </Card>
    </main>
  );
}

function PlayInGame({
  code,
  gameId,
  playerId,
}: {
  code: string;
  gameId: string;
  playerId: string;
}) {
  const { snapshot } = useGameChannel(gameId);

  const currentQuestion = useMemo(() => {
    if (!snapshot.game) return null;
    return (
      snapshot.questions.find(
        (q) => q.position === snapshot.game!.current_round,
      ) ?? null
    );
  }, [snapshot]);

  const totals = useMemo(() => {
    const t = new Map<string, number>();
    for (const s of snapshot.scores) {
      t.set(s.player_id, (t.get(s.player_id) ?? 0) + s.points);
    }
    return t;
  }, [snapshot.scores]);

  if (!snapshot.game) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-ink-soft">Connecting…</p>
      </main>
    );
  }

  const game = snapshot.game;
  const myAnswer =
    currentQuestion &&
    snapshot.answers.find(
      (a) => a.question_id === currentQuestion.id && a.player_id === playerId,
    );

  const currentAnswers = currentQuestion
    ? snapshot.answers.filter((a) => a.question_id === currentQuestion.id)
    : [];
  const currentScores = currentQuestion
    ? snapshot.scores.filter((s) => s.question_id === currentQuestion.id)
    : [];

  return (
    <main className="flex-1 px-4 sm:px-6 py-6 max-w-xl mx-auto w-full pb-32">
      <header className="flex items-center justify-between mb-4">
        <Logo />
        <div className="flex gap-2 items-center">
          <Pill tone="mint">{totals.get(playerId) ?? 0} pts</Pill>
          <Pill tone="lavender">{code}</Pill>
        </div>
      </header>

      {game.status === "lobby" && (
        <>
          <Card className="mb-6 text-center">
            <p className="text-xs uppercase tracking-widest text-ink-soft">
              Waiting for host…
            </p>
            <p className="font-display text-3xl mt-1">Game starts soon!</p>
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2.4 }}
              className="text-5xl mt-3"
            >
              🎈
            </motion.div>
          </Card>
          <Lobby players={snapshot.players} selfId={playerId} />
        </>
      )}

      {game.status === "active" && currentQuestion && (
        <>
          <div className="flex items-center justify-between mb-3 px-1">
            <Pill tone="mint">
              Question {game.current_round} of {snapshot.questions.length}
            </Pill>
          </div>

          {currentQuestion.state === "open" && (
            <AnswerCard
              prompt={currentQuestion.prompt}
              questionId={currentQuestion.id}
              playerId={playerId}
              hasAnswered={Boolean(myAnswer)}
              myAnswerText={myAnswer?.raw_text ?? null}
              answeredCount={currentAnswers.length}
              totalCount={snapshot.players.length}
            />
          )}

          {currentQuestion.state === "closed" && (
            <WaitCard
              title="Answers locked!"
              subtitle="Host is reviewing answers…"
              emoji="🔒"
            />
          )}

          {currentQuestion.state === "reviewing" && (
            <WaitCard
              title="Tallying it up"
              subtitle="Host is grouping similar answers…"
              emoji="🧐"
            />
          )}

          {currentQuestion.state === "revealed" && (
            <RevealWithMemory
              questionId={currentQuestion.id}
              prompt={currentQuestion.prompt}
              groups={groupAnswers(currentAnswers)}
              scores={currentScores}
              selfId={playerId}
            />
          )}
        </>
      )}

      {game.status === "finished" && (
        <FinalLeaderboard
          players={snapshot.players}
          totals={totals}
          selfId={playerId}
        />
      )}

      <Reactions gameId={gameId} />
    </main>
  );
}

function AnswerCard({
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
        <Button type="submit" disabled={busy || text.trim().length === 0} size="lg" className="w-full">
          {busy ? "Sending…" : "Submit"}
        </Button>
      </form>
      <p className="text-xs text-center text-ink-soft mt-3">
        {answeredCount} of {totalCount} answered
      </p>
    </Card>
  );
}

function WaitCard({
  title,
  subtitle,
  emoji,
}: {
  title: string;
  subtitle: string;
  emoji: string;
}) {
  return (
    <Card className="text-center">
      <motion.div
        animate={{ rotate: [0, 6, -6, 0], scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1.6 }}
        className="text-6xl mb-3"
      >
        {emoji}
      </motion.div>
      <p className="font-display text-2xl font-bold mb-1">{title}</p>
      <p className="text-ink-soft">{subtitle}</p>
    </Card>
  );
}

function RevealWithMemory(props: {
  questionId: string;
  prompt: string;
  groups: ReturnType<typeof groupAnswers>;
  scores: { question_id: string; player_id: string; points: number; rank_group: number | null }[];
  selfId: string;
}) {
  const [skip, setSkip] = useState(false);
  useEffect(() => {
    if (hasSeenReveal(props.questionId)) {
      setSkip(true);
    } else {
      const timer = setTimeout(() => markRevealSeen(props.questionId), 5000);
      return () => clearTimeout(timer);
    }
  }, [props.questionId]);

  return (
    <RevealStage
      groups={props.groups}
      scores={props.scores}
      selfId={props.selfId}
      skipAnimation={skip}
      question={props.prompt}
    />
  );
}

function FinalLeaderboard({
  players,
  totals,
  selfId,
}: {
  players: { id: string; name: string; avatar: string }[];
  totals: Map<string, number>;
  selfId: string;
}) {
  const sorted = [...players].sort(
    (a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0),
  );
  const winner = sorted[0];
  const youRank = sorted.findIndex((p) => p.id === selfId) + 1;
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
        {winner ? `${winner.name} wins!` : "Game over"}
      </h1>
      {youRank > 0 && (
        <p className="text-ink-soft mb-6">
          You came in #{youRank} with {totals.get(selfId) ?? 0} points
        </p>
      )}
      <Card>
        <ol className="space-y-2 text-left">
          {sorted.map((p, i) => (
            <li
              key={p.id}
              className={`flex items-center gap-3 p-2 rounded-pill ${
                i === 0 ? "bg-lemon" : ""
              } ${p.id === selfId ? "ring-2 ring-blush-deep" : ""}`}
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
    </div>
  );
}
