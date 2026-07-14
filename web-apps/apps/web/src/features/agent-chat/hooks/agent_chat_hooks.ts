import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../lib/query/query_keys";
import {
  createChatTurn,
  createProjectChat,
  deleteProjectChat,
  cancelChatTurn,
  listChatTurnEvents,
  listProjectChats,
} from "../api/agent_chat_api";

export const useProjectChats = (projectId: string) => {
  return useQuery({
    queryKey: queryKeys.projectChats(projectId),
    queryFn: () => listProjectChats(projectId),
  });
};

export const useProjectChatEvents = (
  projectId: string,
  chatId: string | null,
  enabled: boolean,
) => {
  return useInfiniteQuery({
    queryKey: chatId
      ? queryKeys.projectChatEvents(projectId, chatId)
      : ["projects", projectId, "chats", "none", "events"],
    queryFn: ({ pageParam }) =>
      listChatTurnEvents(projectId, chatId!, { limit: 100, offset: pageParam as number }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.records.length === 100
        ? allPages.length * 100
        : undefined;
    },
    enabled,
  });
};

export const useCreateProjectChat = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; description: string | null }) =>
      createProjectChat(projectId, input),
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectChats(projectId),
      });
    },
  });
};

export const useCreateChatTurn = (projectId: string) => {
  return useMutation({
    mutationFn: (input: {
      chatId: string;
      message?: string;
      files?: Array<{ id: string }>;
    }) =>
      createChatTurn(projectId, input.chatId, {
        ...(input.message ? { message: input.message } : {}),
        ...(input.files?.length ? { files: input.files } : {}),
        mode: "execution",
      }),
  });
};

export const useRefetchProjectChatEvents = (projectId: string) => {
  const queryClient = useQueryClient();

  return (chatId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.projectChatEvents(projectId, chatId),
    });
};

export const useDeleteProjectChat = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => deleteProjectChat(projectId, chatId),
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectChats(projectId),
      });
    },
  });
};

export const useCancelChatTurn = (projectId: string) => {
  return useMutation({
    mutationFn: (input: { chatId: string; turnId: string }) =>
      cancelChatTurn(projectId, input.chatId, input.turnId),
  });
};
