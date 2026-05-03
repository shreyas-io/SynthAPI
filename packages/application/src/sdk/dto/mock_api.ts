import z from "zod";

export const create_mock_api_dto = z.object({
  method: z.uuid(),
  path: z.string(),
  name: z.string(),
  description: z.string().optional(),
  project_id: z.uuid(),
});

export const create_mock_api_response_dto = z.object({
  mock_api_id: z.uuid(),
  name: z.string(),
  status_code: z.number(),
  headers: z.record(z.string(), z.any()),
  body: z.record(z.string(), z.any()),
  latency_ms: 100,
});
