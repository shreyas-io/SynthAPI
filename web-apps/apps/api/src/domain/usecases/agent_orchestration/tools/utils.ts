import type { AppContext } from "../../../../application/agent_orchestration/context";
import {
  AgentOrchestrationException,
  HttpStatusCode,
} from "../../../exceptions/exception";
import type { MockApiEt } from "../../../entities/mock_api";
import type { MockApiResponseEt } from "../../../entities/mock_api_response/mock_api_response";
import type { ProjectEt } from "../../../entities/project";

export const toJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const assertProject = (
  project: ProjectEt,
  project_id: string,
): ProjectEt => {
  if (project.id !== project_id) {
    throw new AgentOrchestrationException({
      public_message: "Project is outside the active workspace.",
      status_code: HttpStatusCode.NOT_FOUND,
    });
  }

  return project;
};

export const assertMockApi = (
  mock_api: MockApiEt,
  project_id: string,
): MockApiEt => {
  if (mock_api.project_id !== project_id) {
    throw new AgentOrchestrationException({
      public_message: "Mock API is outside the active workspace.",
      status_code: HttpStatusCode.NOT_FOUND,
    });
  }

  return mock_api;
};

export const assertMockApiResponse = (
  response: MockApiResponseEt,
  mock_api: MockApiEt,
  project_id: string,
): MockApiResponseEt => {
  assertMockApi(mock_api, project_id);
  if (response.mock_api_id !== mock_api.id) {
    throw new AgentOrchestrationException({
      public_message: "Mock API response does not belong to the target mock API.",
      status_code: HttpStatusCode.NOT_FOUND,
    });
  }

  return response;
};
