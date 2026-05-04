import type { AnswerGroup, Player, RoundScore } from "@/lib/types";

const now = new Date().toISOString();

export function player(id: string, name: string, avatar: string): Player {
  return {
    id,
    game_id: "demo",
    name,
    avatar,
    joined_at: now,
    last_seen_at: now,
  };
}

export function score(
  questionId: string,
  playerId: string,
  points: number,
  rank: number,
): RoundScore {
  return { question_id: questionId, player_id: playerId, points, rank_group: rank };
}

export function group(
  key: string,
  label: string,
  rawAnswers: { playerId: string; rawText: string }[],
): AnswerGroup {
  return { key, label, count: rawAnswers.length, rawAnswers };
}

export const mockPlayers: Player[] = [
  player("p1", "Whisker", "🐱"),
  player("p2", "Robo", "🐻"),
  player("p3", "Doodle", "🥑"),
  player("p4", "Plinko", "🧁"),
  player("p5", "Sprout", "🌹"),
  player("p6", "Banjo", "🍒"),
  player("p7", "Pip", "🐸"),
  player("p8", "Mochi", "🎂"),
];

export const mockGroupsTied: AnswerGroup[] = [
  group("lego", "Lego", [
    { playerId: "p1", rawText: "Lego" },
    { playerId: "p2", rawText: "Lego" },
    { playerId: "p3", rawText: "Legos" },
  ]),
  group("doll", "Doll", [
    { playerId: "p4", rawText: "Doll" },
    { playerId: "p5", rawText: "Doll" },
  ]),
  group("teddy bear", "Teddy bear", [{ playerId: "p6", rawText: "Teddy bear" }]),
  group("ball", "Ball", [{ playerId: "p7", rawText: "Ball" }]),
  group("book", "Book", [{ playerId: "p8", rawText: "Book" }]),
];

export const mockScoresQ1: RoundScore[] = [
  score("q1", "p1", 0, 1),
  score("q1", "p2", 0, 1),
  score("q1", "p3", 0, 1),
  score("q1", "p4", 3, 2),
  score("q1", "p5", 3, 2),
  score("q1", "p6", 2, 3),
  score("q1", "p7", 1, 4),
  score("q1", "p8", 0, 5),
];

export const mockScoresQ2: RoundScore[] = [
  score("q2", "p1", 3, 2),
  score("q2", "p2", 0, 1),
  score("q2", "p3", 2, 3),
  score("q2", "p4", 0, 1),
  score("q2", "p5", 1, 4),
  score("q2", "p6", 3, 2),
  score("q2", "p7", 0, 1),
  score("q2", "p8", 0, 1),
];

export const mockAllScores: RoundScore[] = [...mockScoresQ1, ...mockScoresQ2];

export function mockTotals(scores: RoundScore[]): Map<string, number> {
  const t = new Map<string, number>();
  for (const s of scores)
    t.set(s.player_id, (t.get(s.player_id) ?? 0) + s.points);
  return t;
}
