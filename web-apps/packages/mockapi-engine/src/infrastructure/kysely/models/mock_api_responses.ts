import type { ColumnType } from "kysely";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type JsonObject = Record<string, any>;

export type MockApiResponsesTable = {
  id: ColumnType<string, string | undefined, never>;
  mock_api_id: string;
  name: string;
  is_default: ColumnType<boolean, boolean | undefined, boolean>;
  response: ColumnType<JsonObject, JsonObject | string, JsonObject | string>;
  rule_tree: ColumnType<
    JsonObject,
    JsonObject | string | undefined,
    JsonObject | string
  >;
  post_response_actions: ColumnType<
    JsonObject,
    JsonObject | string | undefined,
    JsonObject | string
  >;
  created_at: Timestamp;
  updated_at: Timestamp;
};
