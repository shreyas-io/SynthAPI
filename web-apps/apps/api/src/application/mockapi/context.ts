import type { IKeyValueStore } from "../../domain/interfaces/kv_store";
import type { ApiGatewayDatabase } from "../../infrastructure/kysely";
import type { PyodideWorkerPool } from "../../infrastructure/pyodide";

export type MockApiContext = {
  database: ApiGatewayDatabase;
  keyValueStore: IKeyValueStore;
  pyodide: PyodideWorkerPool;
};
