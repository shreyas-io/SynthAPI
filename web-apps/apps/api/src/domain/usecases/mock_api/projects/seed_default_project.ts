import type { AppContext } from "../../../../server";
import type { AuthenticatedUser } from "../../../entities/authenticated_user";
import type { VariableEt } from "../../../entities/variables";
import { MockApisUsecase } from "../apis";
import { MockApiResponsesUsecase } from "../responses";
import { ProjectsUsecase } from ".";

const exampleApiProject = {
  name: "Example API",
  description: "Example blog POST mock API with rules and post actions.",
  globals: [
    { name: "posts_created", type: "number", value: 0 },
    { name: "last_created_title", type: "string", value: "" },
    { name: "last_script_action", type: "string", value: "" },
    { name: "audit_events", type: "array", value: [] },
  ] satisfies VariableEt[],
  constants: [
    { name: "api_version", type: "string", value: "v1" },
    { name: "service_name", type: "string", value: "blog-service" },
  ] satisfies VariableEt[],
};

const createExampleApiSlug = (organizationId: string) =>
  `example-api-${organizationId.replaceAll("-", "").slice(0, 12)}`;

export async function seed_default_project(
  ctx: AppContext,
  user: AuthenticatedUser,
  organization_id: string,
): Promise<void> {
  const slug = createExampleApiSlug(organization_id);
  const projectsUsecase = ProjectsUsecase(ctx);
  const existingProjects = await projectsUsecase.getProjects(
    user,
    { slug, organization_id },
    { limit: 1, offset: 0 },
    { by: "created_at", order: "asc" },
  );

  if (existingProjects.total > 0) {
    return;
  }

  const project = await projectsUsecase.createProject(user, {
    slug,
    name: exampleApiProject.name,
    description: exampleApiProject.description,
    globals: exampleApiProject.globals,
    constants: exampleApiProject.constants,
    organization_id,
  });

  const mockApisUsecase = MockApisUsecase(ctx);
  const mockApi = await mockApisUsecase.createMockApi({
    project_id: project.id,
    method: "POST",
    path: "/posts",
    name: "Create blog post",
    description: "Creates a post when auth and title are present.",
    variables: [{ name: "create_attempts", type: "number", value: 0 }],
  });

  const responsesUsecase = MockApiResponsesUsecase(ctx);
  await responsesUsecase.createMockApiResponse({
    mock_api_id: mockApi.id,
    name: "Post created",
    is_default: false,
    response: {
      status_code: 201,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: {
          id: "generated-201",
          title: "Created blog post",
          status: "draft",
        },
      },
    },
    rule_tree: {
      label: "valid authenticated create",
      type: "and",
      predicates: [
        {
          label: "authorization present",
          type: "simple",
          actual: "{{request.headers.authorization}}",
          operator: "string_not_empty",
        },
      ],
      children: [
        {
          label: "title present branch",
          type: "and",
          predicates: [
            {
              label: "title present",
              type: "simple",
              actual: "{{request.body.value.title}}",
              operator: "string_not_empty",
            },
          ],
          children: [
            {
              label: "allowed content type",
              type: "or",
              predicates: [
                {
                  label: "json content type",
                  type: "simple",
                  actual: "{{request.headers.content-type}}",
                  operator: "string_includes",
                  expected: "application/json",
                },
                {
                  label: "missing content type is okay in local demos",
                  type: "simple",
                  actual: "{{request.headers.content-type}}",
                  operator: "is_not_set",
                },
              ],
              children: [],
            },
          ],
        },
      ],
    },
    post_response_actions: [
      {
        type: "increment",
        scope: "global",
        key: "posts_created",
        amount: 1,
        order: 1,
      },
      {
        type: "set",
        scope: "global",
        key: "last_created_title",
        value: "{{request.body.value.title}}",
        order: 2,
      },
      {
        type: "append",
        scope: "global",
        key: "audit_events",
        value: "created:{{request.body.value.title}}",
        order: 3,
      },
      {
        type: "script",
        language: "python",
        code: `return [
  {"type": "set", "scope": "global", "key": "last_script_action", "value": "post_created_script", "order": 1}
]`,
        order: 4,
      },
    ],
  });

  await responsesUsecase.createMockApiResponse({
    mock_api_id: mockApi.id,
    name: "Invalid create payload",
    is_default: true,
    response: {
      status_code: 422,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: { error: "Title is required" },
      },
    },
    rule_tree: {
      label: "missing title",
      type: "and",
      predicates: [
        {
          label: "title empty",
          type: "simple",
          actual: "{{request.body.value.title}}",
          operator: "string_empty",
        },
      ],
      children: [],
    },
    post_response_actions: [
      {
        type: "increment",
        scope: "local",
        key: "create_attempts",
        amount: 1,
        order: 1,
      },
    ],
  });

  await responsesUsecase.createMockApiResponse({
    mock_api_id: mockApi.id,
    name: "Unauthorized create",
    is_default: false,
    response: {
      status_code: 401,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: { error: "Authorization header required" },
      },
    },
    rule_tree: {
      label: "missing authorization",
      type: "and",
      predicates: [
        {
          label: "authorization empty",
          type: "simple",
          actual: "{{request.headers.authorization}}",
          operator: "string_empty",
        },
      ],
      children: [],
    },
    post_response_actions: [
      {
        type: "increment",
        scope: "local",
        key: "create_attempts",
        amount: 1,
        order: 1,
      },
    ],
  });
}
