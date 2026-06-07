import { apiBaseUrl } from "../../env";

type ApiSuccess<T> = {
  status: "success";
  data: T;
};

type ApiFailure = {
  status: "error";
  error: {
    message: string;
  };
};

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiRequestInput = {
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
};

export const apiRequest = async <T>(
  path: string,
  input: ApiRequestInput = {},
): Promise<T> => {
  const headers = new Headers(input.headers);

  if (input.body) {
    headers.set("content-type", "application/json");
  }

  const request: RequestInit = {
    method: input.method ?? "GET",
    credentials: "include",
    headers,
  };

  if (input.body) {
    request.body = JSON.stringify(input.body);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, request);

  if (response.status === 204) {
    return undefined as T;
  }

  const json = (await response.json()) as ApiSuccess<T> | ApiFailure;

  if (!response.ok || json.status === "error") {
    throw new ApiError(
      response.status,
      json.status === "error" ? json.error.message : "Request failed",
    );
  }

  return json.data;
};
