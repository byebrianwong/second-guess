import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, Card, Logo, Pill } from "@/app/_components/ui";
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
  mockScoresQ2,
  mockTotals,
} from "./_mockData";

/**
 * "Page" stories for the host control panel — instead of mounting the
 * real /host/[code] page (which depends on Supabase realtime), we render
 * the same page composition with hardcoded mock data so each visual
 * state is reproducible for review and Chromatic snapshots.
 */
const meta: Meta = {
  title: "Pages / Host (in-game)",
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj;

const code = "YRVA";
const totalQuestions = 8;

function PageShell({
  compactHeader = false,
  showCompactCode = false,
  children,
}: {
  compactHeader?: boolean;
  showCompactCode?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 px-4 sm:px-6 py-6 max-w-3xl mx-auto w-full pb-32">
      <header className="flex items-center justify-between mb-4 gap-2">
        <Logo compact={compactHeader} />
        <div className="flex items-center gap-2 min-w-0">
          {showCompactCode && (
            <span className="h-9 px-3 rounded-pill flex items-center gap-1.5 text-sm font-bold tracking-widest bg-cream-deep/70 text-ink">
              {code}
            </span>
          )}
          <SoundToggle />
          <Pill tone="lavender">HOST</Pill>
        </div>
      </header>
      {children}
    </main>
  );
}

function RoomCodeCard({ className }: { className?: string }) {
  return (
    <Card className={`text-center ${className ?? ""}`}>
      <p className="text-xs uppercase tracking-widest text-ink-soft mb-1">
        Room code
      </p>
      <p className="font-display text-6xl font-bold tracking-[0.3em] text-blush-deep">
        {code}
      </p>
      <div className="mt-4 text-xs text-ink-soft">
        Send the link, or have players type{" "}
        <span className="font-bold text-ink">{code}</span> on the home page.
      </div>
    </Card>
  );
}

/** Host's pre-game lobby — code shown big, players ticking in, Start button. */
export const Lobby_State: Story = {
  name: "Lobby",
  render: () => (
    <PageShell>
      <RoomCodeCard className="mb-6" />
      <Lobby
        players={mockPlayers}
        onRemove={() => {
          /* no-op */
        }}
      />
      <div className="mt-8 flex flex-col items-center gap-2">
        <Button size="lg">Start the game →</Button>
        <p className="text-xs text-ink-soft">{totalQuestions} questions ready</p>
      </div>
      <div className="mt-10 flex justify-center">
        <button className="text-xs text-ink-soft underline underline-offset-4 hover:text-red-500 transition">
          Cancel this game
        </button>
      </div>
    </PageShell>
  ),
};

/**
 * Host during an open question — sticky Reveal button, live answer
 * groups with player attribution, and the player roster underneath.
 */
export const Active_OpenQuestion: Story = {
  name: "Active — open question",
  render: () => {
    const playerLookup = (() => {
      const totals = mockTotals(mockScoresQ1);
      const sorted = [...mockPlayers].sort(
        (a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0),
      );
      const ranks = tieRanks(sorted, (p) => totals.get(p.id) ?? 0);
      const lookup = new Map<string, { name: string; rank: number }>();
      sorted.forEach((p, i) =>
        lookup.set(p.id, { name: p.name, rank: ranks[i] }),
      );
      return lookup;
    })();
    const answeredPlayers = mockPlayers.slice(0, 6);
    const stillAnswering = mockPlayers.slice(6);
    return (
      <PageShell compactHeader showCompactCode>
        <div className="flex items-center justify-between mb-3 px-1">
          <Pill tone="mint">Question 2 of {totalQuestions}</Pill>
          <Pill tone="lemon">answering</Pill>
        </div>
        <Card className="mb-4">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-3">
            Name a Disney movie.
          </h2>
          <p className="text-center text-ink-soft mb-3 text-sm">
            6 of {mockPlayers.length} answered
          </p>
          <div className="h-3 bg-ink-faint/20 rounded-pill overflow-hidden">
            <div
              className="h-full bg-blush-deep rounded-pill"
              style={{ width: "75%" }}
            />
          </div>
        </Card>
        <div className="sticky top-2 z-30 mb-4 flex justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <Button size="lg">Reveal answers →</Button>
          </div>
        </div>
        <Card className="mb-4">
          <p className="text-center text-ink-soft text-xs mb-3">
            Group as you go. Tap two answers to merge (2nd name is kept)
          </p>
          <ul className="space-y-2">
            {[
              {
                key: "frozen",
                label: "Frozen",
                count: 3,
                attribution: ["Whisker (1)", "Robo (1)", "Doodle (1)"],
              },
              {
                key: "moana",
                label: "Moana",
                count: 2,
                attribution: ["Plinko (2)", "Sprout (2)"],
              },
              {
                key: "encanto",
                label: "Encanto",
                count: 1,
                attribution: ["Banjo (3)"],
              },
            ].map((g) => (
              <li
                key={g.key}
                className="p-3 rounded-2xl border-2 border-ink-faint/30 bg-white"
              >
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold flex-1 truncate">
                    {g.label}
                  </span>
                  <Pill tone="mint">×{g.count}</Pill>
                </div>
                <div className="mt-1 text-xs text-ink-soft truncate">
                  {g.attribution.join(", ")}
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="mb-4">
          <h3 className="font-display text-lg font-bold mb-2">Players</h3>
          <ul className="space-y-1.5 text-sm">
            {answeredPlayers.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="text-xl shrink-0">{p.avatar}</span>
                <span className="font-semibold w-24 sm:w-32 truncate">
                  {p.name}
                </span>
                <span className="font-mono text-ink truncate flex-1">
                  {p.id === "p1" || p.id === "p2" || p.id === "p3"
                    ? "Frozen"
                    : p.id === "p4" || p.id === "p5"
                      ? "Moana"
                      : "Encanto"}
                </span>
              </li>
            ))}
            {stillAnswering.map((p) => (
              <li key={p.id} className="flex items-center gap-2 opacity-60">
                <span className="text-xl shrink-0">{p.avatar}</span>
                <span className="font-semibold w-24 sm:w-32 truncate">
                  {p.name}
                </span>
                <span className="text-ink-faint italic flex-1">
                  …answering
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </PageShell>
    );
  },
};

/**
 * Host viewing the reveal — the same RevealStage component used on the
 * player side, plus the cumulative standings underneath.
 */
export const Active_Revealed: Story = {
  name: "Active — revealed",
  render: () => (
    <PageShell compactHeader showCompactCode>
      <div className="flex items-center justify-between mb-3 px-1">
        <Pill tone="mint">Question 2 of {totalQuestions}</Pill>
        <Pill tone="lemon">revealed</Pill>
      </div>
      <RevealStage
        groups={mockGroupsTied}
        scores={mockScoresQ1}
        question="Name a toddler's favorite toy."
        skipAnimation
      />
      <div className="mt-8 flex justify-center">
        <Button size="lg">Next question →</Button>
      </div>
      <Standings
        players={mockPlayers}
        scores={mockAllScores}
        currentQuestionId="q2"
        showMovement
        className="mt-10"
      />
      <Card className="mt-12 text-center">
        <p className="text-xs uppercase tracking-widest text-ink-soft mb-1">
          Room code
        </p>
        <p className="font-display text-5xl font-bold tracking-[0.3em] text-blush-deep">
          {code}
        </p>
      </Card>
      <div className="mt-6 flex justify-center">
        <button className="text-xs text-ink-soft underline underline-offset-4 hover:text-red-500 transition">
          End game & return to lobby
        </button>
      </div>
    </PageShell>
  ),
};

/** Host's final leaderboard — winner callout + standings. */
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
    return (
      <PageShell>
        <div className="text-center">
          <div className="text-7xl mb-2">🏆</div>
          <h1 className="font-display text-4xl font-bold mb-2">
            {winnerNames} {verb}!
          </h1>
          <p className="text-ink-soft mb-6">{topScore} points</p>
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
          <button className="mt-6 text-xs text-ink-soft underline underline-offset-4 hover:text-ink transition">
            Start a new game
          </button>
        </div>
      </PageShell>
    );
  },
};

// suppress unused-import lint when only used inside one story
void mockScoresQ2;
