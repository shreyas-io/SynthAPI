import { Copy, Plus, Save, Trash2 } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button, ButtonAnchor, ButtonLink } from "./Button";

const meta = {
  title: "Atoms/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ display: "grid", gap: "1rem", minWidth: "520px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="purple">Purple</Button>
      <Button variant="success">Success</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      <Button variant="primary">
        <Save size={14} />
        Save response
      </Button>
      <Button variant="secondary" size="compact">
        <Copy size={14} />
        Copy curl
      </Button>
      <Button variant="purple" size="compact">
        <Plus size={14} />
        Add
      </Button>
      <Button variant="danger" size="icon" aria-label="Delete">
        <Trash2 size={14} />
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      <Button disabled>Primary disabled</Button>
      <Button variant="secondary" disabled>
        Secondary disabled
      </Button>
      <Button variant="danger" disabled>
        Danger disabled
      </Button>
    </div>
  ),
};

export const Navigation: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      <ButtonLink to="/projects/new">Internal link</ButtonLink>
      <ButtonAnchor href="https://example.com" target="_blank" rel="noreferrer">
        External anchor
      </ButtonAnchor>
    </div>
  ),
};
