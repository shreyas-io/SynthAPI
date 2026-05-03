import type { IMockApisRepository } from "../../../../domain/entities/interfaces/repositories/mock_apis";
import type { DatabaseClient } from "../../index";
import { createMockApi } from "./create";
import { deleteMockApi } from "./delete";
import { list } from "./list";
import { updateMockApi } from "./update";

export const MockApisRepository = (
  client: DatabaseClient,
): IMockApisRepository => ({
  create: createMockApi(client),
  list: list(client),
  update: updateMockApi(client),
  delete: deleteMockApi(client),
});
