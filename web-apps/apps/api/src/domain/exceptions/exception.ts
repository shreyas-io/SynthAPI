export enum HttpStatusCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  PRECONDITION_FAILED = 412,
  INTERNAL_SERVER_ERROR = 500,
}

type ApiGatewayExceptionInput = {
  public_message: string;
  message?: string;
  status_code?: HttpStatusCode;
  cause?: unknown;
};

export class ApiGatewayException extends Error {
  readonly public_message: string;
  readonly status_code: HttpStatusCode;

  constructor(input: ApiGatewayExceptionInput) {
    super(input.message ?? input.public_message, { cause: input.cause });

    this.name = "ApiGatewayException";
    this.public_message = input.public_message;
    this.status_code =
      input.status_code ?? HttpStatusCode.INTERNAL_SERVER_ERROR;
  }
}

export class MockApiException extends ApiGatewayException {
  constructor(input: ApiGatewayExceptionInput) {
    super(input);
    this.name = "MockApiException";
  }
}

export class AgentOrchestrationException extends ApiGatewayException {
  constructor(input: ApiGatewayExceptionInput) {
    super(input);
    this.name = "AgentOrchestrationException";
  }
}
