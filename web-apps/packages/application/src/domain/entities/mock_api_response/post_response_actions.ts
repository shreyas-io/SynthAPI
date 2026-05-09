type PostResponseActionValue =
  | string
  | number
  | boolean
  | null
  | any[]
  | Record<string, any>;

type VariableScope = "global" | "local";

type SetVariableAction = {
  type: "set";
  scope: VariableScope;
  key: string;
  value: PostResponseActionValue;
  order: number;
};

type UnsetVariableAction = {
  type: "unset";
  scope: VariableScope;
  key: string;
  order: number;
};

type IncrementVariableAction = {
  type: "increment";
  scope: VariableScope;
  key: string;
  amount: number;
  order: number;
};

type DecrementVariableAction = {
  type: "decrement";
  scope: VariableScope;
  key: string;
  amount: number;
  order: number;
};

type AppendVariableAction = {
  type: "append";
  scope: VariableScope;
  key: string;
  value: PostResponseActionValue;
  order: number;
};

type RemoveFromVariableAction = {
  type: "remove";
  scope: VariableScope;
  key: string;
  value: PostResponseActionValue;
  order: number;
};

type ScriptPostResponseAction = {
  type: "script";
  language: "python";
  code: string;
  order: number;
};

type PostResponseAction =
  | SetVariableAction
  | UnsetVariableAction
  | IncrementVariableAction
  | DecrementVariableAction
  | AppendVariableAction
  | RemoveFromVariableAction
  | ScriptPostResponseAction;

export type PostResponseActionsEt = PostResponseAction[];
