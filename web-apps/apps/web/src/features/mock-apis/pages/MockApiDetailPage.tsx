import { Link, useParams, useLocation, Outlet, useNavigate } from "react-router";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { MethodPill } from "../../../components/atoms/MethodPill";
import { useEffect, useState } from "react";

import { Button } from "../../../components/atoms/Button";
import {
  VariablesEditor,
  VariablesViewer,
} from "../../../components/organisms/VariablesEditor";
import {
  useDeletedMockApiResponses,
  useMockApiResponses,
  useRestoreMockApiResponse,
} from "../../mock-api-responses/hooks/mock_api_response_hooks";
import type { Variable } from "../../projects/types";
import { useProject, useUpdateProject } from "../../projects/hooks/project_hooks";
import { useMockApi, useMockApis, useUpdateMockApi } from "../hooks/mock_api_hooks";

type ResponseTab = "active" | "deleted";

export function MockApiDetailPage() {
  const { projectId, mockApiId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [apiDropdownOpen, setApiDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [globals, setGlobals] = useState<Variable[]>([]);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [responseTab, setResponseTab] = useState<ResponseTab>("active");
  const [variablesTab, setVariablesTab] = useState<
    "globals" | "constants" | "local"
  >("globals");

  if (!mockApiId || !projectId) {
    return <main className="page-content">Missing ID.</main>;
  }

  const mockApi = useMockApi(mockApiId);
  const mockApis = useMockApis(projectId);
  const responses = useMockApiResponses(mockApiId);
  const deletedResponsesQuery = useDeletedMockApiResponses(mockApiId);
  const restoreResponse = useRestoreMockApiResponse(mockApiId);
  const project = useProject(projectId);
  const updateMockApiMutation = useUpdateMockApi(mockApiId);
  const updateProjectMutation = useUpdateProject(projectId);

  useEffect(() => {
    setVariables(mockApi.data?.variables ?? []);
  }, [mockApi.data]);

  useEffect(() => {
    setGlobals(project.data?.globals ?? []);
  }, [project.data]);

  useEffect(() => {
    if (!mockApiId || !projectId || !responses.data?.records.length) return;
    const basePath = `/projects/${projectId}/mock-apis/${mockApiId}`;
    if (!location.pathname.endsWith(mockApiId)) return;

    const defaultResponse = responses.data.records.find((r) => r.is_default);
    if (defaultResponse) {
      navigate(`${basePath}/responses/${defaultResponse.id}`, { replace: true });
      return;
    }

    const lastResponseId = localStorage.getItem(`mock-api-last-response-${mockApiId}`);
    if (lastResponseId) {
      const lastResponse = responses.data.records.find((r) => r.id === lastResponseId);
      if (lastResponse) {
        navigate(`${basePath}/responses/${lastResponseId}`, { replace: true });
      }
    }
  }, [responses.data?.records, mockApiId, projectId, location.pathname, navigate]);

  useEffect(() => {
    const match = location.pathname.match(/\/responses\/([^/]+)$/);
    if (match && match[1] && mockApiId) {
      localStorage.setItem(`mock-api-last-response-${mockApiId}`, match[1]);
    }
  }, [location.pathname, mockApiId]);

  const activeApis = mockApis.data?.records ?? [];
  const activeResponses = responses.data?.records ?? [];
  const deletedResponses = deletedResponsesQuery.data?.records ?? [];
  const currentResponses = responseTab === "active" ? responses : deletedResponsesQuery;

  return (
    <main className="workspace-canvas">
        {mockApi.data && (
          <header className="workspace-row workspace-title-row">
            <div className="workspace-heading route-identity">
              <div className="api-selector">
                <button
                  type="button"
                  className="api-selector-toggle"
                  onClick={() => setApiDropdownOpen((v) => !v)}
                >
                  <span className="api-selector-name">{mockApi.data.name}</span>
                  <ChevronDown size={14} />
                </button>
                {apiDropdownOpen && (
                  <div className="api-selector-list" role="listbox">
                    {mockApis.isPending && <p className="muted-text">Loading...</p>}
                    {activeApis.map((api) => (
                      <Link
                        key={api.id}
                        to={`/projects/${projectId}/mock-apis/${api.id}`}
                        className={`api-selector-item ${api.id === mockApiId ? "active" : ""}`}
                        onClick={() => setApiDropdownOpen(false)}
                      >
                        <span>{api.name}</span>
                      </Link>
                    ))}
                    <Link
                      className="api-selector-item"
                      to={`/projects/${projectId}/mock-apis/new`}
                      onClick={() => setApiDropdownOpen(false)}
                    >
                      + New API
                    </Link>
                  </div>
                )}
              </div>
              <div className="route-meta">
                <MethodPill method={mockApi.data.method} />
                <code>{mockApi.data.path}</code>
              </div>
            </div>
            <div className="toolbar-actions">
              <Button
                variant="secondary"
                size="compact"
                className="copy-curl-action"
                disabled={!mockApi.data.curl_command}
                onClick={() => {
                  const curl = mockApi.data?.curl_command;
                  if (!curl) return;
                  void navigator.clipboard.writeText(curl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy curl"}
              </Button>
              <Button
                onClick={() => setVariablesOpen(true)}
                variant="secondary"
                size="compact"
                className="variables-action"
              >
                <SlidersHorizontal size={14} />
                Variables
              </Button>
            </div>
          </header>
        )}

        <div className="workspace-row response-strip">
          <span className="response-strip-label">Responses</span>
          <span className="response-status-toggle" aria-label="Response status">
            <button
              type="button"
              className={`response-status-tab ${
                responseTab === "active" ? "active" : ""
              }`}
              onClick={() => setResponseTab("active")}
            >
              Active
            </button>
            <button
              type="button"
              className={`response-status-tab ${
                responseTab === "deleted" ? "active" : ""
              }`}
              onClick={() => setResponseTab("deleted")}
            >
              Deleted
            </button>
          </span>
           {responseTab === "active" && (
             <>
             {currentResponses.isPending && <span className="muted-text">Loading responses...</span>}
             {currentResponses.isError && <span className="error">{currentResponses.error.message}</span>}
             {activeResponses.map((response) => {
               const isActive = location.pathname.includes(`/responses/${response.id}`);
               return (
                 <Link
                   className={`response-tab ${isActive ? "active" : ""}`}
                   to={`/projects/${projectId}/mock-apis/${mockApiId}/responses/${response.id}`}
                   key={response.id}
                 >
                   {response.name} {response.is_default && " (default)"}
                 </Link>
               );
             })}
             <Link 
               className="response-tab add-response-tab"
               to={`/projects/${projectId}/mock-apis/${mockApiId}/responses/new`}
               title="New Response"
             >
               +
             </Link>
             </>
           )}
        </div>

        {responseTab === "deleted" && (
          <section className="profile-section deleted-responses-section">
            <div className="org-deleted-banner">
              <AlertTriangle size={16} />
              Deleted responses are hidden from response matching.
            </div>
            {currentResponses.isPending && <p>Loading responses...</p>}
            {currentResponses.isError && <p className="error">{currentResponses.error.message}</p>}
            {deletedResponses.length === 0 ? (
              <p className="muted-text">No deleted responses.</p>
            ) : (
              <div className="org-list deleted-grid">
                {deletedResponses.map((response) => (
                  <div className="org-card card org-deleted" key={response.id}>
                    <div className="org-card-header">
                      <h3>{response.name}</h3>
                      {response.is_default && <span className="pill">Default</span>}
                    </div>
                    <div className="org-card-meta">
                      <p>
                        <strong>Deleted:</strong>{" "}
                        {new Date(response.deleted_at!).toLocaleString()}
                      </p>
                    </div>
                    <div className="org-card-actions">
                      <Button
                        variant="secondary"
                        size="compact"
                        onClick={() => restoreResponse.mutate(response.id)}
                        disabled={restoreResponse.isPending}
                      >
                        <RotateCcw size={14} />
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {restoreResponse.isError && (
              <p className="error">Failed to restore response.</p>
            )}
          </section>
        )}

      {responseTab === "deleted" ? (
        <section className="workspace-empty">
          <p>Select a response status or restore a deleted response.</p>
        </section>
      ) : location.pathname.endsWith(mockApiId) ? (
        <section className="workspace-empty">
          <p>Select or create a response.</p>
        </section>
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
              <Button variant="secondary" onClick={() => setVariablesOpen(false)}>
                Close
              </Button>
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
            <Button
              variant="secondary"
              disabled={
                updateMockApiMutation.isPending ||
                updateProjectMutation.isPending
              }
              onClick={() => {
                if (!mockApi.data || !project.data) return;

                updateMockApiMutation.mutate({
                  project_id: mockApi.data.project_id,
                  method: mockApi.data.method,
                  path: mockApi.data.path,
                  name: mockApi.data.name,
                  description: mockApi.data.description,
                  variables,
                });
                updateProjectMutation.mutate({
                  name: project.data.name,
                  description: project.data.description,
                  globals,
                  constants: project.data.constants ?? [],
                });
              }}
            >
              Save variables
            </Button>
          </section>
        </div>
      )}
    </main>
  );
}
