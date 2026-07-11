import { Outlet, useParams, useLocation, useMatch } from "react-router";
import { useEffect, useState } from "react";
import { History, X } from "lucide-react";

import { FloatingAgentChat } from "../../features/agent-chat/components/FloatingAgentChat";
import { useAgentChat } from "../../features/agent-chat/context/AgentChatContext";
import { RequestLogsView } from "../../features/projects/components/RequestLogsView";

export function ProjectWorkspaceLayout() {
  const { projectId } = useParams();
  const location = useLocation();
  const { setIsOpen } = useAgentChat();
  const [logsOpen, setLogsOpen] = useState(false);

  // Extract mockApiId from URL if we are on a mock API detail page
  const match = useMatch("/projects/:projectId/mock-apis/:mockApiId/*");
  const mockApiId = match?.params.mockApiId;

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

      <div className="project-main-content" style={{ flex: 1, minWidth: 0 }}>
        <Outlet />
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', borderLeft: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', zIndex: 10 }}>
        {logsOpen && (
           <div style={{ width: '400px', display: 'flex', flexDirection: 'column' }}>
             <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Request Logs</h3>
               <button onClick={() => setLogsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                  <X size={16} />
               </button>
             </div>
             <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                <RequestLogsView projectId={projectId} {...(mockApiId ? { mockApiId } : {})} />
             </div>
           </div>
        )}
        <div style={{ width: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0', borderLeft: logsOpen ? '1px solid var(--color-border)' : 'none', backgroundColor: 'var(--color-bg-elevated)' }}>
           <button 
             onClick={() => setLogsOpen(!logsOpen)}
             title="Request Logs"
             style={{ 
               background: logsOpen ? 'var(--color-bg-hover)' : 'transparent', 
               border: 'none', 
               color: logsOpen ? 'var(--color-primary)' : 'var(--color-text-secondary)', 
               cursor: 'pointer', 
               padding: '8px', 
               borderRadius: '6px',
               transition: 'all 0.2s ease'
             }}>
             <History size={20} />
           </button>
        </div>
      </div>
    </div>
  );
}
