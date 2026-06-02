import { Link, Outlet, useParams, useLocation } from "react-router";
import { useState } from "react";

import { ProjectAgentChatPanel } from "../../features/agent-chat/components/ProjectAgentChatPanel";

export function ProjectWorkspaceLayout() {
  const { projectId } = useParams();
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(() =>
    new URLSearchParams(location.search).has("chat_id"),
  );

  if (!projectId) {
    return <main className="page">Missing project ID.</main>;
  }

  return (
    <div className="project-workspace">
      <div className="project-main-content">
        <Outlet />
      </div>

      <div className="floating-chat-widget">
        <div className={`floating-chat-panel ${chatOpen ? "open" : ""}`}>
          <ProjectAgentChatPanel projectId={projectId} />
        </div>
        <button
          type="button"
          className="floating-chat-toggle"
          onClick={() => setChatOpen((v) => !v)}
          aria-label={chatOpen ? "Close AI Agent" : "Open AI Agent"}
        >
          {chatOpen ? (
            <>
              <span aria-hidden="true">×</span> Close
            </>
          ) : (
            <>
              <span aria-hidden="true">✨</span> Ask AI
            </>
          )}
        </button>
      </div>
    </div>
  );
}
