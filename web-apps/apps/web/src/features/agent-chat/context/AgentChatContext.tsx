import { createContext, useContext, useState, type ReactNode } from "react";

type AgentChatContextValue = {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  width: number;
  setWidth: (value: number) => void;
};

const AgentChatContext = createContext<AgentChatContextValue | null>(null);

export function AgentChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidth] = useState(620);

  return (
    <AgentChatContext.Provider value={{ isOpen, setIsOpen, width, setWidth }}>
      {children}
    </AgentChatContext.Provider>
  );
}

export function useAgentChat() {
  const context = useContext(AgentChatContext);
  if (!context) {
    throw new Error("useAgentChat must be used within an AgentChatProvider");
  }
  return context;
}
