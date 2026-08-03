import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query/query_keys";

import { getChatTurnStreamUrl } from "../api/agent_chat_api";
import {
  useCreateChatTurn,
  useCreateProjectChat,
  useProjectChatEvents,
  useProjectChats,
  useRefetchProjectChatEvents,
  useCancelChatTurn,
  useDeleteProjectChat,
} from "../hooks/agent_chat_hooks";
import { MarkdownMessage } from "./MarkdownMessage";
import type {
  ChatSession,
  ChatStreamEvent,
  ChatTurnEvent,
  ChatTurnEventPayload,
  ChatTurnStreamingEventPayload,
  FormPrompt,
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

const EMPTY_FORM_PROMPTS: FormPrompt[] = [];
const STREAM_RENDER_INTERVAL_MS = 80;
const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 80;

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

const promptKey = (prompt: FormPrompt, index: number) =>
  `${index}:${prompt.question}`;

const formatPromptAnswers = (
  prompts: FormPrompt[],
  answers: Record<string, string>,
) => {
  if (prompts.length === 0) {
    return "";
  }

  if (prompts.length === 1) {
    const prompt = prompts[0];
    return prompt ? (answers[promptKey(prompt, 0)]?.trim() ?? "") : "";
  }

  return prompts
    .map((prompt, index) => {
      const answer = answers[promptKey(prompt, index)]?.trim() ?? "";
      return answer;
    })
    .filter(Boolean)
    .join("\n");
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
      case "compaction-started":
        return [
          {
            id: event.id,
            role: "system",
            label: "Compaction started",
            text: "Compacting chat context.",
            eventType: event.event_type,
          },
        ];
      case "chat-compacted":
        return [
          {
            id: event.id,
            role: "system",
            label: "Chat compacted",
            text: "Chat context was compacted.",
            eventType: event.event_type,
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

export function ProjectAgentChatPanel({
  projectId,
}: ProjectAgentChatPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const chatIdFromUrl = searchParams.get("chat_id");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    chatIdFromUrl,
  );
  const [isDraftChat, setIsDraftChat] = useState(() => !chatIdFromUrl);
  const [message, setMessage] = useState("");
  const [promptAnswers, setPromptAnswers] = useState<Record<string, string>>(
    {},
  );
  const [streamMessages, setStreamMessages] = useState<ChatMessage[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const [isChatListOpen, setIsChatListOpen] = useState(() => !chatIdFromUrl);
  const streamRef = useRef<EventSource | null>(null);
  const streamMessagesRef = useRef<ChatMessage[]>([]);
  const pendingAssistantDeltaRef = useRef<{ id: string; text: string } | null>(
    null,
  );
  const streamFlushTimeoutRef = useRef<number | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const prevScrollHeightRef = useRef<number | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const forceNextTranscriptScrollRef = useRef(true);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  const setUrlChatId = useCallback(
    (chatId: string | null, options?: { replace?: boolean }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (chatId) {
            next.set("chat_id", chatId);
          } else {
            next.delete("chat_id");
          }
          return next;
        },
        { replace: options?.replace ?? false },
      );
    },
    [setSearchParams]
  );

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
  const deleteChatMutation = useDeleteProjectChat(projectId);
  const cancelTurnMutation = useCancelChatTurn(projectId);

  const rawRecords = useMemo(
    () => events.data?.pages.flatMap((page) => page.records) ?? [],
    [events.data?.pages],
  );

  const processedEventIds = useRef(new Set<string>());

  useEffect(() => {
    for (const event of rawRecords) {
      if (processedEventIds.current.has(event.id)) continue;
      processedEventIds.current.add(event.id);

      if (
        event.payload.type === "tool-result" &&
        event.payload.output.status === "success"
      ) {
        const label = event.payload.output.label;
        if (
          label === "create_mock_api" ||
          label === "update_mock_api" ||
          label === "delete_mock_api" ||
          label === "create_mock_api_response" ||
          label === "update_mock_api_response" ||
          label === "delete_mock_api_response" ||
          label === "reorder_mock_api_responses"
        ) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.mockApis(projectId),
          });
        }
      }
    }
  }, [rawRecords, projectId, queryClient]);

  const settledRecords = useMemo(
    () => activeTurnId ? rawRecords.filter(r => r.chat_turn_id !== activeTurnId) : rawRecords,
    [rawRecords, activeTurnId]
  );

  const canonicalMessages = useMemo(
    () => messagesFromEvents([...settledRecords].reverse()),
    [settledRecords],
  );

  useEffect(() => {
    if (!selectedChatId || isDraftChat || activeTurnId || rawRecords.length === 0) return;

    const latestTurnId = rawRecords[0].chat_turn_id;
    const hasSettled = rawRecords.some(
      (e) => e.chat_turn_id === latestTurnId && e.payload.type === "turn-settled"
    );

    if (!hasSettled) {
      startTurnStream(selectedChatId, latestTurnId);
    }
  }, [selectedChatId, isDraftChat, activeTurnId, rawRecords]);

  // Ensure chat_id stays in the URL even if the user navigates to other pages via <Link>
  useEffect(() => {
    if (selectedChatId && !isDraftChat) {
      const currentUrlChatId = searchParams.get("chat_id");
      if (currentUrlChatId !== selectedChatId) {
        setUrlChatId(selectedChatId, { replace: true });
      }
    }
  }, [selectedChatId, isDraftChat, searchParams, setUrlChatId]);

  const hasCanonicalActiveTurnSettled = Boolean(
    activeTurnId &&
      rawRecords.some(
        (event) =>
          event.chat_turn_id === activeTurnId &&
          event.payload.type === "turn-settled",
      ),
  );
  const activePrompts = events.data?.pages[0]?.prompts ?? EMPTY_FORM_PROMPTS;
  const promptSignature = useMemo(
    () =>
      activePrompts.map((prompt, index) => promptKey(prompt, index)).join("|"),
    [activePrompts],
  );
  const isPromptMode = activePrompts.length > 0 && !activeTurnId;
  const canSubmitPromptAnswers =
    isPromptMode &&
    activePrompts.every((prompt, index) => {
      const answer = promptAnswers[promptKey(prompt, index)]?.trim();
      return Boolean(answer);
    });
  const messages =
    activeTurnId || streamMessages.length > 0
      ? [
          ...canonicalMessages,
          ...(hasCanonicalActiveTurnSettled ? [] : streamMessages),
        ]
      : canonicalMessages;
  const lastMessage = messages.at(-1);
  const isSending =
    createChatMutation.isPending ||
    createTurnMutation.isPending ||
    Boolean(activeTurnId);

  type GroupedMessageBlock =
    | { type: "single"; message: ChatMessage }
    | { type: "tool-group"; messages: ChatMessage[]; id: string };

  const groupedMessages = useMemo(() => {
    const groups: GroupedMessageBlock[] = [];
    let currentGroup: ChatMessage[] = [];

    const pushGroup = () => {
      if (currentGroup.length > 0) {
        groups.push({
          type: "tool-group",
          messages: currentGroup,
          id: `group-${currentGroup[0].id}`,
        });
        currentGroup = [];
      }
    };

    for (const msg of messages) {
      if (msg.role === "tool" || (msg.role === "system" && msg.eventType === "tool-input-start")) {
        currentGroup.push(msg);
      } else {
        pushGroup();
        groups.push({ type: "single", message: msg });
      }
    }
    pushGroup();
    return groups;
  }, [messages]);
  const shouldShowThinking = isSending;

  const isTranscriptNearBottom = (transcript: HTMLDivElement) =>
    transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight <=
    AUTO_SCROLL_BOTTOM_THRESHOLD_PX;

  const scrollTranscriptToBottom = (transcript: HTMLDivElement) => {
    transcript.scrollTop = transcript.scrollHeight;
    shouldStickToBottomRef.current = true;
  };

  const forceNextTranscriptScroll = () => {
    forceNextTranscriptScrollRef.current = true;
    shouldStickToBottomRef.current = true;
  };

  const handleTranscriptScroll = () => {
    const transcript = transcriptRef.current;
    if (!transcript) {
      return;
    }

    if (
      transcript.scrollTop === 0 &&
      events.hasNextPage &&
      !events.isFetchingNextPage
    ) {
      prevScrollHeightRef.current = transcript.scrollHeight;
      void events.fetchNextPage();
    }

    shouldStickToBottomRef.current = isTranscriptNearBottom(transcript);
  };

  useLayoutEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) {
      return;
    }

    if (
      prevScrollHeightRef.current !== null &&
      events.isSuccess &&
      !events.isFetchingNextPage
    ) {
      transcript.scrollTop =
        transcript.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = null;
      return;
    }

    if (
      forceNextTranscriptScrollRef.current ||
      shouldStickToBottomRef.current ||
      isTranscriptNearBottom(transcript)
    ) {
      scrollTranscriptToBottom(transcript);
    }

    forceNextTranscriptScrollRef.current = false;
  }, [
    selectedChatId,
    events.dataUpdatedAt,
    messages.length,
    lastMessage?.id,
    lastMessage?.text.length,
    events.isSuccess,
    events.isFetchingNextPage,
  ]);

  useLayoutEffect(() => {
    const input = messageInputRef.current;
    if (!input) {
      return;
    }

    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  }, [message]);

  useEffect(() => {
    if (!activePrompts.length) {
      setPromptAnswers({});
      return;
    }

    setPromptAnswers((current) => {
      const next: Record<string, string> = {};
      activePrompts.forEach((prompt, index) => {
        const key = promptKey(prompt, index);
        next[key] = current[key] ?? "";
      });
      return next;
    });
  }, [activePrompts, promptSignature]);

  useEffect(() => {
    return () => {
      clearStreamFlush();
      pendingAssistantDeltaRef.current = null;
      streamRef.current?.close();
    };
  }, []);



  useEffect(() => {
    if (!chatIdFromUrl) {
      if (activeTurnId || streamMessages.length > 0) {
        return;
      }

      if (!isDraftChat) {
        closeStream();
        setSelectedChatId(null);
        setIsDraftChat(true);
        forceNextTranscriptScroll();
        setStreamMessagesSnapshot([]);
        setStreamError(null);
      }
      return;
    }

    if (chatIdFromUrl === selectedChatId && !isDraftChat) {
      return;
    }

    closeStream();
    setSelectedChatId(chatIdFromUrl);
    setIsDraftChat(false);
    forceNextTranscriptScroll();
    setStreamMessagesSnapshot(streamMessagesRef.current);
    setStreamError(null);
  }, [
    activeTurnId,
    chatIdFromUrl,
    selectedChatId,
    isDraftChat,
    streamMessages.length,
  ]);

  const closeStream = () => {
    clearStreamFlush();
    pendingAssistantDeltaRef.current = null;
    streamRef.current?.close();
    streamRef.current = null;
    setActiveTurnId(null);
  };

  const clearStreamFlush = () => {
    if (streamFlushTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(streamFlushTimeoutRef.current);
    streamFlushTimeoutRef.current = null;
  };



  const setStreamMessagesSnapshot = (messages: ChatMessage[]) => {
    pendingAssistantDeltaRef.current = null;
    streamMessagesRef.current = messages;
    setStreamMessages(messages);
  };

  const applyPendingAssistantDelta = () => {
    const pending = pendingAssistantDeltaRef.current;
    if (!pending) {
      return;
    }

    pendingAssistantDeltaRef.current = null;
    const existing = streamMessagesRef.current.find(
      (message) => message.id === pending.id,
    );

    if (!existing) {
      streamMessagesRef.current = [
        ...streamMessagesRef.current,
        {
          id: pending.id,
          role: "assistant",
          text: pending.text,
          transient: true,
        },
      ];
      return;
    }

    streamMessagesRef.current = streamMessagesRef.current.map((message) =>
      message.id === pending.id && message.role === "assistant"
        ? { ...message, text: `${message.text}${pending.text}` }
        : message,
    );
  };

  const flushStreamMessages = () => {
    streamFlushTimeoutRef.current = null;
    applyPendingAssistantDelta();
    setStreamMessages([...streamMessagesRef.current]);
  };

  const scheduleStreamFlush = () => {
    if (streamFlushTimeoutRef.current !== null) {
      return;
    }

    streamFlushTimeoutRef.current = window.setTimeout(
      flushStreamMessages,
      STREAM_RENDER_INTERVAL_MS,
    );
  };

  const updateBufferedStreamMessages = (
    updater: (messages: ChatMessage[]) => ChatMessage[],
  ) => {
    applyPendingAssistantDelta();
    streamMessagesRef.current = updater(streamMessagesRef.current);
    scheduleStreamFlush();
  };

  const bufferAssistantDelta = (id: string, text: string) => {
    const pending = pendingAssistantDeltaRef.current;
    if (pending?.id === id) {
      pending.text += text;
    } else {
      applyPendingAssistantDelta();
      pendingAssistantDeltaRef.current = { id, text };
    }

    scheduleStreamFlush();
  };

  const flushBufferedStreamMessages = () => {
    clearStreamFlush();
    flushStreamMessages();
  };

  const refetchTranscript = async (chatId: string) => {
    await refetchChatEvents(chatId);
  };

  const settleStream = async (chatId: string) => {
    streamRef.current?.close();
    streamRef.current = null;
    flushBufferedStreamMessages();
    await refetchTranscript(chatId);
    setStreamMessagesSnapshot([]);
    setActiveTurnId(null);
  };

  const startTurnStream = (chatId: string, turnId: string) => {
    streamRef.current?.close();
    setActiveTurnId(turnId);
    setStreamError(null);

    const stream = new EventSource(
      getChatTurnStreamUrl(projectId, chatId, turnId),
      {
        withCredentials: true,
      },
    );
    streamRef.current = stream;

    stream.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as ChatStreamEvent;
      const payload = payloadFromStreamEvent(parsed);
      
      const getLastAssistantBlockId = () => {
        const current = streamMessagesRef.current;
        const lastMsg = current[current.length - 1];
        if (lastMsg && lastMsg.role === "assistant" && lastMsg.id.startsWith("stream-assistant-delta")) {
          return lastMsg.id;
        }
        return `stream-assistant-delta-${turnId}-${current.length}`;
      };
      
      const assistantDeltaId = getLastAssistantBlockId();

      switch (payload.type) {
        case "user-input":
          updateBufferedStreamMessages((current) => {
            if (current.some(m => m.role === "user")) return current;
            return [
              ...current,
              {
                id: `stream-user-input-${turnId}`,
                role: "user",
                text: textFromInput(payload),
                transient: true,
              },
            ];
          });
          flushBufferedStreamMessages();
          break;
        case "assistant-delta":
          bufferAssistantDelta(assistantDeltaId, payload.text);
          break;
        case "assistant-message":
          pendingAssistantDeltaRef.current = null;
          updateBufferedStreamMessages((current) => {
            if (current.some(m => m.id === parsed.id)) return current;
            
            const lastDeltaIndex = current.findLastIndex(
              (m) => m.role === "assistant" && m.id.startsWith("stream-assistant-delta")
            );

            if (lastDeltaIndex !== -1) {
              const next = [...current];
              next[lastDeltaIndex] = {
                id: parsed.id ?? `stream-assistant-message-${turnId}-${current.length}`,
                role: "assistant",
                text: textFromAssistant(payload),
                eventType: "assistant-message",
                transient: true,
              };
              return next;
            }

            return [
              ...current,
              {
                id: parsed.id ?? `stream-assistant-message-${turnId}-${current.length}`,
                role: "assistant",
                text: textFromAssistant(payload),
                eventType: "assistant-message",
                transient: true,
              },
            ];
          });
          flushBufferedStreamMessages();
          break;
        case "tool-input":
          updateBufferedStreamMessages((current) => {
            if (current.some(m => m.role === "tool" && m.eventType === "tool-input" && m.toolUseId === payload.input.tool_use_id)) return current;
            return [
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
            ];
          });
          flushBufferedStreamMessages();
          break;
        case "tool-result": {
          if (payload.output.status === "success") {
            const label = payload.output.label;
            const content = payload.output.content as Record<string, unknown> | null;
            if (label === "create_mock_api" || label === "update_mock_api" || label === "delete_mock_api") {
              queryClient.invalidateQueries({ queryKey: queryKeys.mockApis(projectId) });
            }
            if (label === "create_mock_api" || label === "update_mock_api") {
              if (content && typeof content.id === "string") {
                navigate(`/projects/${projectId}/mock-apis/${content.id}?chat_id=${chatId}`);
              }
            } else if (
              label === "create_mock_api_response" ||
              label === "update_mock_api_response"
            ) {
              if (
                content &&
                typeof content.id === "string" &&
                typeof content.mock_api_id === "string"
              ) {
                navigate(
                  `/projects/${projectId}/mock-apis/${content.mock_api_id}?response_id=${content.id}&chat_id=${chatId}`,
                );
              }
            }
          }

          updateBufferedStreamMessages((current) => {
            if (current.some(m => m.role === "tool" && m.eventType === "tool-result" && m.toolUseId === payload.output.tool_use_id)) return current;
            return [
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
            ];
          });
          flushBufferedStreamMessages();
          break;
        }
        case "compaction-started":
          updateBufferedStreamMessages((current) => [
            ...current,
            {
              id: `stream-compaction-started-${turnId}-${current.length}`,
              role: "system",
              label: "Compaction started",
              text: "Compacting chat context.",
              eventType: "compaction-started",
              transient: true,
            },
          ]);
          flushBufferedStreamMessages();
          break;
        case "chat-compacted":
          updateBufferedStreamMessages((current) => [
            ...current,
            {
              id: `stream-chat-compacted-${turnId}-${current.length}`,
              role: "system",
              label: "Chat compacted",
              text: "Chat context was compacted.",
              eventType: "chat-compacted",
              transient: true,
            },
          ]);
          flushBufferedStreamMessages();
          break;
        case "tool-input-start":
          updateBufferedStreamMessages((current) => [
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
          flushBufferedStreamMessages();
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

  const sendMessage = async (
    event?: FormEvent<HTMLFormElement>,
    submittedMessage = message,
  ) => {
    if (event) {
      event.preventDefault();
    }
    const trimmed = submittedMessage.trim();
    if (!trimmed || isSending) {
      return;
    }

    if (submittedMessage === message) {
      setMessage("");
    }
    setPromptAnswers({});
    forceNextTranscriptScroll();
    setStreamMessagesSnapshot([
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
      setStreamMessagesSnapshot([]);
      setStreamError(error instanceof Error ? error.message : String(error));
    }
  };

  const submitPromptAnswers = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmitPromptAnswers) {
      return;
    }

    await sendMessage(
      undefined,
      formatPromptAnswers(activePrompts, promptAnswers),
    );
  };

  const skipPromptAnswers = async () => {
    if (!isPromptMode || isSending) {
      return;
    }

    await sendMessage(undefined, "skip");
  };

  const startDraftChat = () => {
    closeStream();
    setSelectedChatId(null);
    setIsDraftChat(true);
    forceNextTranscriptScroll();
    setStreamMessagesSnapshot([]);
    setStreamError(null);
    setIsChatListOpen(false);
    setUrlChatId(null);
  };

  const selectChat = (chatId: string) => {
    closeStream();
    setSelectedChatId(chatId);
    setIsDraftChat(false);
    forceNextTranscriptScroll();
    setStreamMessagesSnapshot([]);
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
        <div
          className="agent-header-actions"
          style={{ width: "100%", justifyContent: "space-between" }}
        >
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
          {selectedChatId && !isDraftChat && (
            <button
              type="button"
              className="agent-new-chat-btn agent-delete-chat-btn"
              onClick={async () => {
                if (confirm("Are you sure you want to delete this chat?")) {
                  await deleteChatMutation.mutateAsync(selectedChatId);
                  setSelectedChatId(null);
                  startDraftChat();
                }
              }}
              disabled={isSending || deleteChatMutation.isPending}
              title="Delete Chat"
              style={{ color: "var(--color-error, #ff4444)" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18"></path>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          )}
          <button
            type="button"
            className="agent-new-chat-btn"
            onClick={startDraftChat}
            disabled={isSending}
            title="New Chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>New Chat</span>
          </button>
        </div>
      </div>

      <div
        className="agent-chat-transcript"
        onScroll={handleTranscriptScroll}
        ref={transcriptRef}
      >
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
          <p className="error">
            Could not load transcript: {events.error.message}
          </p>
        )}
        {groupedMessages.map((block) => {
          if (block.type === "tool-group") {
            const isAnyLoading = block.messages.some(m => m.isLoading);
            const hasAnyFailed = block.messages.some(m => m.status === "failed");
            return (
              <details key={block.id} className="agent-tool-group">
                <summary className="agent-tool-group-summary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="agent-tool-group-chevron"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                  {isAnyLoading && <span aria-hidden="true" className="agent-tool-spinner" />}
                  <span>{block.messages.length} tool execution{block.messages.length === 1 ? "" : "s"}</span>
                </summary>
                <div className="agent-tool-group-content">
                  {block.messages.map((message) => (
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
                              <span
                                aria-hidden="true"
                                className="agent-tool-status agent-tool-status-success"
                              >
                                ✓
                              </span>
                            )}
                            {!message.isLoading && message.status === "failed" && (
                              <span
                                aria-hidden="true"
                                className="agent-tool-status agent-tool-status-failed"
                              >
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
                        <p>{message.text}</p>
                      )}
                    </article>
                  ))}
                </div>
              </details>
            );
          }

          const message = block.message;
          return (
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
                      <span
                        aria-hidden="true"
                        className="agent-tool-status agent-tool-status-success"
                      >
                        ✓
                      </span>
                    )}
                    {!message.isLoading && message.status === "failed" && (
                      <span
                        aria-hidden="true"
                        className="agent-tool-status agent-tool-status-failed"
                      >
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
          );
        })}
        {shouldShowThinking && (
          <article className="agent-message agent-message-system agent-thinking-message">
            <span aria-hidden="true" className="agent-thinking-spinner" />
            <span>Thinking...</span>
          </article>
        )}
        {streamError && <p className="error">{streamError}</p>}
      </div>

      {isPromptMode ? (
        <form className="agent-sidebar-footer" onSubmit={submitPromptAnswers}>
          <div className="agent-form-prompts">
            {activePrompts.map((prompt, index) => {
              const key = promptKey(prompt, index);
              const options = prompt.options?.filter(Boolean) ?? [];

              return (
                <fieldset className="agent-form-prompt" key={key}>
                  <legend>{prompt.question}</legend>
                  {options.length > 0 ? (
                    <div className="agent-form-options">
                      {options.map((option, optionIndex) => (
                        <button
                          className={
                            promptAnswers[key] === option
                              ? "agent-form-option selected"
                              : "agent-form-option"
                          }
                          type="button"
                          key={`${optionIndex}:${option}`}
                          onClick={() =>
                            setPromptAnswers((current) => ({
                              ...current,
                              [key]: option,
                            }))
                          }
                          disabled={isSending}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <textarea
                    className="agent-form-answer"
                    placeholder="Something Else"
                    value={promptAnswers[key] ?? ""}
                    onChange={(event) =>
                      setPromptAnswers((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    disabled={isSending}
                    rows={3}
                  />
                </fieldset>
              );
            })}
          </div>
          <div className="agent-form-actions">
            <button
              className="agent-form-skip"
              type="button"
              onClick={() => void skipPromptAnswers()}
              disabled={isSending}
            >
              Skip
            </button>
            <button
              className="agent-form-submit"
              type="submit"
              disabled={!canSubmitPromptAnswers || isSending}
            >
              {isSending ? "Sending..." : "Submit"}
            </button>
          </div>
        </form>
      ) : (
        <form className="agent-sidebar-footer" onSubmit={sendMessage}>
          <textarea
            ref={messageInputRef}
            className="agent-input"
            placeholder={
              isDraftChat || selectedChatId
                ? "Ask the agent..."
                : "Create a new chat to start..."
            }
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            disabled={isSending || (!selectedChatId && !isDraftChat)}
            rows={3}
          />
          {isSending && activeTurnId && selectedChatId ? (
            <button
              className="agent-send-button agent-cancel-button"
              type="button"
              disabled={cancelTurnMutation.isPending}
              onClick={() => {
                cancelTurnMutation.mutate({ chatId: selectedChatId, turnId: activeTurnId });
              }}
            >
              <span aria-hidden="true" className="agent-send-spinner" />
              {cancelTurnMutation.isPending ? "Cancelling" : "Cancel"}
            </button>
          ) : (
            <button
              className="agent-send-button"
              type="submit"
              disabled={
                isSending || !message.trim() || (!selectedChatId && !isDraftChat)
              }
            >
              {isSending && (
                <span aria-hidden="true" className="agent-send-spinner" />
              )}
              {isSending ? "Sending" : "Send"}
            </button>
          )}
        </form>
      )}
    </>
  );
}
