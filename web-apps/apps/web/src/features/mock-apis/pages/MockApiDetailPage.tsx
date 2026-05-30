import { Link, useParams, useLocation, Outlet } from "react-router";
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

export function MockApiDetailPage() {
  const { projectId, mockApiId } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [variables, setVariables] = useState<Variable[]>([]);
  const [globals, setGlobals] = useState<Variable[]>([]);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [variablesTab, setVariablesTab] = useState<
    "globals" | "constants" | "local"
  >("globals");

  if (!mockApiId || !projectId) {
    return <main className="page-content">Missing ID.</main>;
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
    queryKey: queryKeys.project(projectId),
    queryFn: () => getProject(projectId),
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
    <main className="page-content" style={{ padding: "0 1rem" }}>
      <section className="card" style={{ marginBottom: "1rem", padding: "1rem 1.5rem" }}>
        {mockApi.data && (
          <header className="page-header" style={{ marginBottom: "1.5rem", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>{mockApi.data.name}</h2>
            <button type="button" onClick={() => setVariablesOpen(true)} className="button secondary-btn">
               Edit variables
            </button>
          </header>
        )}

        {responses.isPending && <p>Loading responses...</p>}
        {responses.isError && <p className="error">{responses.error.message}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
           <h3 style={{ margin: 0, marginRight: "0.5rem", color: "#735F32", fontSize: "0.9rem" }}>responses</h3>
           {responses.data?.records.map((response) => {
             const isActive = location.pathname.includes(`/responses/${response.id}`);
             return (
               <Link
                 className={`button ${isActive ? "active" : "secondary-btn"}`}
                 to={`/projects/${projectId}/mock-apis/${mockApiId}/responses/${response.id}`}
                 key={response.id}
                 style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem", borderRadius: "4px" }}
               >
                 {response.name} {response.is_default && " (default)"}
               </Link>
             );
           })}
           <Link 
             className="button secondary-btn icon-btn" 
             to={`/projects/${projectId}/mock-apis/${mockApiId}/responses/new`}
             title="New Response"
             style={{ padding: "0.1rem 0.4rem", borderRadius: "4px" }}
           >
             +
           </Link>
        </div>
      </section>

      {location.pathname.endsWith(mockApiId) ? (
        responses.data && (
          <div className="grid" style={{ marginTop: "1rem" }}>
            <div className="card" style={{ background: "transparent" }}>
              <p className="eyebrow">Total responses</p>
              <h2>{responses.data.total}</h2>
            </div>
            <div className="card" style={{ background: "transparent" }}>
              <p className="eyebrow">Default response</p>
              <h2>
                {responses.data.records.find((response) => response.is_default)
                  ?.name ?? "Not set"}
              </h2>
            </div>
          </div>
        )
      ) : (
        <Outlet />
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
    </main>
  );
}