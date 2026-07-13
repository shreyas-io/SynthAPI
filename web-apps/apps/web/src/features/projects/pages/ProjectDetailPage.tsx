import { Link, useParams } from "react-router";
import {
  AlertTriangle,
  Copy,
  KeyRound,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
} from "lucide-react";
import { ImportOpenApiModal } from "../components/ImportOpenApiModal";
import { MethodPill } from "../../../components/atoms/MethodPill";
import { useEffect, useState } from "react";

import { Button } from "../../../components/atoms/Button";
import { VariablesEditor } from "../../../components/organisms/VariablesEditor";
import { ResourceCard } from "../../../components/molecules/ResourceCard";
import {
  useDeleteMockApi,
  useDeletedMockApis,
  useMockApis,
  useRestoreMockApi,
} from "../../mock-apis/hooks/mock_api_hooks";
import {
  useCreateProjectApiKey,
  useProject,
  useProjectApiKeys,
  useRevokeProjectApiKey,
  useUpdateProject,
} from "../hooks/project_hooks";
import type { CreatedProjectApiKey, Variable } from "../types";

type ApiTab = "active" | "deleted";

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const [globals, setGlobals] = useState<Variable[]>([]);
  const [constants, setConstants] = useState<Variable[]>([]);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [createdApiKey, setCreatedApiKey] =
    useState<CreatedProjectApiKey | null>(null);
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
  const projectApiKeys = useProjectApiKeys(projectId);
  const createProjectApiKey = useCreateProjectApiKey(projectId);
  const revokeProjectApiKey = useRevokeProjectApiKey(projectId);
  const activeApis = mockApis.data?.records ?? [];
  const deletedApis = deletedMockApis.data?.records ?? [];
  const apiKeys = projectApiKeys.data ?? [];

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

  const createApiKey = () => {
    const name = newApiKeyName.trim();

    if (!name) return;

    createProjectApiKey.mutate(
      { name },
      {
        onSuccess(data) {
          setCreatedApiKey(data);
          setNewApiKeyName("");
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
              <Button
                variant="secondary"
                size="compact"
                onClick={() => setApiKeysOpen(true)}
              >
                <KeyRound size={14} />
                Project API Keys
              </Button>
              <Button
                variant="secondary"
                size="compact"
                onClick={() => setVariablesOpen(true)}
              >
                <Settings2 size={14} />
                Project Variables
              </Button>
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
                <button
                  className="card link-card empty-card"
                  onClick={() => setImportModalOpen(true)}
                  style={{ background: "transparent", border: "1px dashed var(--color-border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <h2 style={{ color: "var(--color-text-muted)" }}>Import OpenAPI</h2>
                </button>
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
                          <Button
                            variant="secondary"
                            size="compact"
                            onClick={() => restoreMockApi.mutate(api.id)}
                            disabled={restoreMockApi.isPending}
                          >
                            <RotateCcw size={14} />
                            Restore
                          </Button>
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

      {apiKeysOpen && (
        <div className="variable-reference-modal-backdrop">
          <section className="variable-reference-modal project-api-keys-modal card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Access</p>
                <h2>Project API keys</h2>
                <p className="muted-text">
                  {apiKeys.length > 0
                    ? "Public mock routes require x-synthapi-project-key."
                    : "No active keys. Public mock routes are currently unprotected."}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setApiKeysOpen(false);
                  setCreatedApiKey(null);
                }}
              >
                Close
              </Button>
            </div>

            {createdApiKey && (
              <div className="project-api-key-secret">
                <div>
                  <p className="eyebrow">New key</p>
                  <p className="muted-text">
                    This key is shown once. Store it before closing.
                  </p>
                </div>
                <code>{createdApiKey.api_key}</code>
                <Button
                  variant="secondary"
                  size="compact"
                  onClick={() =>
                    void navigator.clipboard?.writeText(createdApiKey.api_key)
                  }
                >
                  <Copy size={14} />
                  Copy
                </Button>
              </div>
            )}

            <div className="project-api-key-create">
              <input
                value={newApiKeyName}
                onChange={(event) => setNewApiKeyName(event.target.value)}
                placeholder="Key name"
                maxLength={100}
              />
              <Button
                variant="secondary"
                onClick={createApiKey}
                disabled={!newApiKeyName.trim() || createProjectApiKey.isPending}
              >
                <Plus size={14} />
                Create key
              </Button>
            </div>

            {createProjectApiKey.isError && (
              <p className="error">{createProjectApiKey.error.message}</p>
            )}
            {revokeProjectApiKey.isError && (
              <p className="error">{revokeProjectApiKey.error.message}</p>
            )}

            {projectApiKeys.isPending && <p>Loading API keys...</p>}
            {projectApiKeys.isError && (
              <p className="error">{projectApiKeys.error.message}</p>
            )}

            {!projectApiKeys.isPending && apiKeys.length === 0 && (
              <p className="muted-text">Create a key to protect this project.</p>
            )}

            {apiKeys.length > 0 && (
              <div className="project-api-key-list">
                {apiKeys.map((key) => (
                  <div className="project-api-key-row" key={key.id}>
                    <div>
                      <strong>{key.name}</strong>
                      <p className="muted-text">
                        {key.key_prefix}...{key.key_suffix}
                      </p>
                    </div>
                    <span className="muted-text">
                      {new Date(key.created_at).toLocaleString()}
                    </span>
                    <Button
                      variant="danger"
                      size="compact"
                      onClick={() => {
                        if (confirm(`Revoke API key "${key.name}"?`)) {
                          revokeProjectApiKey.mutate(key.id);
                        }
                      }}
                      disabled={revokeProjectApiKey.isPending}
                    >
                      <Trash2 size={14} />
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {variablesOpen && (
        <div className="variable-reference-modal-backdrop">
          <section className="variable-reference-modal card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Variables</p>
                <h2>Project variables</h2>
              </div>
              <Button variant="secondary" onClick={() => setVariablesOpen(false)}>
                Close
              </Button>
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
                description="Globals are variables scoped to the entire project. Their values persist across all API calls and can be updated by any API route during execution."
                variables={globals}
                onChange={setGlobals}
              />
            )}
            {variablesTab === "constants" && (
              <VariablesEditor
                title="Constants"
                description="Constants are read-only values scoped to the entire project. They cannot be modified during execution, making them perfect for API keys, base URLs, or configuration."
                variables={constants}
                onChange={setConstants}
              />
            )}
            {updateMutation.isError && (
              <p className="error">{updateMutation.error.message}</p>
            )}
            <Button
              variant="secondary"
              disabled={updateMutation.isPending}
              onClick={saveVariables}
            >
              Save variables
            </Button>
          </section>
        </div>
      )}

      {importModalOpen && (
        <ImportOpenApiModal
          projectId={projectId}
          onClose={() => setImportModalOpen(false)}
        />
      )}
    </main>
  );
}
