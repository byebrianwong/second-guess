import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Standings } from "./Standings";
import type { Player, RoundScore } from "@/lib/types";

const meta: Meta<typeof Standings> = {
  title: "Game / Standings",
  component: Standings,
};

export default meta;

type Story = StoryObj<typeof Standings>;

const now = new Date().toISOString();
function player(id: string, name: string, avatar: string): Player {
  return {
    id,
    game_id: "demo",
    name,
    avatar,
    joined_at: now,
    last_seen_at: now,
  };
}
function score(qid: string, pid: string, points: number, rank: number): RoundScore {
  return { question_id: qid, player_id: pid, points, rank_group: rank };
}

const players: Player[] = [
  player("1", "Whisker", "🐱"),
  player("2", "Robo", "🐻"),
  player("3", "Doodle", "🥑"),
  player("4", "Plinko", "🧁"),
];

export const FirstRoundNoMovement: Story = {
  args: {
    players,
    scores: [
      score("q1", "1", 3, 2),
      score("q1", "2", 0, 1),
      score("q1", "3", 0, 1),
      score("q1", "4", 2, 3),
    ],
    currentQuestionId: "q1",
    showMovement: true,
    title: "Standings",
  },
};

export const MidGameWithMovement: Story = {
  args: {
    players,
    scores: [
      // q1: Whisker leads
      score("q1", "1", 3, 2),
      score("q1", "2", 0, 1),
      score("q1", "3", 0, 1),
      score("q1", "4", 2, 3),
      // q2: Robo passes Whisker
      score("q2", "1", 0, 1),
      score("q2", "2", 3, 2),
      score("q2", "3", 2, 3),
      score("q2", "4", 1, 4),
    ],
    currentQuestionId: "q2",
    showMovement: true,
    title: "Standings",
  },
};

export const TiedAtTop: Story = {
  args: {
    players,
    scores: [
      score("q1", "1", 3, 2),
      score("q1", "2", 3, 2),
      score("q1", "3", 0, 1),
      score("q1", "4", 2, 3),
      score("q2", "1", 0, 1),
      score("q2", "2", 0, 1),
      score("q2", "3", 3, 2),
      score("q2", "4", 0, 1),
    ],
    currentQuestionId: "q2",
    showMovement: true,
    title: "Standings",
  },
};

export const PlayerView: Story = {
  args: {
    players,
    scores: [
      score("q1", "1", 3, 2),
      score("q1", "2", 0, 1),
      score("q1", "3", 0, 1),
      score("q1", "4", 2, 3),
      score("q2", "1", 0, 1),
      score("q2", "2", 3, 2),
      score("q2", "3", 2, 3),
      score("q2", "4", 1, 4),
    ],
    currentQuestionId: "q2",
    showMovement: true,
    selfId: "1",
    title: "Leaderboard",
  },
};
