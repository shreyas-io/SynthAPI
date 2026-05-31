import type { IMockApisRepository } from "../../../../domain/interfaces/repositories/mockapis/mock_apis";
import type { DatabaseClient } from "../../index";
import { count } from "./count";
import { createMockApi } from "./create";
import { deleteMockApi } from "./delete";
import { list } from "./list";
import { updateMockApi } from "./update";

export const MockApisRepository = (
  client: DatabaseClient,
): IMockApisRepository => ({
  count: count(client),
  create: createMockApi(client),
  list: list(client),
  update: updateMockApi(client),
  delete: deleteMockApi(client),
});
