import type { Preview } from "@storybook/react-vite";
import { MemoryRouter } from "react-router";

import "../src/index.css";

const preview: Preview = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
};

export default preview;
