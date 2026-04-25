import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Lobby } from "./Lobby";
import type { Player } from "@/lib/types";

const meta: Meta<typeof Lobby> = {
  title: "Game / Lobby",
  component: Lobby,
};

export default meta;

type Story = StoryObj<typeof Lobby>;

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

const samplePlayers: Player[] = [
  player("1", "Whisker", "🐱"),
  player("2", "Robo", "🐻"),
  player("3", "Doodle", "🥑"),
  player("4", "Plinko", "🧁"),
  player("5", "Sprout", "🌹"),
];

export const Empty: Story = {
  args: {
    players: [],
  },
};

export const SinglePlayer: Story = {
  args: {
    players: samplePlayers.slice(0, 1),
    selfId: "1",
  },
};

export const SmallRoom: Story = {
  args: {
    players: samplePlayers,
    selfId: "1",
  },
};

export const PackedRoom: Story = {
  args: {
    players: [
      ...samplePlayers,
      player("6", "Banjo", "🍒"),
      player("7", "Pip", "🐸"),
      player("8", "Mochi", "🎂"),
      player("9", "Zigzag", "🌙"),
      player("10", "Cosmo", "🐥"),
      player("11", "Twiggy", "🦋"),
      player("12", "Pebble", "🌻"),
    ],
    selfId: "5",
  },
};

export const HostView: Story = {
  args: {
    players: samplePlayers,
    onRemove: (p) => alert(`Would remove ${p.name}`),
  },
};
