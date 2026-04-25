import type { Preview } from "@storybook/nextjs-vite";
import "../app/globals.css";
import "./fonts.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "cream",
      values: [
        { name: "cream", value: "#fff8f0" },
        { name: "white", value: "#ffffff" },
        { name: "dark", value: "#2a2438" },
      ],
    },
    layout: "padded",
    a11y: {
      test: "todo",
    },
  },
};

export default preview;
