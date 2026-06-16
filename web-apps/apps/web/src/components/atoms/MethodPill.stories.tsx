import type { Meta, StoryObj } from "@storybook/react-vite";

import { MethodPill } from "./MethodPill";

const meta = {
  title: "Atoms/MethodPill",
  component: MethodPill,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof MethodPill>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Methods: Story = {
  args: {
    method: "GET",
  },
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map(
        (method) => (
          <MethodPill key={method} method={method} />
        ),
      )}
    </div>
  ),
};
