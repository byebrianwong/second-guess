import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import HostNewPage from "@/app/host/new/page";

const meta: Meta = {
  title: "Pages / Host setup",
  parameters: { layout: "fullscreen" },
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
    nextjs: { navigation: { query: { party: "1" } } },
  },
};
