import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { Variable } from "../../features/projects/types";
import { VariablesEditor, VariablesViewer } from "./VariablesEditor";

const variablesFixture: Variable[] = [
  { name: "next_id", type: "number", value: 42 },
  {
    name: "users",
    type: "array",
    value: [
      { id: 40, name: "Ada" },
      { id: 41, name: "Grace" },
    ],
  },
  { name: "feature_flag", type: "boolean", value: true },
];

const meta = {
  title: "Organisms/Variables",
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "min(760px, calc(100vw - 2rem))" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Editor: Story = {
  render: () => {
    const [variables, setVariables] = useState<Variable[]>(variablesFixture);

    return (
      <VariablesEditor
        title="Project globals"
        variables={variables}
        onChange={setVariables}
      />
    );
  },
};

export const Viewer: Story = {
  render: () => (
    <VariablesViewer title="Constants" prefix="" variables={variablesFixture} />
  ),
};
