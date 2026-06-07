import { Link, useParams } from "react-router";
import { AlertTriangle, RotateCcw, Settings2 } from "lucide-react";
import { MethodPill } from "../../../components/atoms/MethodPill";
import { useEffect, useState } from "react";

import { VariablesEditor } from "../../../components/organisms/VariablesEditor";
import { ResourceCard } from "../../../components/molecules/ResourceCard";
import {
  useDeleteMockApi,
  useDeletedMockApis,
  useMockApis,
  useRestoreMockApi,
} from "../../mock-apis/hooks/mock_api_hooks";
import { useProject, useUpdateProject } from "../hooks/project_hooks";
import type { Variable } from "../types";

type ApiTab = "active" | "deleted";

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const [globals, setGlobals] = useState<Variable[]>([]);
  const [constants, setConstants] = useState<Variable[]>([]);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [apiTab, setApiTab] = useState<ApiTab>("active");
  const [variablesTab, setVariablesTab] = useState<"globals" | "constants">(
    "globals",
  );

  if (!projectId) {
    return <main className="page-content">Missing project ID.</main>;
  }

  const project = useProject(projectId);
  const mockApis = useMockApis(projectId);
  const deletedMockApis = useDeletedMockApis(projectId);
  const deleteMockApi = useDeleteMockApi(projectId);
  const restoreMockApi = useRestoreMockApi(projectId);
  const updateMutation = useUpdateProject(projectId);
  const activeApis = mockApis.data?.records ?? [];
  const deletedApis = deletedMockApis.data?.records ?? [];

  const currentApis = apiTab === "active" ? mockApis : deletedMockApis;

  const saveVariables = () => {
      if (!project.data) throw new Error("Project is not loaded");

    updateMutation.mutate(
      {
        name: project.data.name,
        description: project.data.description,
        globals,
        constants,
      },
      {
        onSuccess() {
          setVariablesOpen(false);
        },
      },
    );
  };

  useEffect(() => {
    setGlobals(project.data?.globals ?? []);
    setConstants(project.data?.constants ?? []);
  }, [project.data]);

  return (
    <main className="page">
      {project.isError && <p className="error">{project.error.message}</p>}

      {project.data && (
        <>
          <header className="page-header">
            <div>
              <p className="eyebrow">Project</p>
              <h1>{project.data.name}</h1>
              {project.data.description && (
                <p className="muted-text">{project.data.description}</p>
              )}
            </div>
            <div className="toolbar-actions">
              <button
                type="button"
                className="button secondary-btn compact-action"
                onClick={() => setVariablesOpen(true)}
              >
                <Settings2 size={14} />
                Project Variables
              </button>
            </div>
          </header>

          {currentApis.isPending && <p>Loading APIs...</p>}
          {currentApis.isError && <p className="error">{currentApis.error.message}</p>}
          <>
            <div className="org-tabs">
              <button
                className={apiTab === "active" ? "active" : ""}
                onClick={() => setApiTab("active")}
              >
                Active
              </button>
              <button
                className={apiTab === "deleted" ? "active" : ""}
                onClick={() => setApiTab("deleted")}
              >
                Deleted
              </button>
            </div>

            {apiTab === "active" && (
              <section className="grid">
                {activeApis.map((api) => (
                  <ResourceCard
                    key={api.id}
                    to={`/projects/${projectId}/mock-apis/${api.id}`}
                    title={api.name}
                    onDelete={() => {
                      if (confirm(`Delete mock API "${api.name}"?`)) {
                        deleteMockApi.mutate(api.id);
                      }
                    }}
                    deleteDisabled={deleteMockApi.isPending}
                    deleteLabel={`Delete ${api.name}`}
                  >
                    <p>
                        <MethodPill method={api.method} />{" "}
                        <code>{api.path}</code>
                    </p>
                    {api.description && <p>{api.description}</p>}
                  </ResourceCard>
                ))}
                <Link
                  className="card link-card empty-card"
                  to={`/projects/${projectId}/mock-apis/new`}
                >
                  <h2 style={{ color: "var(--color-text-muted)" }}>+ New API</h2>
                </Link>
              </section>
            )}

            {apiTab === "deleted" && (
              <section className="profile-section">
                <div className="org-deleted-banner">
                  <AlertTriangle size={16} />
                  Deleted mock APIs are hidden from public mock traffic.
                </div>
                {deletedApis.length === 0 ? (
                  <p className="muted-text">No deleted mock APIs.</p>
                ) : (
                  <div className="org-list deleted-grid">
                    {deletedApis.map((api) => (
                      <div className="org-card card org-deleted" key={api.id}>
                        <div className="org-card-header">
                          <h3>{api.name}</h3>
                          <MethodPill method={api.method} />
                            </div>
                            <div className="org-card-meta">
                          <p>
                            <code>{api.path}</code>
                          </p>
                          <p>
                            <strong>Deleted:</strong>{" "}
                            {new Date(api.deleted_at!).toLocaleString()}
                          </p>
                        </div>
                        <div className="org-card-actions">
                          <button
                            type="button"
                            className="button secondary-btn compact-action"
                            onClick={() => restoreMockApi.mutate(api.id)}
                            disabled={restoreMockApi.isPending}
                          >
                            <RotateCcw size={14} />
                            Restore
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
          {deleteMockApi.isError && (
            <p className="error">Failed to delete mock API.</p>
          )}
          {restoreMockApi.isError && (
            <p className="error">Failed to restore mock API.</p>
          )}
        </>
      )}

      {variablesOpen && (
        <div className="variable-reference-modal-backdrop">
          <section className="variable-reference-modal card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Variables</p>
                <h2>Project variables</h2>
              </div>
              <button className="button secondary-btn" type="button" onClick={() => setVariablesOpen(false)}>
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
              className="button secondary-btn"
              type="button"
              disabled={updateMutation.isPending}
              onClick={saveVariables}
            >
              Save variables
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
