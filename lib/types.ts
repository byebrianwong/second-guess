export type GameStatus = "lobby" | "active" | "finished";
export type QuestionState =
  | "pending"
  | "open"
  | "closed"
  | "reviewing"
  | "revealed";

export interface Game {
  id: string;
  code: string;
  host_secret: string;
  status: GameStatus;
  current_round: number;
  theme: string;
  created_at: string;
  ended_at: string | null;
}

export interface Question {
  id: string;
  game_id: string;
  position: number;
  prompt: string;
  state: QuestionState;
  opened_at: string | null;
  closed_at: string | null;
}

export interface Player {
  id: string;
  game_id: string;
  name: string;
  avatar: string;
  joined_at: string;
  last_seen_at: string;
}

export interface Answer {
  id: string;
  question_id: string;
  player_id: string;
  raw_text: string;
  normalized: string;
  group_key: string | null;
  submitted_at: string;
}

export interface RoundScore {
  question_id: string;
  player_id: string;
  points: number;
  rank_group: number | null;
}

export interface AnswerGroup {
  key: string;
  label: string;
  count: number;
  rawAnswers: { playerId: string; rawText: string }[];
}
