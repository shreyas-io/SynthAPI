import type { Meta, StoryObj } from "@storybook/react-vite";

import { MethodPill } from "../atoms/MethodPill";
import { ResourceCard } from "./ResourceCard";

const meta = {
  title: "Molecules/ResourceCard",
  component: ResourceCard,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "min(360px, calc(100vw - 2rem))" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ResourceCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Project: Story = {
  args: {
    to: "/projects/project-1",
    title: "Payments sandbox",
    children: (
      <>
        <p>Mock payment authorization, capture, and refund flows.</p>
        <div className="project-card-meta">
          <span>Created by Platform Team</span>
          <span aria-hidden="true">·</span>
          <span>Created 6/16/2026</span>
        </div>
      </>
    ),
  },
};

export const MockApi: Story = {
  args: {
    to: "/projects/project-1/mock-apis/api-1",
    title: "Create payment",
    deleteLabel: "Delete Create payment",
    onDelete: () => {},
    children: (
      <>
        <p>
          <MethodPill method="POST" /> <code>/payments</code>
        </p>
        <p>Returns approved, declined, and validation-error responses.</p>
      </>
    ),
  },
};
