import { useEffect, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, Terminal, GripVertical } from "lucide-react";

import { ProjectAgentChatPanel } from "./ProjectAgentChatPanel";
import { useAgentChat } from "../context/AgentChatContext";

const MIN_CHAT_WIDTH = 280;

const clampChatWidth = (width: number) => {
  const maxWidth = Math.min(window.innerWidth * 0.55, 620);
  return Math.min(Math.max(width, MIN_CHAT_WIDTH), maxWidth);
};

type FloatingAgentChatProps = {
  projectId?: string;
};

function AgentNoProjectPanel() {
  return (
    <>
      <div className="agent-sidebar-header">
        <div
          className="agent-header-actions"
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <span className="agent-bot-name">Ask AI</span>
        </div>
      </div>

      <div className="agent-chat-transcript">
        <div className="agent-no-project-state">
          <Terminal size={32} aria-hidden="true" />
          <p className="agent-placeholder">
            Open a project to start building with the agent.
          </p>
          <p className="agent-muted">
            Chats are scoped to a project so the agent can safely access its
            mock APIs, responses, and settings.
          </p>
        </div>
      </div>

      <div className="agent-sidebar-footer">
        <textarea
          className="agent-input"
          placeholder="Select a project first..."
          disabled
          rows={3}
        />
        <button className="agent-send-button" type="button" disabled>
          Send
        </button>
      </div>
    </>
  );
}

export function FloatingAgentChat({ projectId }: FloatingAgentChatProps) {
  const { isOpen: chatOpen, setIsOpen: setChatOpen, width, setWidth } = useAgentChat();
  const [chatWidth, setChatWidth] = useState(() => clampChatWidth(width));

  useEffect(() => {
    setChatWidth(clampChatWidth(width));
  }, [width]);

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
      setWidth(chatWidth);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
  };

  return (
    <div className="floating-chat-widget">
      <div
        className={`floating-chat-panel ${chatOpen ? "open" : ""}`}
        style={
          chatOpen ? { flexBasis: `${chatWidth}px`, width: `${chatWidth}px` } : undefined
        }
      >
        <div
          className="terminal-chat-resize-handle"
          onPointerDown={startResize}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize Ask AI panel"
        >
          <GripVertical size={14} />
        </div>
        <div className="terminal-chat-content">
          {projectId ? (
            <ProjectAgentChatPanel projectId={projectId} />
          ) : (
            <AgentNoProjectPanel />
          )}
        </div>
      </div>
      <button
        type="button"
        className="terminal-chat-bar"
        onClick={() => setChatOpen(!chatOpen)}
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
  );
}
