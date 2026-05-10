export enum HttpStatusCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}

type AgentOrchestrationExceptionInput = {
  public_message: string;
  message?: string;
  status_code?: HttpStatusCode;
  cause?: unknown;
};

export class AgentOrchestrationException extends Error {
  readonly public_message: string;
  readonly status_code: HttpStatusCode;

  constructor(input: AgentOrchestrationExceptionInput) {
    super(input.message ?? input.public_message, { cause: input.cause });

    this.name = "AgentOrchestrationException";
    this.public_message = input.public_message;
    this.status_code =
      input.status_code ?? HttpStatusCode.INTERNAL_SERVER_ERROR;
  }
}
