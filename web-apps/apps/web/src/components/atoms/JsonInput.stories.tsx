import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { JsonInput } from "./JsonInput";

const meta = {
  title: "Atoms/JsonInput",
  component: JsonInput,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof JsonInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EditableObject: Story = {
  args: {
    label: "Response body",
    value: "{}",
    onChange: () => {},
  },
  render: () => {
    const [value, setValue] = useState(
      JSON.stringify(
        {
          id: "{{globals.next_id}}",
          status: "created",
          request_id: "{{request.headers.x-request-id}}",
        },
        null,
        2,
      ),
    );

    return (
      <div style={{ width: "min(720px, calc(100vw - 2rem))" }}>
        <JsonInput label="Response body" value={value} onChange={setValue} />
      </div>
    );
  },
};

export const WithError: Story = {
  args: {
    label: "Rule expected value",
    value: "{ invalid",
    error: "Invalid JSON.",
    onChange: () => {},
  },
};
