import { Outlet, useParams, useLocation } from "react-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Terminal,
} from "lucide-react";
import { useState, type PointerEvent } from "react";

import { ProjectAgentChatPanel } from "../../features/agent-chat/components/ProjectAgentChatPanel";

const DEFAULT_CHAT_WIDTH = 380;
const MIN_CHAT_WIDTH = 280;

const clampChatWidth = (width: number) => {
  const maxWidth = Math.min(window.innerWidth * 0.55, 620);
  return Math.min(Math.max(width, MIN_CHAT_WIDTH), maxWidth);
};

export function ProjectWorkspaceLayout() {
  const { projectId } = useParams();
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(() =>
    new URLSearchParams(location.search).has("chat_id"),
  );
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const handleElement = event.currentTarget;
    handleElement.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startWidth = chatWidth;

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      setChatWidth(clampChatWidth(startWidth + moveEvent.clientX - startX));
    };

    const stopResize = (moveEvent: globalThis.PointerEvent) => {
      handleElement.releasePointerCapture(moveEvent.pointerId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
  };

  if (!projectId) {
    return <main className="page">Missing project ID.</main>;
  }

  return (
    <div className="project-workspace">
      <div className="floating-chat-widget">
        <div
          className={`floating-chat-panel ${chatOpen ? "open" : ""}`}
          style={chatOpen ? { flexBasis: `${chatWidth}px`, width: `${chatWidth}px` } : undefined}
        >
          <div
            className="terminal-chat-resize-handle"
            onPointerDown={startResize}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize Ask AI panel"
          />
          <div className="terminal-chat-content">
            <ProjectAgentChatPanel projectId={projectId} />
          </div>
        </div>
        <button
          type="button"
          className="terminal-chat-bar"
          onClick={() => setChatOpen((v) => !v)}
          aria-label={chatOpen ? "Close AI Agent" : "Open AI Agent"}
          aria-expanded={chatOpen}
        >
          <span className="terminal-chat-title">
            <Terminal size={15} />
            <span>Ask AI</span>
          </span>
          <span className="terminal-chat-status">
            {chatOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </span>
        </button>
      </div>

      <div className="project-main-content">
        <Outlet />
      </div>
    </div>
  );
}
