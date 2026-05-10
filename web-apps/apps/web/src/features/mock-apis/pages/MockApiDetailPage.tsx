import { useParams } from "react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../shared/api/query_keys";
import { VariablesEditor } from "../../../shared/components/VariablesEditor";
import { listMockApiResponses } from "../../mock-api-responses/api/mock_api_responses_api";
import type { Variable } from "../../projects/types";
import { getMockApi, updateMockApi } from "../api/mock_apis_api";
import { MockApiResponsePane } from "../components/MockApiResponsePane";

export function MockApiDetailPage() {
  const { mockApiId } = useParams();
  const queryClient = useQueryClient();
  const [variables, setVariables] = useState<Variable[]>([]);

  if (!mockApiId) {
    return <main className="page">Missing mock API ID.</main>;
  }

  const mockApi = useQuery({
    queryKey: queryKeys.mockApi(mockApiId),
    queryFn: () => getMockApi(mockApiId),
  });
  const responses = useQuery({
    queryKey: queryKeys.mockApiResponses(mockApiId),
    queryFn: () => listMockApiResponses(mockApiId),
  });
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!mockApi.data) throw new Error("Mock API is not loaded");

      return updateMockApi(mockApiId, {
        project_id: mockApi.data.project_id,
        method: mockApi.data.method,
        path: mockApi.data.path,
        name: mockApi.data.name,
        description: mockApi.data.description,
        variables,
      });
    },
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mockApi(mockApiId),
      });
    },
  });

  useEffect(() => {
    setVariables(mockApi.data?.variables ?? []);
  }, [mockApi.data]);

  return (
    <main className="page mock-api-workspace">
      <MockApiResponsePane mockApiId={mockApiId} />

      <section className="mock-api-main-panel card">
        {mockApi.data && (
          <>
            <p className="eyebrow">
              {mockApi.data.method} {mockApi.data.path}
            </p>
            <h1>{mockApi.data.name}</h1>
            <p>{mockApi.data.description}</p>
          </>
        )}
        {responses.data && (
          <div className="grid">
            <div>
              <p className="eyebrow">Total responses</p>
              <h2>{responses.data.total}</h2>
            </div>
            <div>
              <p className="eyebrow">Default response</p>
              <h2>
                {responses.data.records.find((response) => response.is_default)
                  ?.name ?? "Not set"}
              </h2>
            </div>
          </div>
        )}
        {mockApi.data && (
          <section className="variables-settings-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Variables</p>
                <h2>Mock API variables</h2>
              </div>
              <button
                type="button"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate()}
              >
                Save variables
              </button>
            </div>
            {updateMutation.isError && (
              <p className="error">{updateMutation.error.message}</p>
            )}
            <VariablesEditor
              title="Local variables"
              variables={variables}
              onChange={setVariables}
            />
          </section>
        )}
      </section>
    </main>
  );
}
