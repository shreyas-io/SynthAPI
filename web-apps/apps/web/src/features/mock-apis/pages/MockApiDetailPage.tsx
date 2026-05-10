import { useParams } from "react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../shared/api/query_keys";
import {
  VariablesEditor,
  VariablesViewer,
} from "../../../shared/components/VariablesEditor";
import { listMockApiResponses } from "../../mock-api-responses/api/mock_api_responses_api";
import type { Variable } from "../../projects/types";
import { getProject, updateProject } from "../../projects/api/projects_api";
import { getMockApi, updateMockApi } from "../api/mock_apis_api";
import { MockApiResponsePane } from "../components/MockApiResponsePane";

export function MockApiDetailPage() {
  const { mockApiId } = useParams();
  const queryClient = useQueryClient();
  const [variables, setVariables] = useState<Variable[]>([]);
  const [globals, setGlobals] = useState<Variable[]>([]);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [variablesTab, setVariablesTab] = useState<
    "globals" | "constants" | "local"
  >("globals");

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
  const project = useQuery({
    queryKey: queryKeys.project(mockApi.data?.project_id ?? ""),
    enabled: Boolean(mockApi.data?.project_id),
    queryFn: () => {
      if (!mockApi.data?.project_id) throw new Error("Missing project ID");

      return getProject(mockApi.data.project_id);
    },
  });
  const updateMockApiMutation = useMutation({
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
  const updateProjectMutation = useMutation({
    mutationFn: () => {
      if (!project.data) throw new Error("Project is not loaded");

      return updateProject(project.data.id, {
        name: project.data.name,
        description: project.data.description,
        globals,
        constants: project.data.constants ?? [],
      });
    },
    async onSuccess() {
      if (!project.data) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(project.data.id),
      });
    },
  });

  useEffect(() => {
    setVariables(mockApi.data?.variables ?? []);
  }, [mockApi.data]);

  useEffect(() => {
    setGlobals(project.data?.globals ?? []);
  }, [project.data]);

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
                onClick={() => setVariablesOpen(true)}
              >
                Edit variables
              </button>
            </div>
          </section>
        )}
        {variablesOpen && (
          <div className="variable-reference-modal-backdrop">
            <section className="variable-reference-modal card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Variables</p>
                  <h2>Mock API variables</h2>
                </div>
                <button type="button" onClick={() => setVariablesOpen(false)}>
                  Close
                </button>
              </div>
              <nav className="editor-tabs" aria-label="Mock API variable tabs">
                <button
                  className={variablesTab === "globals" ? "active" : ""}
                  type="button"
                  onClick={() => setVariablesTab("globals")}
                >
                  Project globals
                </button>
                <button
                  className={variablesTab === "constants" ? "active" : ""}
                  type="button"
                  onClick={() => setVariablesTab("constants")}
                >
                  Constants
                </button>
                <button
                  className={variablesTab === "local" ? "active" : ""}
                  type="button"
                  onClick={() => setVariablesTab("local")}
                >
                  Local variables
                </button>
              </nav>
              {variablesTab === "globals" && (
                <VariablesEditor
                  title="Project globals"
                  variables={globals}
                  onChange={setGlobals}
                />
              )}
              {variablesTab === "constants" && (
                <VariablesViewer
                  title="Constants"
                  variables={project.data?.constants}
                />
              )}
              {variablesTab === "local" && (
                <VariablesEditor
                  title="Local variables"
                  variables={variables}
                  onChange={setVariables}
                />
              )}
              {updateMockApiMutation.isError && (
                <p className="error">{updateMockApiMutation.error.message}</p>
              )}
              {updateProjectMutation.isError && (
                <p className="error">{updateProjectMutation.error.message}</p>
              )}
              <button
                type="button"
                disabled={
                  updateMockApiMutation.isPending ||
                  updateProjectMutation.isPending
                }
                onClick={() => {
                  updateMockApiMutation.mutate();
                  updateProjectMutation.mutate();
                }}
              >
                Save variables
              </button>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
