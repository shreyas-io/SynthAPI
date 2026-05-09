import { sql, type Kysely } from "kysely";

const project = {
  id: "0196f3b0-0000-7000-8000-000000000001",
  slug: "realistic-blog-api-seed",
  name: "Realistic Blog API",
  description: "Seeded blog POST mock API with rules and post actions.",
  globals: [
    { name: "posts_created", type: "number", value: 0 },
    { name: "last_created_title", type: "string", value: "" },
    { name: "last_script_action", type: "string", value: "" },
    { name: "audit_events", type: "array", value: [] },
  ],
  constants: [
    { name: "api_version", type: "string", value: "v1" },
    { name: "service_name", type: "string", value: "blog-service" },
  ],
};

const mockApis = [
  {
    id: "0196f3b0-0000-7000-8000-000000000103",
    method: "POST",
    path: "/posts",
    name: "Create blog post",
    description: "Creates a post when auth and title are present.",
    variables: [{ name: "create_attempts", type: "number", value: 0 }],
  },
];

const responses = [
  {
    id: "0196f3b0-0000-7000-8000-000000000207",
    mock_api_id: mockApis[0]!.id,
    name: "Post created",
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
    post_response_actions: [
      { type: "increment", scope: "global", key: "posts_created", amount: 1, order: 1 },
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
        code: `[
  {"type": "set", "scope": "global", "key": "last_script_action", "value": "post_created_script", "order": 1}
]`,
        order: 4,
      },
    ],
    created_at: "2026-05-09T00:00:03.000Z",
  },
  {
    id: "0196f3b0-0000-7000-8000-000000000208",
    mock_api_id: mockApis[0]!.id,
    name: "Invalid create payload",
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
      { type: "increment", scope: "local", key: "create_attempts", amount: 1, order: 1 },
    ],
    created_at: "2026-05-09T00:00:02.000Z",
  },
  {
    id: "0196f3b0-0000-7000-8000-000000000209",
    mock_api_id: mockApis[0]!.id,
    name: "Unauthorized create",
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
      { type: "increment", scope: "local", key: "create_attempts", amount: 1, order: 1 },
    ],
    created_at: "2026-05-09T00:00:01.000Z",
  },
];

const jsonb = (value: unknown) => sql`${JSON.stringify(value)}::jsonb`;

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    insert into projects (id, slug, name, description, globals, constants)
    values (
      ${project.id},
      ${project.slug},
      ${project.name},
      ${project.description},
      ${jsonb(project.globals)},
      ${jsonb(project.constants)}
    )
    on conflict (id) do nothing
  `.execute(db);

  for (const mockApi of mockApis) {
    await sql`
      insert into mock_apis (id, project_id, method, path, name, description, variables)
      values (
        ${mockApi.id},
        ${project.id},
        ${mockApi.method},
        ${mockApi.path},
        ${mockApi.name},
        ${mockApi.description},
        ${jsonb(mockApi.variables)}
      )
      on conflict (id) do nothing
    `.execute(db);
  }

  for (const response of responses) {
    await sql`
      insert into mock_api_responses (
        id,
        mock_api_id,
        name,
        response,
        rule_tree,
        post_response_actions,
        created_at,
        updated_at
      )
      values (
        ${response.id},
        ${response.mock_api_id},
        ${response.name},
        ${jsonb(response.response)},
        ${response.rule_tree === null ? null : jsonb(response.rule_tree)},
        ${
          response.post_response_actions === null
            ? null
            : jsonb(response.post_response_actions)
        },
        ${response.created_at},
        ${response.created_at}
      )
      on conflict (id) do nothing
    `.execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    delete from projects
    where id = ${project.id}
  `.execute(db);
}
