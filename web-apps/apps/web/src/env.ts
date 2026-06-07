export const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787/mock-stack"
).replace(/\/$/, "");
