type QueryParamValue = string | string[];

export type QueryParams = Record<string, QueryParamValue>;

export type ExecutionContextEt = {
  header: Record<string, any>;
  query: QueryParams;
  body: Record<string, any>;
  path_param: Record<string, string>;
  cookie: Record<string, any>;
  url: string;
  request_method: string;
};
