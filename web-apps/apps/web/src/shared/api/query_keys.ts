export const queryKeys = {
  authUser: ["auth", "me"] as const,
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,
  mockApis: (projectId: string) => ["projects", projectId, "mock-apis"] as const,
  mockApi: (id: string) => ["mock-apis", id] as const,
  mockApiResponses: (mockApiId: string) =>
    ["mock-apis", mockApiId, "responses"] as const,
  mockApiResponse: (mockApiId: string, responseId: string) =>
    ["mock-apis", mockApiId, "responses", responseId] as const,
};
