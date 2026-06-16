import type { Meta, StoryObj } from "@storybook/react-vite";

import { SynthLogo } from "./SynthLogo";

const meta = {
  title: "Atoms/SynthLogo",
  component: SynthLogo,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: "grid",
          gap: "1.25rem",
          minWidth: "420px",
          padding: "2rem",
          background: "var(--color-bg)",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SynthLogo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HeaderLockup: Story = {
  args: {
    size: 28,
    showWordmark: true,
  },
};

export const MarkOnly: Story = {
  args: {
    size: 48,
    showWordmark: false,
  },
};

export const LargePreview: Story = {
  args: {
    size: 96,
    showWordmark: true,
  },
};

export const SizeRamp: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <SynthLogo size={24} showWordmark={false} />
      <SynthLogo size={32} showWordmark={false} />
      <SynthLogo size={48} showWordmark={false} />
      <SynthLogo size={64} showWordmark={false} />
      <SynthLogo size={32} />
    </div>
  ),
};
