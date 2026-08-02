import type { AuthenticatedUser } from "../../entities/authenticated_user";
import SwaggerParser from "@apidevtools/swagger-parser";
import * as yaml from "yaml";
import type { AppContext } from "../../../context";
import { ProjectsUsecase } from "./projects";
import { MockApisUsecase } from "./apis";
import { MockApiResponsesUsecase } from "./responses";
import {
  ApiGatewayException,
  HttpStatusCode,
} from "../../exceptions/exception";

export const OpenApiUsecase = (context: AppContext) => {
  const projects = ProjectsUsecase(context);
  const mockApis = MockApisUsecase(context);
  const mockApiResponses = MockApiResponsesUsecase(context);

  return {
    async importSpec(user: AuthenticatedUser, projectId: string, spec: string) {
      if (!user) throw new Error("Unauthorized");

      // Authorize and verify project
      const project = await projects.getProject(user, projectId);
      await projects.assertOrganizationWriteAccess(
        user,
        project.organization_id,
      );
      let parsedObj;
      try {
        parsedObj = yaml.parse(spec);
      } catch (e) {
        throw new ApiGatewayException({
          public_message: "Invalid JSON or YAML format.",
          status_code: HttpStatusCode.BAD_REQUEST,
        });
      }

      if (!parsedObj || typeof parsedObj !== "object") {
        throw new ApiGatewayException({
          public_message: "Invalid OpenAPI specification.",
          status_code: HttpStatusCode.BAD_REQUEST,
        });
      }

      let api: any;
      try {
        api = await SwaggerParser.dereference(parsedObj as any);
      } catch (e: any) {
        throw new ApiGatewayException({
          public_message: `Failed to dereference OpenAPI spec: ${e.message}`,
          status_code: HttpStatusCode.BAD_REQUEST,
        });
      }

      if (!api.paths) {
        throw new ApiGatewayException({
          public_message: "No paths defined in the OpenAPI spec.",
          status_code: HttpStatusCode.BAD_REQUEST,
        });
      }

      // Pre-check for conflicts to fail early
      const existingApis = await context.db
        .selectFrom("mock_apis")
        .select(["method", "path"])
        .where("project_id", "=", projectId)
        .where("deleted_at", "is", null)
        .execute();

      const existingSet = new Set(
        existingApis.map((a) => `${a.method.toUpperCase()} ${a.path}`),
      );

      const operationsToCreate: any[] = [];

      for (const [pathStr, pathItem] of Object.entries(api.paths)) {
        if (!pathItem || typeof pathItem !== "object") continue;
        const methods = [
          "get",
          "put",
          "post",
          "delete",
          "options",
          "head",
          "patch",
          "trace",
        ];
        for (const method of methods) {
          const operation = (pathItem as any)[method];
          if (operation) {
            // Convert path params like {id} to :id
            const mockApiPath = pathStr.replace(/\{([^}]+)\}/g, ":$1");
            const conflictKey = `${method.toUpperCase()} ${mockApiPath}`;
            if (existingSet.has(conflictKey)) {
              throw new ApiGatewayException({
                public_message: `Conflict detected: The endpoint ${conflictKey} already exists in this project. Import aborted.`,
                status_code: HttpStatusCode.BAD_REQUEST, // Changed to 400 since frontends usually handle 400 better for user errors
              });
            }
            operationsToCreate.push({ method, path: mockApiPath, operation });
          }
        }
      }

      // No conflicts found, begin generating.
      for (const op of operationsToCreate) {
        const mockApi = await mockApis.createMockApi(user, {
          project_id: projectId,
          method: op.method.toUpperCase(),
          path: op.path,
          name:
            op.operation.operationId ||
            op.operation.summary ||
            `${op.method.toUpperCase()} ${op.path}`,
          description: op.operation.description || "",
          variables: null,
        });

        const responses = op.operation.responses || {};
        let hasSetDefault = false;

        for (const [statusStr, responseObj] of Object.entries<any>(responses)) {
          // e.g. "200", "404", "default"
          let status = parseInt(statusStr, 10);
          if (isNaN(status)) {
            // if it's "default", maybe treat it as 200 or 500? Just use 200 for generic
            if (statusStr.toLowerCase() === "default") status = 200;
            else continue;
          }

          let responseBody: any = null;
          let responseHeaders: Record<string, string> = {};

          if (responseObj.headers) {
            for (const [hKey, hVal] of Object.entries<any>(
              responseObj.headers,
            )) {
              // Not generating sample header values for now to keep it simple, or could do:
              responseHeaders[hKey] = hVal.example || hVal.default || "string";
            }
          }

          if (responseObj.content && responseObj.content["application/json"]) {
            const schema = responseObj.content["application/json"].schema;
            if (schema) {
              responseBody = generateSampleFromSchema(schema);
            }
          }

          const isDefault = !hasSetDefault && status >= 200 && status < 300;
          if (isDefault) hasSetDefault = true;

          let bodyObj: any = { type: "empty" };
          if (responseBody !== null) {
            bodyObj = { type: "json", value: responseBody };
          }

          const responsePayload = {
            status_code: status,
            headers: responseHeaders,
            cookies: {},
            body: bodyObj,
          };

          await mockApiResponses.createMockApiResponse(user, {
            mock_api_id: mockApi.id,
            name: responseObj.description || `${status} Response`,
            is_default: isDefault,
            response: responsePayload as any,
            rule_tree: null,
            post_response_actions: null,
          });
        }
      }

      return { success: true, count: operationsToCreate.length };
    },
  };
};

function generateSampleFromSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  if (schema.type === "object") {
    const obj: any = {};
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries<any>(schema.properties)) {
        obj[key] = generateSampleFromSchema(propSchema);
      }
    }
    return obj;
  }
  if (schema.type === "array") {
    if (schema.items) {
      return [generateSampleFromSchema(schema.items)];
    }
    return [];
  }
  if (schema.type === "string") return "string";
  if (schema.type === "number" || schema.type === "integer") return 0;
  if (schema.type === "boolean") return true;
  return null;
}
