import { Link, Outlet, useParams, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { queryKeys } from "../../shared/api/query_keys";
import { ProjectAgentChatPanel } from "../../features/agent-chat/components/ProjectAgentChatPanel";
import { getProject } from "../../features/projects/api/projects_api";
import { listMockApis } from "../../features/mock-apis/api/mock_apis_api";

export function ProjectWorkspaceLayout() {
  const { projectId } = useParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"apis" | "agent">(() =>
    new URLSearchParams(location.search).has("chat_id") ? "agent" : "apis",
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

  return (
    <div className="project-workspace">
      {/* 1. Thin Activity Bar */}
      <nav className="activity-bar">
        <button
          className={`activity-btn ai-activity-btn ${activeTab === "agent" ? "active" : ""}`}
          onClick={() => setActiveTab("agent")}
          title="AI Agent"
        >
          ✨
        </button>
        <button
          className={`activity-btn ${activeTab === "apis" ? "active" : ""}`}
          onClick={() => setActiveTab("apis")}
          title="Project APIs"
        >
          {/* Simple document/API icon approximation */}
          {'{ }'}
        </button>
      </nav>

      {/* 2. Unified Sidebar */}
      <aside
        className={`project-sidebar ${
          activeTab === "agent" ? "project-sidebar-agent" : ""
        }`}
      >
        {activeTab === "apis" ? (
          <>
            <div className="project-sidebar-header">
              <Link to={`/projects/${projectId}`} className="brand" style={{ fontSize: '1.2rem', display: 'block' }}>
                {project.data ? project.data.name : "Loading..."}
              </Link>
            </div>
            <div className="project-sidebar-body">
              <p className="eyebrow">Mock APIs</p>
              {mockApis.isPending && <p>Loading APIs...</p>}
              {mockApis.data?.records.map((api) => {
                const isActive = location.pathname.includes(`/mock-apis/${api.id}`);
                return (
                  <Link
                    key={api.id}
                    to={`/projects/${projectId}/mock-apis/${api.id}`}
                    className={`project-sidebar-item ${isActive ? "active" : ""}`}
                  >
                    <span className="pill">{api.method}</span>
                    <code className="path-text">{api.path}</code>
                  </Link>
                );
              })}
              <Link 
                className="button secondary-btn" 
                style={{ display: 'block', textAlign: 'center', marginTop: '0.5rem', borderStyle: 'dashed' }} 
                to={`/projects/${projectId}/mock-apis/new`}
              >
                + New API
              </Link>
            </div>
          </>
        ) : (
          <ProjectAgentChatPanel projectId={projectId} />
        )}
      </aside>

      {/* 3. Main Editor Context */}
      <div className="project-main-content">
        <Outlet />
      </div>
    </div>
  );
}
