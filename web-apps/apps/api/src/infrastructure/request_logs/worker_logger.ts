import type { Kysely } from "kysely";

import type { Database } from "../kysely/models";
import type { IMockApiRequestLogger, MockApiRequestLogInput } from "./index";
import { persistRequestLog } from "./index";

export const createWorkerMockApiRequestLogger = (
  db: Kysely<Database>,
): IMockApiRequestLogger => ({
  async logRequest(input: MockApiRequestLogInput): Promise<void> {
    await persistRequestLog(db, input);
  },
  async destroy(): Promise<void> {},
});
