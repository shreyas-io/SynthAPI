export type ExecutionContext = {
  header: Record<string, any>;
  query: Record<string, string>;
  body: Record<string, any>;
  path_param: Record<string, string>;
  cookie: Record<string, any>;
  url: string;
  request_method: string;
};
