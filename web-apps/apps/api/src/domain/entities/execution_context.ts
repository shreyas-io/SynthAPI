import type { SseBodyEt } from "./mock_api_response/sse";

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

export type JsonScriptBody = {
  type: "json_script";
  code: string;
};

export type MultipartFileField = {
  field_type: "file";
  filename: string;
  mime_type: string;
  encoding: string;
  size_bytes: number;
  content_base64: string;
};

export type MultipartTextField = {
  field_type: "text";
  value: string;
};

export type MultipartField = MultipartFileField | MultipartTextField;

export type MultipartBody = {
  type: "multipart";
  value: Record<string, MultipartField | MultipartField[]>;
};

export type BinaryBody = {
  type: "binary";
  value: {
    mime_type: string;
    size_bytes: number;
    content_base64: string;
  };
};

export type RequestBodyEt =
  | JsonBody
  | TextBody
  | FormUrlEncodedBody
  | MultipartBody
  | BinaryBody
  | EmptyBody;

export type ResponseBodyEt = JsonBody | TextBody | EmptyBody;
export type ConfiguredResponseBodyEt = JsonBody | TextBody | EmptyBody | SseBodyEt | JsonScriptBody;

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
    body: ConfiguredResponseBodyEt;
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
