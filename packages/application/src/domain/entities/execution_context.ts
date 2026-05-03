type QueryParams = Record<string, string | string[]>;

export type ExecutionContext = {
  header: Record<string, any>;
  query: QueryParams;
  body: Record<string, any>;
  path_param: Record<string, string>;
  cookie: Record<string, any>;
  url: string;
  request_method: string;
};
