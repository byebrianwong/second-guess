import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import HomePage from "@/app/page";

const meta: Meta = {
  title: "Pages / Landing",
  // appDirectory tells the Next.js framework mock to provide the App
  // Router context (next/navigation). Without it, useRouter() throws
  // "invariant expected app router to be mounted" at render.
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  component: HomePage,
};

export default meta;
type Story = StoryObj;

/** /  — the entry page. Code field, Host link, solo link below. */
export const Default: Story = {};
