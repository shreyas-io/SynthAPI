type StringParameters = {
  type: "string";
  description: string;
};

type NumberParameters = {
  type: "number";
  description: string;
};

type ArrayParameters = {
  type: "array";
  description: string;
  items: ObjectParameters;
};

type ObjectParameters = {
  type: "object";
  description: string;
  properties: Record<
    string,
    ObjectParameters | StringParameters | NumberParameters | ArrayParameters
  >;
  required: Array<string>;
};

import type { ToolKey } from "./tool_keys";

export type ToolDefinition = {
  name: ToolKey;
  description: string;
  input_schema: ObjectParameters;
};
