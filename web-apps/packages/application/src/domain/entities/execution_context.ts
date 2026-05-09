type QueryParamValue = string | string[];

export type QueryParams = Record<string, QueryParamValue>;

export type FormUrlEncodedBody = {
  type: "form_urlencoded";
  value: Record<string, string | string[]>;
};

export type EmptyBody = {
  type: "empty";
};

export type JsonBody = {
  type: "json";
  value: any;
};

export type TextBody = {
  type: "text";
  value: string;
};

export type RequestBodyEt =
  | JsonBody
  | TextBody
  | FormUrlEncodedBody
  | EmptyBody;

export type ResponseBodyEt = JsonBody | TextBody | EmptyBody;

export type ExecutionContextEt = {
  request: {
    url: string;
    method: string;
    headers: Record<string, any>;
    query_params: QueryParams;
    body: RequestBodyEt;
    path_params: Record<string, string>;
    cookies: Record<string, any>;
  };
  response: {
    status_code: number;
    headers: Record<string, any>;
    body: ResponseBodyEt;
    cookies: Record<string, any>;
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
};
