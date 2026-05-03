type PostResponseActionValue =
  | string
  | number
  | boolean
  | null
  | any[]
  | Record<string, any>;

type SetGlobalAction = {
  type: "set";
  key: string;
  value?: PostResponseActionValue;
  value_template?: string;
  order: number;
};

type UnsetGlobalAction = {
  type: "unset";
  key: string;
  order: number;
};

type IncrementGlobalAction = {
  type: "increment";
  key: string;
  amount: number;
  order: number;
};

type DecrementGlobalAction = {
  type: "decrement";
  key: string;
  amount: number;
  order: number;
};

type AppendGlobalAction = {
  type: "append";
  key: string;
  value?: PostResponseActionValue;
  value_template?: string;
  order: number;
};

type RemoveFromGlobalAction = {
  type: "remove";
  key: string;
  value?: PostResponseActionValue;
  value_template?: string;
  order: number;
};

type ScriptPostResponseAction = {
  type: "script";
  language: "python";
  code: string;
  order: number;
};

type PostResponseAction =
  | SetGlobalAction
  | UnsetGlobalAction
  | IncrementGlobalAction
  | DecrementGlobalAction
  | AppendGlobalAction
  | RemoveFromGlobalAction
  | ScriptPostResponseAction;

export type PostResponseActionsEt = PostResponseAction[];
