import { FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../shared/api/query_keys";
import { RuleTreeEditor } from "../../rule-tree-editor/components/RuleTreeEditor";
import { createMockApiResponse } from "../api/mock_api_responses_api";
import type { RuleTree } from "../types";

export function NewMockApiResponsePage() {
  const { mockApiId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [statusCode, setStatusCode] = useState(200);
  const [isDefault, setIsDefault] = useState(false);
  const [body, setBody] = useState("{\n  \"ok\": true\n}");
  const [ruleTree, setRuleTree] = useState<RuleTree | null>(null);
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof createMockApiResponse>[1]) => {
      if (!mockApiId) throw new Error("Missing mock API ID");
      return createMockApiResponse(mockApiId, input);
    },
    async onSuccess(response) {
      if (mockApiId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.mockApiResponses(mockApiId),
        });
      }
      navigate(`/mock-apis/${response.mock_api_id}`);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();

    mutation.mutate({
      name,
      is_default: isDefault,
      response: {
        status_code: statusCode,
        headers: { "content-type": "application/json" },
        cookies: {},
        body: {
          type: "json",
          value: JSON.parse(body),
        },
      },
      rule_tree: isDefault ? null : ruleTree,
      post_response_actions: [],
    });
  };

  return (
    <main className="page rule-editor-page">
      <form className="card form" onSubmit={submit}>
        <p className="eyebrow">New response</p>
        <h1>Create mock response</h1>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Status code
          <input
            type="number"
            value={statusCode}
            onChange={(e) => setStatusCode(Number(e.target.value))}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          Default response
        </label>
        <label>
          JSON body
          <textarea value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        {mutation.isError && <p className="error">{mutation.error.message}</p>}
        <button disabled={mutation.isPending || !mockApiId}>Create response</button>
      </form>

      {!isDefault && <RuleTreeEditor onChange={setRuleTree} />}
    </main>
  );
}
