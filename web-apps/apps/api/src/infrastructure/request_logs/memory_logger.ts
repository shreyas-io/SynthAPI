import type { Kysely } from "kysely";

import type { Database } from "../kysely/models";
import type { IMockApiRequestLogger, MockApiRequestLogInput } from "./index";
import { persistRequestLog } from "./index";

export const createMemoryMockApiRequestLogger = (
  db: Kysely<Database>,
): IMockApiRequestLogger => {
  const queue: MockApiRequestLogInput[] = [];
  let running = false;
  let destroyed = false;

  const processQueue = async () => {
    if (running || destroyed) {
      return;
    }

    running = true;

    while (queue.length > 0) {
      const input = queue.shift()!;
      try {
        await persistRequestLog(db, input);
      } catch (error) {
        console.error("Failed to persist request log:", error);
      }
    }

    running = false;
  };

  return {
    async logRequest(input: MockApiRequestLogInput) {
      if (destroyed) {
        return;
      }
      queue.push(input);
      void processQueue();
    },
    async destroy() {
      destroyed = true;
      await processQueue();
    },
  };
};
