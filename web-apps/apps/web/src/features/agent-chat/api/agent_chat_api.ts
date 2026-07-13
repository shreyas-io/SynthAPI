import { apiBaseUrl } from "../../../env";
import { apiRequest } from "../../../lib/api/client";
import type { ListResponse } from "../../projects/types";
import type {
  ChatSession,
  ChatTurnEvent,
  ChatTurnEventsResponse,
  ChatTurnStatus,
} from "../types";

export const listProjectChats = (
  projectId: string,
): Promise<ListResponse<ChatSession>> => {
  return apiRequest(
    `/api/v1/projects/${projectId}/chats?limit=50&offset=0`,
  );
};

export const createProjectChat = (
  projectId: string,
  input: { name: string; description: string | null },
): Promise<ChatSession> => {
  return apiRequest(`/api/v1/projects/${projectId}/chats`, {
    method: "POST",
    body: input,
  });
};

export const createChatTurn = (
  projectId: string,
  chatId: string,
  input: {
    message?: string;
    files?: Array<{ id: string }>;
    mode?: "execution" | "planning";
  },
): Promise<{ id: string }> => {
  return apiRequest(`/api/v1/projects/${projectId}/chats/${chatId}/turns`, {
    method: "POST",
    body: input,
  });
};

export const getChatTurnStatus = (
  projectId: string,
  chatId: string,
  turnId: string,
): Promise<ChatTurnStatus> => {
  return apiRequest(
    `/api/v1/projects/${projectId}/chats/${chatId}/turns/${turnId}/status`,
  );
};

export const listChatTurnEvents = (
  projectId: string,
  chatId: string,
  pagination = { limit: 100, offset: 0 },
): Promise<ChatTurnEventsResponse> => {
  return apiRequest(
    `/api/v1/projects/${projectId}/chats/${chatId}/events?limit=${pagination.limit}&offset=${pagination.offset}`,
  );
};

export const getChatTurnStreamUrl = (
  projectId: string,
  chatId: string,
  turnId: string,
) => {
  return `${apiBaseUrl}/api/v1/projects/${projectId}/chats/${chatId}/turns/${turnId}/stream`;
};

export const deleteProjectChat = (
  projectId: string,
  chatId: string,
): Promise<void> => {
  return apiRequest(`/api/v1/projects/${projectId}/chats/${chatId}`, {
    method: "DELETE",
  });
};

export const cancelChatTurn = (
  projectId: string,
  chatId: string,
  turnId: string,
): Promise<void> => {
  return apiRequest(
    `/api/v1/projects/${projectId}/chats/${chatId}/turns/${turnId}/cancel`,
    {
      method: "POST",
    },
  );
};
