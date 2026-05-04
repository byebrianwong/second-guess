import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, Card, Input, Logo, Pill } from "@/app/_components/ui";
import { Lobby } from "@/app/_components/Lobby";
import { RevealStage } from "@/app/_components/RevealStage";
import { Standings } from "@/app/_components/Standings";
import { SoundToggle } from "@/app/_components/SoundToggle";
import { tieRanks, joinNames } from "@/lib/utils";
import {
  mockAllScores,
  mockGroupsTied,
  mockPlayers,
  mockScoresQ1,
  mockTotals,
} from "./_mockData";

/**
 * "Page" stories for the player-side in-game screens. Same approach as
 * the host stories — re-render the page composition with hardcoded data
 * instead of mounting the real /play/[code] page (which depends on
 * Supabase realtime).
 */
const meta: Meta = {
  title: "Pages / Player (in-game)",
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj;

const code = "YRVA";
const selfId = "p1"; // Whisker

function PageShell({
  pts,
  children,
}: {
  pts: number;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 px-4 sm:px-6 py-6 max-w-xl mx-auto w-full pb-32">
      <header className="flex items-center justify-between mb-4">
        <Logo />
        <div className="flex gap-2 items-center">
          <SoundToggle />
          <Pill tone="mint">{pts} pts</Pill>
          <Pill tone="lavender">{code}</Pill>
        </div>
      </header>
      {children}
    </main>
  );
}

/** Player has joined; waiting for the host to start. */
export const Lobby_Waiting: Story = {
  name: "Lobby — waiting",
  render: () => (
    <PageShell pts={0}>
      <Card className="mb-6 text-center">
        <p className="text-xs uppercase tracking-widest text-ink-soft">
          Waiting for host…
        </p>
        <p className="font-display text-3xl mt-1">Game starts soon!</p>
        <div className="text-5xl mt-3">🎈</div>
      </Card>
      <Lobby players={mockPlayers} selfId={selfId} />
      <div className="mt-8 flex justify-center">
        <button className="text-xs text-ink-soft underline underline-offset-4 hover:text-red-500 transition">
          Leave the game
        </button>
      </div>
    </PageShell>
  ),
};

/** Player typing their answer. */
export const Answering: Story = {
  render: () => (
    <PageShell pts={0}>
      <div className="flex items-center justify-between mb-3 px-1">
        <Pill tone="mint">Question 1 of 8</Pill>
      </div>
      <Card>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-4">
          Name a toddler&apos;s favorite toy.
        </h2>
        <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
          <Input placeholder="Type your answer…" defaultValue="Teddy bear" />
          <Button type="submit" size="lg" className="w-full">
            Submit
          </Button>
        </form>
        <p className="text-xs text-center text-ink-soft mt-3">
          3 of {mockPlayers.length} answered
        </p>
      </Card>
    </PageShell>
  ),
};

/** Player has submitted; waiting for everyone else. */
export const Submitted_Waiting: Story = {
  name: "Submitted — waiting",
  render: () => (
    <PageShell pts={0}>
      <div className="flex items-center justify-between mb-3 px-1">
        <Pill tone="mint">Question 1 of 8</Pill>
      </div>
      <Card className="text-center">
        <p className="text-xs uppercase tracking-widest text-ink-soft mb-1">
          You answered
        </p>
        <p className="font-display text-3xl font-bold mb-3">Teddy bear</p>
        <Pill tone="mint">5 of {mockPlayers.length} answered</Pill>
        <p className="text-ink-soft text-sm mt-4 italic">
          Aim for #2! The most popular answer wins zero.
        </p>
      </Card>
    </PageShell>
  ),
};

/**
 * Player viewing the reveal — RevealStage with `selfId` highlights the
 * player's group, then the cumulative leaderboard with movement arrows.
 */
export const Revealed: Story = {
  render: () => (
    <PageShell pts={0}>
      <div className="flex items-center justify-between mb-3 px-1">
        <Pill tone="mint">Question 1 of 8</Pill>
      </div>
      <RevealStage
        groups={mockGroupsTied}
        scores={mockScoresQ1}
        selfId={selfId}
        question="Name a toddler's favorite toy."
        skipAnimation
      />
      <Standings
        players={mockPlayers}
        scores={mockAllScores}
        currentQuestionId="q2"
        showMovement
        selfId={selfId}
        className="mt-6"
        title="Leaderboard"
      />
    </PageShell>
  ),
};

/** Player's final leaderboard — winner callout, you-rank summary. */
export const Finished_Leaderboard: Story = {
  name: "Finished — leaderboard",
  render: () => {
    const totals = mockTotals(mockAllScores);
    const sorted = [...mockPlayers].sort(
      (a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0),
    );
    const ranks = tieRanks(sorted, (p) => totals.get(p.id) ?? 0);
    const topScore = totals.get(sorted[0].id) ?? 0;
    const winners = sorted.filter((p) => (totals.get(p.id) ?? 0) === topScore);
    const winnerNames = joinNames(winners.map((w) => w.name));
    const verb = winners.length > 1 ? "win" : "wins";
    const youIdx = sorted.findIndex((p) => p.id === selfId);
    const youRank = ranks[youIdx];
    const iWon = winners.some((w) => w.id === selfId);
    return (
      <PageShell pts={totals.get(selfId) ?? 0}>
        <div className="text-center">
          <div className="text-7xl mb-2">🏆</div>
          <h1 className="font-display text-4xl font-bold mb-1">
            {winnerNames} {verb}!
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
                  <span className="flex-1 font-semibold truncate">
                    {p.name}
                  </span>
                  <span className="font-display text-xl font-bold">
                    {totals.get(p.id) ?? 0}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </PageShell>
    );
  },
};
