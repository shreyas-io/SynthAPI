import { Link, useParams } from "react-router";
import { Settings2 } from "lucide-react";
import { useEffect, useState } from "react";

import { VariablesEditor } from "../../../components/organisms/VariablesEditor";
import { useMockApis } from "../../mock-apis/hooks/mock_api_hooks";
import { useProject, useUpdateProject } from "../hooks/project_hooks";
import type { Variable } from "../types";

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const [globals, setGlobals] = useState<Variable[]>([]);
  const [constants, setConstants] = useState<Variable[]>([]);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [variablesTab, setVariablesTab] = useState<"globals" | "constants">(
    "globals",
  );

  if (!projectId) {
    return <main className="page-content">Missing project ID.</main>;
  }

  const project = useProject(projectId);
  const mockApis = useMockApis(projectId);
  const updateMutation = useUpdateProject(projectId);

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
    <main className="workspace-canvas">
      {project.isError && <p className="error">{project.error.message}</p>}

      {project.data && (
        <>
          <header className="workspace-row workspace-title-row">
            <div className="workspace-heading">
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

          <section className="dense-page-content">
            {mockApis.isPending && <p>Loading APIs...</p>}
            {mockApis.isError && <p className="error">{mockApis.error.message}</p>}
            {mockApis.data && (
              <section className="grid">
                {mockApis.data.records.map((api) => (
                  <Link
                    className="card link-card"
                    to={`/projects/${projectId}/mock-apis/${api.id}`}
                    key={api.id}
                  >
                    <h2>{api.name}</h2>
                    <p>
                      <span className="pill">{api.method}</span>{" "}
                      <code>{api.path}</code>
                    </p>
                    {api.description && <p>{api.description}</p>}
                  </Link>
                ))}
                <Link
                  className="card link-card empty-card"
                  to={`/projects/${projectId}/mock-apis/new`}
                >
                  <h2 style={{ color: "var(--color-text-muted)" }}>+ New API</h2>
                </Link>
              </section>
            )}
          </section>
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
