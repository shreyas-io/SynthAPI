type QueryParamValue = string | string[];

export type QueryParams = Record<string, QueryParamValue>;

export type ExecutionContextEt = {
  request: {
    url: string;
    method: string;
    header: Record<string, any>;
    query: QueryParams;
    body: Record<string, any>;
    path_param: Record<string, string>;
    cookie: Record<string, any>;
  };
  response: {
    status_code: number;
    header: Record<string, any>;
    body: Record<string, any>;
    cookie: Record<string, any>;
  };
  // globals and constants are part of the project
  globals: Record<string, any>;
  constants: Record<string, any>;
  /**
   * Variables are part of the request scope.
   * Variables should be reset after 1 hour of the last usage of the request.
   * Default value for variables will be stored as part of request config.
   * When a new request comes in, first check if all variables exist in redis. If they do, just renew their TTL.
   * Else, create new ones with defaults
   * */
  variables: Record<string, any>;
  /**
   * System is part of the request. Can contain following details:
   *
   * call_count: 12
   * last_called_at: "2026-05-03T10:00:00.000Z"
   * sequential_index: 3
   * */
  system: Record<string, any>;
};
