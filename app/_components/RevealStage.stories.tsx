import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RevealStage } from "./RevealStage";
import type { AnswerGroup, RoundScore } from "@/lib/types";

const meta: Meta<typeof RevealStage> = {
  title: "Game / RevealStage",
  component: RevealStage,
  parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof RevealStage>;

function group(
  key: string,
  label: string,
  rawAnswers: { playerId: string; rawText: string }[],
): AnswerGroup {
  return { key, label, count: rawAnswers.length, rawAnswers };
}

function score(
  qid: string,
  pid: string,
  points: number,
  rank: number,
): RoundScore {
  return { question_id: qid, player_id: pid, points, rank_group: rank };
}

const fivePlayers = ["p1", "p2", "p3", "p4", "p5"];

const baseGroups: AnswerGroup[] = [
  group("lego", "Lego", [
    { playerId: "p1", rawText: "Lego" },
    { playerId: "p2", rawText: "Lego" },
    { playerId: "p3", rawText: "Legos" },
  ]),
  group("doll", "Doll", [{ playerId: "p4", rawText: "Doll" }]),
  group("teddy bear", "Teddy bear", [
    { playerId: "p5", rawText: "Teddy bear" },
  ]),
];

const baseScores: RoundScore[] = [
  score("q1", "p1", 0, 1),
  score("q1", "p2", 0, 1),
  score("q1", "p3", 0, 1),
  score("q1", "p4", 3, 2),
  score("q1", "p5", 3, 2),
];

/**
 * skipAnimation = true forces phase to "done" immediately so Chromatic
 * snapshots are deterministic and don't catch the in-flight reveal.
 */
export const Done: Story = {
  args: {
    groups: baseGroups,
    scores: baseScores,
    skipAnimation: true,
    question: "Name a toddler's favorite toy.",
  },
};

export const DoneWithSelf: Story = {
  args: {
    groups: baseGroups,
    scores: baseScores,
    selfId: "p4",
    skipAnimation: true,
    question: "Name a toddler's favorite toy.",
  },
};

export const TiesEverywhere: Story = {
  args: {
    groups: [
      group("lego", "Lego", [
        { playerId: "p1", rawText: "Lego" },
        { playerId: "p2", rawText: "Lego" },
      ]),
      group("doll", "Doll", [
        { playerId: "p3", rawText: "Doll" },
        { playerId: "p4", rawText: "Doll" },
      ]),
      group("ball", "Ball", [{ playerId: "p5", rawText: "Ball" }]),
    ],
    scores: [
      score("q1", "p1", 0, 1),
      score("q1", "p2", 0, 1),
      score("q1", "p3", 0, 1),
      score("q1", "p4", 0, 1),
      score("q1", "p5", 2, 3),
    ],
    selfId: "p3",
    skipAnimation: true,
    question: "Name a toddler's favorite toy.",
  },
};

export const FullFiveTier: Story = {
  args: {
    groups: [
      group("lego", "Lego", [
        { playerId: "p1", rawText: "Lego" },
        { playerId: "p2", rawText: "Lego" },
        { playerId: "p3", rawText: "Lego" },
        { playerId: "p4", rawText: "Lego" },
        { playerId: "p5", rawText: "Lego" },
      ]),
      group("doll", "Doll", Array.from({ length: 4 }, (_, i) => ({ playerId: `q${i}`, rawText: "Doll" }))),
      group("teddy", "Teddy bear", Array.from({ length: 3 }, (_, i) => ({ playerId: `r${i}`, rawText: "Teddy bear" }))),
      group("ball", "Ball", Array.from({ length: 2 }, (_, i) => ({ playerId: `s${i}`, rawText: "Ball" }))),
      group("book", "Book", [{ playerId: "t0", rawText: "Book" }]),
    ],
    scores: fivePlayers.map((p, i) => score("q1", p, i === 0 ? 0 : 0, 1)),
    selfId: "p1",
    skipAnimation: true,
    question: "Name a toddler's favorite toy.",
  },
};

export const SelfNotInTopFive: Story = {
  args: {
    groups: [
      group("lego", "Lego", [
        { playerId: "p1", rawText: "Lego" },
        { playerId: "p2", rawText: "Lego" },
      ]),
      group("doll", "Doll", [{ playerId: "p3", rawText: "Doll" }]),
      group("teddy", "Teddy bear", [{ playerId: "p4", rawText: "Teddy" }]),
      group("ball", "Ball", [{ playerId: "p5", rawText: "Ball" }]),
      group("book", "Book", [{ playerId: "p6", rawText: "Book" }]),
      group("xylophone", "Xylophone", [{ playerId: "self", rawText: "Xylophone" }]),
    ],
    scores: [
      score("q1", "self", 0, 6),
    ],
    selfId: "self",
    skipAnimation: true,
    question: "Name a toddler's favorite toy.",
  },
};
