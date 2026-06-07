import {
  FormEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router";

import { getChatTurnStreamUrl } from "../api/agent_chat_api";
import {
  useCreateChatTurn,
  useCreateProjectChat,
  useProjectChatEvents,
  useProjectChats,
  useRefetchProjectChatEvents,
} from "../hooks/agent_chat_hooks";
import { MarkdownMessage } from "./MarkdownMessage";
import type {
  ChatSession,
  ChatStreamEvent,
  ChatTurnEvent,
  ChatTurnEventPayload,
  ChatTurnStreamingEventPayload,
} from "../types";

type ChatMessage =
  | {
      id: string;
      role: "user" | "assistant";
      text: string;
      eventType?: string;
      transient?: boolean;
    }
  | {
      id: string;
      role: "tool" | "system";
      label: string;
      text: string;
      status?: "success" | "failed";
      isLoading?: boolean;
      toolUseId?: string;
      eventType?: string;
      transient?: boolean;
    };

type ProjectAgentChatPanelProps = {
  projectId: string;
};

type UserInputPayload = Extract<ChatTurnEventPayload, { type: "user-input" }>;
type AssistantMessagePayload = Extract<
  ChatTurnEventPayload,
  { type: "assistant-message" }
>;

const textFromInput = (input: UserInputPayload) =>
  input.input
    .filter((item) => item.type === "text")
    .map((item) => item.source.text)
    .join("\n");

const textFromAssistant = (input: AssistantMessagePayload) =>
  input.content
    .filter((item) => item.type === "text")
    .map((item) => item.source.text)
    .join("\n");

const summarizeContent = (content: Record<string, unknown>) => {
  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
};

const prettifyToolName = (toolName: string) =>
  toolName
    .split("_")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");

const toolActionLabel = (
  toolName: string,
  eventType: "tool-input" | "tool-result" | "tool-input-start",
  status?: "success" | "failed",
) => {
  const name = prettifyToolName(toolName);

  if (eventType === "tool-result") {
    return status === "failed" ? `${name} failed.` : `${name} completed.`;
  }

  switch (toolName) {
    case "list_projects":
      return "Fetching projects list.";
    case "get_project":
      return "Fetching project details.";
    case "update_project_globals":
      return "Updating project globals.";
    case "update_project_constants":
      return "Updating project constants.";
    case "list_mock_apis":
      return "Fetching mock APIs.";
    case "get_mock_api":
      return "Fetching mock API.";
    case "create_mock_api":
      return "Creating mock API.";
    case "update_mock_api":
      return "Updating mock API.";
    case "list_mock_api_responses":
      return "Fetching mock API responses.";
    case "get_mock_api_response":
      return "Fetching mock API response.";
    case "create_mock_api_response":
      return "Creating mock API response.";
    case "update_mock_api_response":
      return "Updating mock API response.";
    default:
      return `${name || "Tool"} is running.`;
  }
};

const chatNameFromMessage = (message: string) => {
  const compact = message.trim().replace(/\s+/g, " ");
  if (!compact) {
    return "New chat";
  }

  return compact.length > 48 ? `${compact.slice(0, 48)}...` : compact;
};

const payloadFromStreamEvent = (
  event: ChatStreamEvent,
): ChatTurnStreamingEventPayload => {
  if ("payload" in event) {
    return event.payload;
  }

  return event;
};

const messagesFromEvents = (events: ChatTurnEvent[]): ChatMessage[] => {
  const toolStatuses = new Map<string, "success" | "failed">();
  for (const event of events) {
    if (event.payload.type === "tool-result") {
      toolStatuses.set(
        event.payload.output.tool_use_id,
        event.payload.output.status,
      );
    }
  }

  return events.flatMap((event): ChatMessage[] => {
    const payload = event.payload;

    switch (payload.type) {
      case "user-input":
        return [
          {
            id: event.id,
            role: "user",
            text: textFromInput(payload),
          },
        ];
      case "assistant-message":
        return [
          {
            id: event.id,
            role: "assistant",
            text: textFromAssistant(payload),
          },
        ];
      case "tool-input":
        const inputStatus = toolStatuses.get(payload.input.tool_use_id);
        return [
          {
            id: event.id,
            role: "tool",
            label: toolActionLabel(payload.input.label, "tool-input"),
            text: summarizeContent(payload.input.content),
            ...(inputStatus ? { status: inputStatus } : {}),
            eventType: event.event_type,
            isLoading: !toolStatuses.has(payload.input.tool_use_id),
            toolUseId: payload.input.tool_use_id,
          },
        ];
      case "tool-result":
        return [
          {
            id: event.id,
            role: "tool",
            label: toolActionLabel(
              payload.output.label,
              "tool-result",
              payload.output.status,
            ),
            text: summarizeContent(payload.output.content),
            status: payload.output.status,
            eventType: event.event_type,
            toolUseId: payload.output.tool_use_id,
          },
        ];
      case "turn-settled":
        if (payload.status === "failed") {
          return [
            {
              id: event.id,
              role: "system",
              label: "Turn failed",
              text: payload.error ?? "The agent turn failed.",
              status: "failed",
              eventType: event.event_type,
            },
          ];
        }
        return [];
      default:
        return [];
    }
  });
};

export function ProjectAgentChatPanel({ projectId }: ProjectAgentChatPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const chatIdFromUrl = searchParams.get("chat_id");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isDraftChat, setIsDraftChat] = useState(false);
  const [message, setMessage] = useState("");
  const [streamMessages, setStreamMessages] = useState<ChatMessage[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const [isChatListOpen, setIsChatListOpen] = useState(() => !chatIdFromUrl);
  const streamRef = useRef<EventSource | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const setUrlChatId = (chatId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (chatId) {
      next.set("chat_id", chatId);
    } else {
      next.delete("chat_id");
    }
    setSearchParams(next, { replace: false });
  };

  const chats = useProjectChats(projectId);
  const events = useProjectChatEvents(
    projectId,
    selectedChatId,
    Boolean(selectedChatId && !isDraftChat),
  );
  const refetchChatEvents = useRefetchProjectChatEvents(projectId);

  const selectedChat = chats.data?.records.find(
    (chat) => chat.id === selectedChatId,
  );
  const chatSelectorLabel = isDraftChat
    ? "Draft chat"
    : (selectedChat?.name ?? "Select chat");

  const createChatMutation = useCreateProjectChat(projectId);

  const createDraftChat = (firstMessage: string) =>
    createChatMutation.mutateAsync({
        name: chatNameFromMessage(firstMessage),
        description: null,
      });

  const createTurnMutation = useCreateChatTurn(projectId);

  const canonicalMessages = useMemo(
    () => messagesFromEvents(events.data?.records ?? []),
    [events.data?.records],
  );
  const messages = activeTurnId
    ? [...canonicalMessages, ...streamMessages]
    : canonicalMessages;
  const transcriptScrollKey = messages
    .map((message) => `${message.id}:${message.text.length}`)
    .join("|");
  const isSending =
    createChatMutation.isPending ||
    createTurnMutation.isPending ||
    Boolean(activeTurnId);

  useLayoutEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) {
      return;
    }

    transcript.scrollTop = transcript.scrollHeight;
  }, [selectedChatId, events.dataUpdatedAt, transcriptScrollKey]);

  useEffect(() => {
    return () => {
      streamRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!chatIdFromUrl || chatIdFromUrl === selectedChatId) {
      return;
    }

    closeStream();
    setSelectedChatId(chatIdFromUrl);
    setIsDraftChat(false);
    setStreamMessages([]);
    setStreamError(null);
  }, [chatIdFromUrl, selectedChatId]);

  const closeStream = () => {
    streamRef.current?.close();
    streamRef.current = null;
    setActiveTurnId(null);
  };

  const refetchTranscript = async (chatId: string) => {
    await refetchChatEvents(chatId);
  };

  const settleStream = async (chatId: string) => {
    streamRef.current?.close();
    streamRef.current = null;
    await refetchTranscript(chatId);
    setStreamMessages([]);
    setActiveTurnId(null);
  };

  const startTurnStream = (chatId: string, turnId: string) => {
    streamRef.current?.close();
    setActiveTurnId(turnId);
    setStreamMessages([]);
    setStreamError(null);

    const stream = new EventSource(getChatTurnStreamUrl(projectId, chatId, turnId), {
      withCredentials: true,
    });
    streamRef.current = stream;

    stream.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as ChatStreamEvent;
      const payload = payloadFromStreamEvent(parsed);
      const assistantDeltaId = `stream-assistant-delta-${turnId}`;

      switch (payload.type) {
        case "user-input":
          setStreamMessages((current) => [
            ...current,
            {
              id: `stream-user-${turnId}-${current.length}`,
              role: "user",
              text: textFromInput(payload),
              transient: true,
            },
          ]);
          break;
        case "assistant-delta":
          setStreamMessages((current) => {
            const existing = current.find(
              (message) => message.id === assistantDeltaId,
            );

            if (!existing) {
              return [
                ...current,
                {
                  id: assistantDeltaId,
                  role: "assistant",
                  text: payload.text,
                  transient: true,
                },
              ];
            }

            return current.map((message) =>
              message.id === assistantDeltaId && message.role === "assistant"
                ? { ...message, text: `${message.text}${payload.text}` }
                : message,
            );
          });
          break;
        case "assistant-message":
          setStreamMessages((current) => [
            ...current,
            {
              id: `stream-assistant-message-${turnId}`,
              role: "assistant",
              text: textFromAssistant(payload),
              transient: true,
            },
          ]);
          break;
        case "tool-input":
          setStreamMessages((current) => [
            ...current,
            {
              id: `stream-tool-input-${turnId}-${current.length}`,
              role: "tool",
              label: toolActionLabel(payload.input.label, "tool-input"),
              text: summarizeContent(payload.input.content),
              eventType: "tool-input",
              isLoading: true,
              toolUseId: payload.input.tool_use_id,
              transient: true,
            },
          ]);
          break;
        case "tool-result":
          setStreamMessages((current) => [
            ...current.map((message) =>
              message.role === "tool" &&
              message.toolUseId === payload.output.tool_use_id
                ? {
                    ...message,
                    isLoading: false,
                    status: payload.output.status,
                  }
                : message,
            ),
            {
              id: `stream-tool-result-${turnId}-${current.length}`,
              role: "tool",
              label: toolActionLabel(
                payload.output.label,
                "tool-result",
                payload.output.status,
              ),
              text: summarizeContent(payload.output.content),
              status: payload.output.status,
              eventType: "tool-result",
              toolUseId: payload.output.tool_use_id,
              transient: true,
            },
          ]);
          break;
        case "tool-input-start":
          setStreamMessages((current) => [
            ...current,
            {
              id: `stream-tool-start-${turnId}-${current.length}`,
              role: "system",
              label: toolActionLabel(payload.text, "tool-input-start"),
              text: payload.text,
              eventType: "tool-input-start",
              transient: true,
            },
          ]);
          break;
        case "reasoning-delta":
          break;
        case "turn-settled":
          if (payload.status === "failed") {
            setStreamError(payload.error ?? "The agent turn failed.");
          }
          void settleStream(chatId);
          break;
        case "error":
          setStreamError(payload.error);
          closeStream();
          void refetchTranscript(chatId);
          break;
        default:
          break;
      }
    };

    stream.onerror = () => {
      setStreamError("Lost connection to the chat stream.");
      closeStream();
      void refetchTranscript(chatId);
    };
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isSending) {
      return;
    }

    setMessage("");
    setStreamMessages([
      {
        id: `optimistic-user-${Date.now()}`,
        role: "user",
        text: trimmed,
        transient: true,
      },
    ]);

    try {
      const chat =
        selectedChatId && !isDraftChat
          ? ({ id: selectedChatId } as Pick<ChatSession, "id">)
          : await createDraftChat(trimmed);
      setSelectedChatId(chat.id);
      setIsDraftChat(false);
      setIsChatListOpen(false);
      setUrlChatId(chat.id);
      const turn = await createTurnMutation.mutateAsync({
        chatId: chat.id,
        message: trimmed,
      });

      startTurnStream(chat.id, turn.id);
    } catch (error) {
      setStreamMessages([]);
      setStreamError(error instanceof Error ? error.message : String(error));
    }
  };

  const startDraftChat = () => {
    closeStream();
    setSelectedChatId(null);
    setIsDraftChat(true);
    setStreamMessages([]);
    setStreamError(null);
    setIsChatListOpen(false);
    setUrlChatId(null);
  };

  const selectChat = (chatId: string) => {
    closeStream();
    setSelectedChatId(chatId);
    setIsDraftChat(false);
    setStreamMessages([]);
    setStreamError(null);
    setIsChatListOpen(false);
    setUrlChatId(chatId);
  };

  const chatListContent = (
    <>
      {chats.isPending && <p className="agent-muted">Loading chats...</p>}
      {chats.isError && (
        <p className="error">Could not load chats: {chats.error.message}</p>
      )}
      {isDraftChat && (
        <button className="agent-chat-list-item active" type="button">
          Draft chat
        </button>
      )}
      {chats.data?.records.map((chat) => (
        <button
          key={chat.id}
          className={`agent-chat-list-item ${
            selectedChatId === chat.id && !isDraftChat ? "active" : ""
          }`}
          type="button"
          onClick={() => selectChat(chat.id)}
        >
          {chat.name}
        </button>
      ))}
    </>
  );

  return (
    <>
      <div className="agent-sidebar-header">
        <div className="agent-chat-selector">
          <button
            className="agent-chat-selector-toggle"
            type="button"
            onClick={() => setIsChatListOpen((value) => !value)}
          >
            <span>{chatSelectorLabel}</span>
            <span aria-hidden="true">⌄</span>
          </button>
          {isChatListOpen && (
            <div className="agent-chat-list" role="listbox">
              {chatListContent}
            </div>
          )}
        </div>
        <button
          className="button secondary-btn agent-new-chat-btn"
          type="button"
          onClick={startDraftChat}
          disabled={isSending}
        >
          New Chat
        </button>
      </div>

      <div className="agent-chat-transcript" ref={transcriptRef}>
        {!selectedChatId && !isDraftChat && (
          <p className="agent-placeholder">
            Start a new chat or select an existing chat to work with this
            project.
          </p>
        )}
        {events.isPending && selectedChatId && !isDraftChat && (
          <p className="agent-muted">Loading transcript...</p>
        )}
        {events.isError && (
          <p className="error">Could not load transcript: {events.error.message}</p>
        )}
        {messages.map((message) => (
          <article
            key={message.id}
            className={`agent-message agent-message-${message.role} ${
              message.transient ? "agent-message-transient" : ""
            }`}
          >
            {message.eventType &&
              message.role !== "user" &&
              message.role !== "assistant" && (
              <p className="agent-message-event-type">{message.eventType}</p>
            )}
            {message.role === "tool" || message.role === "system" ? (
              <>
                <p className="agent-message-label">
                  {message.isLoading && (
                    <span aria-hidden="true" className="agent-tool-spinner" />
                  )}
                  {!message.isLoading && message.status === "success" && (
                    <span aria-hidden="true" className="agent-tool-status agent-tool-status-success">
                      ✓
                    </span>
                  )}
                  {!message.isLoading && message.status === "failed" && (
                    <span aria-hidden="true" className="agent-tool-status agent-tool-status-failed">
                      ×
                    </span>
                  )}
                  {message.label}
                  {message.status ? ` (${message.status})` : ""}
                </p>
                <details className="agent-tool-details">
                  <summary>
                    {message.eventType === "tool-response" ||
                    message.eventType === "tool-result"
                      ? "Output"
                      : "Input"}
                  </summary>
                  <pre>{message.text}</pre>
                </details>
              </>
            ) : (
              <>
                {message.role === "assistant" ? (
                  <MarkdownMessage markdown={message.text} />
                ) : (
                  <p>{message.text}</p>
                )}
              </>
            )}
          </article>
        ))}
        {streamError && <p className="error">{streamError}</p>}
      </div>

      <form className="agent-sidebar-footer" onSubmit={sendMessage}>
        <textarea
          className="agent-input"
          placeholder={
            isDraftChat || selectedChatId
              ? "Ask the agent..."
              : "Create a new chat to start..."
          }
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={isSending || (!selectedChatId && !isDraftChat)}
          rows={3}
        />
        <button
          type="submit"
          disabled={isSending || !message.trim() || (!selectedChatId && !isDraftChat)}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </>
  );
}
