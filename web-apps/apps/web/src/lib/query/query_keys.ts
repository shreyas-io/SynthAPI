export const queryKeys = {
  authUser: ["auth", "me"] as const,
  authProviders: ["auth", "providers"] as const,
  profile: ["profile"] as const,
  organizationCredits: (organizationId: string) =>
    ["organizations", organizationId, "credits"] as const,
  organizationMembers: (organizationId: string) =>
    ["organizations", organizationId, "members"] as const,
  organizationInvites: (organizationId: string) =>
    ["organizations", organizationId, "invites"] as const,
  projectListRoot: (organizationId: string) => ["projects", organizationId] as const,
  projects: (
    organizationId: string,
    params?: Record<string, string | number | boolean | undefined>,
  ) => ["projects", organizationId, params ?? {}] as const,
  project: (id: string) => ["projects", "detail", id] as const,
  projectChats: (projectId: string) => ["projects", projectId, "chats"] as const,
  projectChatEvents: (projectId: string, chatId: string) =>
    ["projects", projectId, "chats", chatId, "events"] as const,
  mockApis: (projectId: string) => ["projects", projectId, "mock-apis"] as const,
  mockApi: (id: string) => ["mock-apis", id] as const,
  mockApiResponses: (mockApiId: string) =>
    ["mock-apis", mockApiId, "responses"] as const,
  mockApiResponse: (mockApiId: string, responseId: string) =>
    ["mock-apis", mockApiId, "responses", responseId] as const,
};
