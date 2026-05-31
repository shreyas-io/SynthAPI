import type { IMockApiResponsesRepository } from "../../../../domain/interfaces/repositories/mockapis/mock_api_responses";
import type { DatabaseClient } from "../../index";
import { count } from "./count";
import { createMockApiResponse } from "./create";
import { deleteMockApiResponse } from "./delete";
import { list } from "./list";
import { updateMockApiResponse } from "./update";

export const MockApiResponsesRepository = (
  client: DatabaseClient,
): IMockApiResponsesRepository => ({
  count: count(client),
  create: createMockApiResponse(client),
  list: list(client),
  update: updateMockApiResponse(client),
  delete: deleteMockApiResponse(client),
});
