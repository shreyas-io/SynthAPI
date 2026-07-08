import { Outlet, useParams, useLocation } from "react-router";
import { useEffect } from "react";

import { FloatingAgentChat } from "../../features/agent-chat/components/FloatingAgentChat";
import { useAgentChat } from "../../features/agent-chat/context/AgentChatContext";

export function ProjectWorkspaceLayout() {
  const { projectId } = useParams();
  const location = useLocation();
  const { setIsOpen } = useAgentChat();

  useEffect(() => {
    if (new URLSearchParams(location.search).has("chat_id")) {
      setIsOpen(true);
    }
  }, [location.search, setIsOpen]);

  if (!projectId) {
    return <main className="page">Missing project ID.</main>;
  }

  return (
    <div className="project-workspace">
      <FloatingAgentChat projectId={projectId} />

      <div className="project-main-content">
        <Outlet />
      </div>
    </div>
  );
}
