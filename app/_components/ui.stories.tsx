import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, Card, Input, Logo, Pill } from "./ui";

const meta: Meta = {
  title: "UI / Primitives",
};

export default meta;

type Story = StoryObj;

export const ButtonVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-3 max-w-md">
      <Button>Primary (default)</Button>
      <Button variant="soft">Soft</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
};

export const ButtonSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3 items-start">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const PillTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Pill tone="mint">Mint</Pill>
      <Pill tone="blush">Blush</Pill>
      <Pill tone="lavender">Lavender</Pill>
      <Pill tone="lemon">Lemon</Pill>
      <Pill tone="sky">Sky</Pill>
    </div>
  ),
};

export const LogoFull: Story = {
  render: () => <Logo />,
};

export const LogoCompact: Story = {
  render: () => <Logo compact />,
};

export const CardExample: Story = {
  render: () => (
    <Card className="max-w-md">
      <h2 className="font-display text-xl font-bold mb-2">A card</h2>
      <p className="text-ink-soft text-sm">
        Standard rounded-card surface with the soft shadow.
      </p>
    </Card>
  ),
};

export const InputDefault: Story = {
  render: () => (
    <div className="max-w-md">
      <Input placeholder="Type a name…" />
    </div>
  ),
};
