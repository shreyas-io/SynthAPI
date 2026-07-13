import { Link, useParams, useLocation, Outlet, useNavigate } from "react-router";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  RotateCcw,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useReorderMockApiResponses } from "../../mock-api-responses/hooks/mock_api_response_hooks";

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


function SortableResponseItem({ response, isActive, mockApiId, projectId }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: response.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={`response-sidebar-item ${isActive ? "active" : ""}`}>
      <div className="drag-handle" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </div>
      <Link to={`/projects/${projectId}/mock-apis/${mockApiId}/responses/${response.id}`} className="response-link">
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{response.name}</span>
        {response.is_default && <span className="pill" style={{ flexShrink: 0 }}>Default</span>}
      </Link>
    </div>
  );
}

export function MockApiDetailPage() {
  const { projectId, mockApiId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [apiDropdownOpen, setApiDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [globals, setGlobals] = useState<Variable[]>([]);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [variablesTab, setVariablesTab] = useState<
    "globals" | "constants" | "local"
  >("local");

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
  const reorderResponses = useReorderMockApiResponses(mockApiId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = activeResponses.findIndex((r) => r.id === active.id);
      const newIndex = activeResponses.findIndex((r) => r.id === over.id);
      const newOrder = arrayMove(activeResponses, oldIndex, newIndex);
      reorderResponses.mutate(newOrder.map(r => r.id));
    }
  }


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
  const [responseTab, setResponseTab] = useState<ResponseTab>("active");
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

        <div className="workspace-content-with-sidebar">
          <aside className="response-sidebar" style={{ width: sidebarCollapsed ? "48px" : "320px", transition: "width 0.2s ease" }}>
            {sidebarCollapsed ? (
              <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}
                  onClick={() => setSidebarCollapsed(false)}
                  title="Expand sidebar"
                >
                  <PanelLeftOpen size={18} />
                </button>
              </div>
            ) : (
              <>
                <div className="editor-tabs" style={{ padding: '16px 16px 0', borderBottom: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <button
                      type="button"
                      className={responseTab === "active" ? "active" : ""}
                      onClick={() => setResponseTab("active")}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      className={responseTab === "deleted" ? "active" : ""}
                      onClick={() => setResponseTab("deleted")}
                    >
                      Deleted
                    </button>
                  </div>
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}
                    onClick={() => setSidebarCollapsed(true)}
                    title="Collapse sidebar"
                  >
                    <PanelLeftClose size={18} />
                  </button>
                </div>

                <div className="sidebar-content">
                  {responseTab === "active" && (
                    <>
                      <div className="sidebar-actions">
                        <Button variant="secondary" size="compact" onClick={() => navigate(`/projects/${projectId}/mock-apis/${mockApiId}/responses/new`)}>
                          + New Response
                        </Button>
                      </div>
                      {currentResponses.isPending && <span className="muted-text">Loading...</span>}
                      {currentResponses.isError && <span className="error">{currentResponses.error.message}</span>}
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={activeResponses.map((r) => r.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="response-list">
                            {activeResponses.map((response) => (
                              <SortableResponseItem
                                key={response.id}
                                response={response}
                                isActive={location.pathname.includes(`/responses/${response.id}`)}
                                projectId={projectId!}
                                mockApiId={mockApiId!}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </>
                  )}

                  {responseTab === "deleted" && (
                    <div className="deleted-list">
                      {currentResponses.isPending && <p>Loading...</p>}
                      {deletedResponses.length === 0 ? (
                        <p className="muted-text">No deleted responses.</p>
                      ) : (
                        deletedResponses.map((response) => (
                          <div className="deleted-response-item card" key={response.id}>
                            <div className="deleted-response-meta">
                              <h4>{response.name}</h4>
                              <span className="muted-text text-sm">
                                {new Date(response.deleted_at!).toLocaleDateString()}
                              </span>
                            </div>
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
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>

          <div className="workspace-main-content">
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
          </div>
        </div>

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
                className={variablesTab === "local" ? "active" : ""}
                type="button"
                onClick={() => setVariablesTab("local")}
              >
                Local variables
              </button>
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
            </nav>
            {variablesTab === "local" && (
              <VariablesEditor
                title="Local variables"
                description="Local variables are scoped specifically to this mock API route. They persist across calls to this specific endpoint, but cannot be accessed by other routes."
                variables={variables}
                onChange={setVariables}
              />
            )}
            {variablesTab === "globals" && (
              <VariablesViewer
                title="Project globals"
                description="Project globals can be read and updated by this mock API. Their values are shared with all other routes in this project."
                variables={globals}
                prefix="globals"
              />
            )}
            {variablesTab === "constants" && (
              <VariablesViewer
                title="Constants"
                description="Constants are read-only project variables. You can reference them here, but you cannot change their values. Manage them from the Project Settings."
                variables={project.data?.constants}
                prefix="constants"
              />
            )}
            {updateMockApiMutation.isError && (
              <p className="error">{updateMockApiMutation.error.message}</p>
            )}
            <Button
              variant="secondary"
              disabled={updateMockApiMutation.isPending}
              onClick={() => {
                if (!mockApi.data) return;

                updateMockApiMutation.mutate({
                  project_id: mockApi.data.project_id,
                  method: mockApi.data.method,
                  path: mockApi.data.path,
                  name: mockApi.data.name,
                  description: mockApi.data.description,
                  variables,
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
