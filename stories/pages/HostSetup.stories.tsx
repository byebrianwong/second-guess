import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import HostNewPage from "@/app/host/new/page";

const meta: Meta = {
  title: "Pages / Host setup",
  // appDirectory: true loads the App Router mock so useRouter() and
  // useSearchParams() resolve without throwing.
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  component: HostNewPage,
};

export default meta;
type Story = StoryObj;

/** /host/new — fresh host setup, default starter pack pre-loaded. */
export const Regular: Story = {};

/**
 * /host/new?party=1 — party mode opens with the BABY_SHOWER_PARTY pack
 * pre-loaded and a "BABY party setup" pill in the header.
 */
export const PartyMode: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { query: { party: "1" } },
    },
  },
};
