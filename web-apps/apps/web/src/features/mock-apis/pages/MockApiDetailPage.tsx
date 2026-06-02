import { Link, useParams, useLocation, Outlet } from "react-router";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import {
  VariablesEditor,
  VariablesViewer,
} from "../../../components/organisms/VariablesEditor";
import { useMockApiResponses } from "../../mock-api-responses/hooks/mock_api_response_hooks";
import type { Variable } from "../../projects/types";
import { useProject, useUpdateProject } from "../../projects/hooks/project_hooks";
import { useMockApi, useMockApis, useUpdateMockApi } from "../hooks/mock_api_hooks";

export function MockApiDetailPage() {
  const { projectId, mockApiId } = useParams();
  const location = useLocation();
  const [apiDropdownOpen, setApiDropdownOpen] = useState(false);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [globals, setGlobals] = useState<Variable[]>([]);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [variablesTab, setVariablesTab] = useState<
    "globals" | "constants" | "local"
  >("globals");

  if (!mockApiId || !projectId) {
    return <main className="page-content">Missing ID.</main>;
  }

  const mockApi = useMockApi(mockApiId);
  const mockApis = useMockApis(projectId);
  const responses = useMockApiResponses(mockApiId);
  const project = useProject(projectId);
  const updateMockApiMutation = useUpdateMockApi(mockApiId);
  const updateProjectMutation = useUpdateProject(projectId);

  useEffect(() => {
    setVariables(mockApi.data?.variables ?? []);
  }, [mockApi.data]);

  useEffect(() => {
    setGlobals(project.data?.globals ?? []);
  }, [project.data]);

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
                  <span className="pill">{mockApi.data.method}</span>
                  <span className="api-selector-name">{mockApi.data.name}</span>
                  <span aria-hidden="true">⌄</span>
                </button>
                {apiDropdownOpen && (
                  <div className="api-selector-list" role="listbox">
                    {mockApis.isPending && <p className="muted-text">Loading...</p>}
                    {mockApis.data?.records.map((api) => (
                      <Link
                        key={api.id}
                        to={`/projects/${projectId}/mock-apis/${api.id}`}
                        className={`api-selector-item ${api.id === mockApiId ? "active" : ""}`}
                        onClick={() => setApiDropdownOpen(false)}
                      >
                        <span className="pill">{api.method}</span>
                        <code className="path-text">{api.path}</code>
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
              <p>
                <code>{mockApi.data.path}</code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVariablesOpen(true)}
              className="button secondary-btn compact-action"
            >
              <SlidersHorizontal size={14} />
              Variables
            </button>
          </header>
        )}

        <div className="workspace-row response-strip">
           {responses.isPending && <span className="muted-text">Loading responses...</span>}
           {responses.isError && <span className="error">{responses.error.message}</span>}
           <span className="response-strip-label">Responses</span>
           {responses.data?.records.map((response) => {
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
        </div>

      {location.pathname.endsWith(mockApiId) ? (
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
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
