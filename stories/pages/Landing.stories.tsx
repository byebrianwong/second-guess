import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import HomePage from "@/app/page";

const meta: Meta = {
  title: "Pages / Landing",
  parameters: { layout: "fullscreen" },
  component: HomePage,
};

export default meta;
type Story = StoryObj;

/** /  — the entry page. Code field, Host link, solo link below. */
export const Default: Story = {};
