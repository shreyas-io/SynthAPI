import type { Meta, StoryObj } from "@storybook/react-vite";

import { MockApiResponseEditor } from "./MockApiResponseEditor";
import type { MockApiResponse } from "../types";

const responseFixture: MockApiResponse = {
  id: "response-1",
  mock_api_id: "mock-api-1",
  name: "Created",
  is_default: true,
  response: {
    status_code: 201,
    headers: {
      "content-type": "application/json",
      "x-mock-source": "synthapi",
    },
    cookies: {
      checkout_session: "{{request.body.value.session_id}}",
    },
    body: {
      type: "json",
      value: {
        id: "{{globals.next_id}}",
        status: "created",
        customer_id: "{{request.body.value.customer_id}}",
      },
    },
  },
  rule_tree: null,
  post_response_actions: [
    {
      type: "increment",
      scope: "global",
      key: "next_id",
      amount: 1,
      order: 1,
    },
    {
      type: "append",
      scope: "global",
      key: "payments",
      value: {
        id: "{{globals.next_id}}",
        amount: "{{request.body.value.amount}}",
      },
      order: 2,
    },
  ],
  deleted_at: null,
};

const conditionalResponseFixture: MockApiResponse = {
  ...responseFixture,
  id: "response-2",
  name: "Missing authorization",
  is_default: false,
  response: {
    status_code: 401,
    headers: {
      "content-type": "application/json",
    },
    cookies: {},
    body: {
      type: "json",
      value: {
        error: "missing_authorization",
        message: "Authorization header is required.",
      },
    },
  },
  rule_tree: {
    label: "Unauthorized",
    type: "and",
    predicates: [
      {
        label: "Authorization header is missing",
        type: "simple",
        actual: "{{request.headers.authorization}}",
        operator: "is_not_set",
      },
    ],
    children: [],
  },
  post_response_actions: [],
};

const meta = {
  title: "Mock APIs/MockApiResponseEditor",
  component: MockApiResponseEditor,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: "100vh", padding: "1rem" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    mockApiId: "mock-api-1",
    submitLabel: "Save response",
    isPending: false,
    onSubmit: () => {},
  },
} satisfies Meta<typeof MockApiResponseEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DefaultResponse: Story = {
  args: {
    initialResponse: responseFixture,
  },
};

export const ConditionalResponse: Story = {
  args: {
    initialResponse: conditionalResponseFixture,
  },
};

export const NewResponse: Story = {
  args: {
    submitLabel: "Create response",
  },
};
