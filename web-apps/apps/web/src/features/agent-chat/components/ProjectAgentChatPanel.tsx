import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
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

const THINKING_MESSAGES = [
  "Consulting the token committee",
  "Pretending this was obvious all along",
  "Assembling a sensible answer",
  "Negotiating with autocomplete",
  "Checking the vibes and the types",
  "Turning caffeine into JSON",
  "Reading the room, then the schema",
  "Finding the least surprising answer",
  "Warming up the context window",
  "Convincing the prompt to cooperate",
  "Sorting thoughts by confidence",
  "Looking for the non-weird solution",
  "Doing the tiny math",
  "Polishing a response-shaped object",
  "Untangling the obvious edge case",
  "Waiting for the tokens to line up",
  "Consulting several imaginary dashboards",
  "Reducing chaos to bullet points",
  "Finding the polite version",
  "Poking the syntax with a stick",
  "Turning maybe into probably",
  "Gathering loose semicolons",
  "Preparing a very normal answer",
  "Running the internal shrug test",
  "Checking if that actually makes sense",
  "Folding the context neatly",
  "Making a small plan look effortless",
  "Asking the schema nicely",
  "Removing unnecessary drama",
  "Scanning for suspicious assumptions",
  "Translating intent into action",
  "Waiting for the good token",
  "Doing a responsible amount of guessing",
  "Making the answer less wobbly",
  "Looking up from the token desk",
  "Rehearsing the concise version",
  "Trying not to overthink it",
  "Compressing thoughts without loss",
  "Checking the confidence meter",
  "Stirring the context gently",
  "Linting the idea before sending",
  "Selecting the least chaotic path",
  "Giving the answer a quick comb",
  "Running a tiny sanity check",
  "Putting the pieces in order",
  "Reading the invisible footnotes",
  "Making sure the nouns agree",
  "Consulting the very serious checklist",
  "Doing useful background noise",
  "Rearranging the mental furniture",
  "Finding a cleaner phrasing",
  "Waiting for the model to blink",
  "Checking if this is secretly simple",
  "Giving the prompt some space",
  "Solving the easy part first",
  "Comparing three almost identical options",
  "Looking busy, but productively",
  "Turning ambiguity into a plan",
  "Making sure this is not nonsense",
  "Assembling the answer sandwich",
  "Replacing hand-waving with specifics",
  "Counting reasons on one hand",
  "Looking for the missing comma",
  "Letting the context settle",
  "Consulting the imaginary runbook",
  "Drafting the answer in pencil",
  "Checking the boring but important part",
  "Waiting for the obvious thing to appear",
  "Rebalancing the token budget",
  "Making the response less crunchy",
  "Picking a lane",
  "Reading between the stack traces",
  "Turning the crank carefully",
  "Looking for a simpler explanation",
  "Making sure the button does button things",
  "Checking the corners",
  "Giving the answer a quick tap test",
  "Moving bits into tidy piles",
  "De-spaghettifying the thought process",
  "Waiting for inspiration, but typing anyway",
  "Choosing words with fewer surprises",
  "Running on structured optimism",
  "Filing the rough edges down",
  "Checking whether that belongs here",
  "Doing the part before the clever part",
  "Converting hunches into sentences",
  "Trying the direct route first",
  "Making the invisible work visible",
  "Looking for the shortest honest answer",
  "Turning scattered context into one thing",
  "Reviewing the plan for suspicious gaps",
  "Keeping the answer under control",
  "Making sure the data did not wander off",
  "Waiting for the last token to arrive",
  "Giving the response a final nudge",
  "Checking the map before walking",
  "Converting intent to pixels",
  "Avoiding the dramatic solution",
  "Making the state machine behave",
  "Assembling the tiny gears",
  "Checking the answer for loose screws",
  "Doing the quiet part out loud",
  "Turning input into progress",
  "Trying the obvious fix first",
  "Making the next step less mysterious",
  "Looking for the boring correct answer",
  "Holding the context steady",
  "Giving the tokens a pep talk",
  "Looking for a clean exit",
  "Something to do with a zebra? 🦓",
  "cet 🐱",
  "deg 🐶",
  "I am afraid I can't do this",
];

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
  const [thinkingMessage, setThinkingMessage] = useState(THINKING_MESSAGES[0]);
  const [thinkingDotCount, setThinkingDotCount] = useState(1);
  const [isChatListOpen, setIsChatListOpen] = useState(() => !chatIdFromUrl);
  const streamRef = useRef<EventSource | null>(null);
  const streamMessagesRef = useRef<ChatMessage[]>([]);
  const pendingAssistantDeltaRef = useRef<{ id: string; text: string } | null>(
    null,
  );
  const streamFlushTimeoutRef = useRef<number | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

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
  const hasCanonicalActiveTurnSettled = Boolean(
    activeTurnId &&
      events.data?.records.some(
        (event) =>
          event.chat_turn_id === activeTurnId &&
          event.payload.type === "turn-settled",
      ),
  );
  const activePrompts = events.data?.prompts ?? EMPTY_FORM_PROMPTS;
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
  const isWaitingForStream =
    isSending &&
    streamMessages.length > 0 &&
    !streamMessages.some((message) => message.role !== "user");

  const randomThinkingMessage = () => {
    const index = Math.floor(Math.random() * THINKING_MESSAGES.length);
    return THINKING_MESSAGES[index] ?? "Thinking";
  };

  useLayoutEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) {
      return;
    }

    transcript.scrollTop = transcript.scrollHeight;
  }, [
    selectedChatId,
    events.dataUpdatedAt,
    messages.length,
    lastMessage?.id,
    lastMessage?.text.length,
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
    if (!isWaitingForStream) {
      return;
    }

    setThinkingMessage(randomThinkingMessage());
    setThinkingDotCount(1);
    const intervalId = window.setInterval(() => {
      setThinkingMessage(randomThinkingMessage());
    }, 5000);
    const dotsIntervalId = window.setInterval(() => {
      setThinkingDotCount((count) => (count === 3 ? 1 : count + 1));
    }, 500);

    return () => {
      window.clearInterval(intervalId);
      window.clearInterval(dotsIntervalId);
    };
  }, [isWaitingForStream]);

  useEffect(() => {
    if (!chatIdFromUrl) {
      if (activeTurnId || streamMessages.length > 0) {
        return;
      }

      if (!isDraftChat) {
        closeStream();
        setSelectedChatId(null);
        setIsDraftChat(true);
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
      const assistantDeltaId = `stream-assistant-delta-${turnId}`;

      switch (payload.type) {
        case "assistant-delta":
          bufferAssistantDelta(assistantDeltaId, payload.text);
          break;
        case "assistant-message":
          updateBufferedStreamMessages((current) => [
            ...current,
            {
              id: `stream-assistant-message-${turnId}`,
              role: "assistant",
              text: textFromAssistant(payload),
              transient: true,
            },
          ]);
          flushBufferedStreamMessages();
          break;
        case "tool-input":
          updateBufferedStreamMessages((current) => [
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
          flushBufferedStreamMessages();
          break;
        case "tool-result":
          updateBufferedStreamMessages((current) => [
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
          flushBufferedStreamMessages();
          break;
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
    setStreamMessagesSnapshot([]);
    setStreamError(null);
    setIsChatListOpen(false);
    setUrlChatId(null);
  };

  const selectChat = (chatId: string) => {
    closeStream();
    setSelectedChatId(chatId);
    setIsDraftChat(false);
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
          <p className="error">
            Could not load transcript: {events.error.message}
          </p>
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
                {message.role === "assistant" && message.transient ? (
                  <p className="agent-streaming-text">{message.text}</p>
                ) : message.role === "assistant" ? (
                  <MarkdownMessage markdown={message.text} />
                ) : (
                  <p>{message.text}</p>
                )}
              </>
            )}
          </article>
        ))}
        {isWaitingForStream && (
          <article className="agent-message agent-message-system agent-thinking-message">
            <span aria-hidden="true" className="agent-thinking-spinner" />
            <span>
              {thinkingMessage}
              {".".repeat(thinkingDotCount)}
            </span>
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
        </form>
      )}
    </>
  );
}
