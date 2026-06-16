import type { Meta, StoryObj } from "@storybook/react-vite";

import { Avatar } from "./Avatar";

const meta = {
  title: "Atoms/Avatar",
  component: Avatar,
  parameters: {
    layout: "centered",
  },
  args: {
    label: "Ada Lovelace",
    src: null,
    className: "project-card-avatar",
    fallbackClassName: "project-card-avatar-fallback",
  },
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Fallback: Story = {};

export const Image: Story = {
  args: {
    src: "https://i.pravatar.cc/96?img=47",
    alt: "Ada Lovelace",
  },
};

export const MissingLabel: Story = {
  args: {
    label: "",
  },
};
