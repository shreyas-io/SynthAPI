import { Link, useParams } from "react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../shared/api/query_keys";
import { VariablesEditor } from "../../../shared/components/VariablesEditor";
import { listMockApis } from "../../mock-apis/api/mock_apis_api";
import { getProject, updateProject } from "../api/projects_api";
import type { Variable } from "../types";

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [globals, setGlobals] = useState<Variable[]>([]);
  const [constants, setConstants] = useState<Variable[]>([]);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [variablesTab, setVariablesTab] = useState<"globals" | "constants">(
    "globals",
  );

  if (!projectId) {
    return <main className="page">Missing project ID.</main>;
  }

  const project = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => getProject(projectId),
  });
  const mockApis = useQuery({
    queryKey: queryKeys.mockApis(projectId),
    queryFn: () => listMockApis(projectId),
  });
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!project.data) throw new Error("Project is not loaded");

      return updateProject(projectId, {
        name: project.data.name,
        description: project.data.description,
        globals,
        constants,
      });
    },
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(projectId),
      });
    },
  });

  useEffect(() => {
    setGlobals(project.data?.globals ?? []);
    setConstants(project.data?.constants ?? []);
  }, [project.data]);

  return (
    <main className="page">
      {project.data && (
        <header className="page-header">
          <div>
            <p className="eyebrow">{project.data.slug}</p>
            <h1>{project.data.name}</h1>
            <p>{project.data.description}</p>
          </div>
          <Link className="button" to={`/projects/${projectId}/mock-apis/new`}>
            New mock API
          </Link>
        </header>
      )}

      {project.isError && <p className="error">{project.error.message}</p>}
      {project.data && (
        <section className="card variables-settings-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Variables</p>
              <h2>Project variables</h2>
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
                <h2>Project variables</h2>
              </div>
              <button type="button" onClick={() => setVariablesOpen(false)}>
                Close
              </button>
            </div>
            <nav className="editor-tabs" aria-label="Project variable tabs">
              <button
                className={variablesTab === "globals" ? "active" : ""}
                type="button"
                onClick={() => setVariablesTab("globals")}
              >
                Globals
              </button>
              <button
                className={variablesTab === "constants" ? "active" : ""}
                type="button"
                onClick={() => setVariablesTab("constants")}
              >
                Constants
              </button>
            </nav>
            {variablesTab === "globals" && (
              <VariablesEditor
                title="Globals"
                variables={globals}
                onChange={setGlobals}
              />
            )}
            {variablesTab === "constants" && (
              <VariablesEditor
                title="Constants"
                variables={constants}
                onChange={setConstants}
              />
            )}
            {updateMutation.isError && (
              <p className="error">{updateMutation.error.message}</p>
            )}
            <button
              type="button"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
            >
              Save variables
            </button>
          </section>
        </div>
      )}
      {mockApis.isPending && <p>Loading mock APIs...</p>}
      {mockApis.isError && <p className="error">{mockApis.error.message}</p>}
      {mockApis.data && (
        <section className="grid">
          {mockApis.data.records.map((mockApi) => (
            <Link className="card link-card" to={`/mock-apis/${mockApi.id}`} key={mockApi.id}>
              <span className="pill">{mockApi.method}</span>
              <h2>{mockApi.name}</h2>
              <code>{mockApi.path}</code>
              <p>{mockApi.description}</p>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
