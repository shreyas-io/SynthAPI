import type { AppContext } from "../../../../context";
import type { AuthenticatedUser } from "../../../entities/authenticated_user";
import type { VariableEt } from "../../../entities/variables";
import { MockApisUsecase } from "../apis";
import { MockApiResponsesUsecase } from "../responses";
import { ProjectsUsecase } from ".";
import type { SseStreamItemEt } from "../../../entities/mock_api_response/sse";

const createSlug = (base: string, organizationId: string) =>
  `${base}-${organizationId.replaceAll("-", "").slice(0, 12)}`;

const synthApiDescription = `SynthAPI is the ultimate platform for developers, testers, and architects who need to simulate complex backend systems with ease. In modern software development, dependencies on external APIs, third-party services, and microservices often become bottlenecks. SynthAPI solves this by providing a robust, highly configurable mock server that can replicate any behavior you need. At its core, SynthAPI allows you to create 'Mock Stacks'—isolated environments that contain collections of mock endpoints. Each endpoint can be configured with multiple conditional responses. This is where the power of SynthAPI truly shines. Using our intuitive 'Rule Tree' system, you can define exactly when a specific response should be returned based on incoming request headers, body content, query parameters, or even the current state of global and local variables. For example, you can simulate a payment gateway that returns a 'Success' response for certain credit card numbers, a 'Declined' response for others, and a 'Timeout' error to test your application's resilience. The Rule Tree supports complex logic using 'AND' and 'OR' gates, allowing you to build sophisticated decision-making structures without writing a single line of code. But SynthAPI goes beyond just static responses. Our 'Post-Response Actions' enable your mock APIs to be stateful. You can increment counters, set global variables, or append data to arrays after a response is sent. This allows you to simulate entire workflows, such as a user registration process where the first call creates a user and subsequent calls check for that user's existence. For advanced users, we offer Python-based script actions. This allows you to inject custom logic into your mock environment, performing complex calculations or data transformations that are then used in subsequent responses. SynthAPI also supports modern communication protocols like Server-Sent Events (SSE). Our SSE builder allows you to simulate real-time data streams, such as live stock tickers, progress bars, or, as demonstrated here, LLM text generation. You can define a sequence of events, each with its own delay, to perfectly mimic the behavior of a real-time system. Our platform is designed with collaboration in mind. Organizations can manage multiple projects, invite team members, and share mock stacks effortlessly. With built-in versioning and environment-specific configurations, SynthAPI fits perfectly into your CI/CD pipeline, ensuring that your tests are always reliable and independent of external service availability. Security and performance are our top priorities. SynthAPI is built on a high-performance stack, ensuring minimal latency even under heavy load. We provide granular access control and secure cookie management to ensure your data stays protected. Whether you are a solo developer building a prototype or a large enterprise managing hundreds of microservices, SynthAPI provides the tools you need to accelerate your development cycle and build more resilient software. By decoupling your front-end and back-end development, SynthAPI allows teams to work in parallel, significantly reducing time-to-market. In conclusion, SynthAPI is not just a mock server; it is a comprehensive API orchestration and simulation platform. It empowers developers to take control of their development environment, providing the flexibility and power needed to tackle the challenges of modern software architecture. Join the thousands of developers who are already using SynthAPI to build the future of software.`;

export async function seed_default_project(
  ctx: AppContext,
  user: AuthenticatedUser,
  organization_id: string,
): Promise<void> {
  const projectsUsecase = ProjectsUsecase(ctx);
  const mockApisUsecase = MockApisUsecase(ctx);
  const responsesUsecase = MockApiResponsesUsecase(ctx);

  // --- PROJECT 1: Mock LLM ---
  const llmSlug = createSlug("mock-llm", organization_id);
  
  const llmProject = await projectsUsecase.createProject(user, {
    slug: llmSlug,
    name: "Mock LLM",
    description: "Simulation of an LLM provider with streaming and non-streaming endpoints.",
    organization_id,
    globals: [],
    constants: [{ name: "expected_api_key", type: "string", value: "sk-synth-12345" }] satisfies VariableEt[],
  });

  // 1.1 Non-streaming generation
  const chatApi = await mockApisUsecase.createMockApi(user, {
    project_id: llmProject.id,
    method: "POST",
    path: "/v1/chat/completions",
    name: "Chat Completions",
    description: "Returns a static JSON response for chat completions.",
    variables: [],
  });

  // Unauthorized response
  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: chatApi.id,
    execution_order: 1,
    name: "Unauthorized",
    is_default: false,
    response: {
      status_code: 401,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: {
          error: "Invalid API key.",
        },
      },
    },
    rule_tree: {
      label: "Unauthenticated",
      type: "or",
      predicates: [
        {
          label: "Invalid API Key",
          type: "simple",
          actual: "{{request.headers.x-api-key}}",
          operator: "not_equals",
          expected: "{{constants.expected_api_key}}",
        },
      ],
      children: [],
    },
    post_response_actions: [],
  });

  // Invalid Request Body response
  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: chatApi.id,
    execution_order: 2,
    name: "Invalid Parameters",
    is_default: false,
    response: {
      status_code: 400,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: {
          error: "Missing required parameters (model, messages).",
        },
      },
    },
    rule_tree: {
      label: "Invalid Body",
      type: "or",
      predicates: [
        {
          label: "Model empty",
          type: "simple",
          actual: "{{request.body.value.model}}",
          operator: "string_empty",
        },
        {
          label: "Messages empty",
          type: "simple",
          actual: "{{request.body.value.messages}}",
          operator: "empty_array",
        },
      ],
      children: [],
    },
    post_response_actions: [],
  });

  // Success response
  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: chatApi.id,
    execution_order: 3,
    name: "Successful Completion",
    is_default: true,
    response: {
      status_code: 200,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: {
          id: "chatcmpl-{{request.id}}",
          object: "chat.completion",
          created: 1677652288,
          model: "{{request.body.value.model}}",
          choices: [{ message: { role: "assistant", content: "SynthAPI is an excellent tool for mocking APIs." }, finish_reason: "stop", index: 0 }],
          usage: { prompt_tokens: 9, completion_tokens: 12, total_tokens: 21 }
        },
      },
    },
    rule_tree: null,
    post_response_actions: [],
  });

  // 1.2 Streaming generation
  const streamApi = await mockApisUsecase.createMockApi(user, {
    project_id: llmProject.id,
    method: "POST",
    path: "/v1/chat/completions/stream",
    name: "Streaming Chat Completions",
    description: "Streams a word-by-word response via SSE.",
    variables: [],
  });

  const words = synthApiDescription.split(" ").slice(0, 100);
  const sseEvents: SseStreamItemEt[] = words.map((word, i) => ({
    delay_ms: i === 0 ? 100 : 30,
    sse: { event: "message", data: { chunk: i === 0 ? word : " " + word } },
  }));
  sseEvents.push({ delay_ms: 200, sse: { event: "done", data: { status: "finished", usage: { input_tokens: 15, output_tokens: words.length } } } });

  // Unauthorized response
  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: streamApi.id,
    execution_order: 1,
    name: "Unauthorized",
    is_default: false,
    response: {
      status_code: 401,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: {
          error: "Invalid API key.",
        },
      },
    },
    rule_tree: {
      label: "Unauthenticated",
      type: "or",
      predicates: [
        {
          label: "Invalid API Key",
          type: "simple",
          actual: "{{request.headers.x-api-key}}",
          operator: "not_equals",
          expected: "{{constants.expected_api_key}}",
        },
      ],
      children: [],
    },
    post_response_actions: [],
  });

  // Invalid Parameters response
  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: streamApi.id,
    execution_order: 2,
    name: "Invalid Parameters",
    is_default: false,
    response: {
      status_code: 400,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: {
          error: "Missing required parameters (model, temperature <= 2).",
        },
      },
    },
    rule_tree: {
      label: "Invalid Body",
      type: "or",
      predicates: [
        {
          label: "Temperature > 2",
          type: "simple",
          actual: "{{request.body.value.temperature}}",
          operator: "gt",
          expected: 2,
        },
        {
          label: "Model empty",
          type: "simple",
          actual: "{{request.body.value.model}}",
          operator: "string_empty",
        },
      ],
      children: [],
    },
    post_response_actions: [],
  });

  // Success stream response
  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: streamApi.id,
    execution_order: 3,
    name: "Text generation stream",
    is_default: true,
    response: {
      status_code: 200,
      headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
      cookies: {},
      body: { type: "sse", mode: "events", events: sseEvents },
    },
    rule_tree: null,
    post_response_actions: [],
  });

  // --- PROJECT 2: Blog CRUD ---
  const blogSlug = createSlug("blog-api", organization_id);

  const blogProject = await projectsUsecase.createProject(user, {
    slug: blogSlug,
    name: "Blog CRUD API",
    description:
      "A complete blog management system with posts CRUD and stateful behavior.",
    organization_id,
    globals: [
      { name: "posts", type: "object", value: {} },
      { name: "next_id", type: "number", value: 1 },
      { name: "total_posts", type: "number", value: 0 },
    ] satisfies VariableEt[],
    constants: [
      {
        name: "auth_token",
        type: "string",
        value: "Bearer synth-secret-token",
      },
    ] satisfies VariableEt[],
  });

  // 2.1 List Posts
  const listApi = await mockApisUsecase.createMockApi(user, {
    project_id: blogProject.id,
    method: "GET",
    path: "/posts",
    name: "List Posts",
    description: "Returns a list of blog posts.",
    variables: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: listApi.id,
    execution_order: 1,
    name: "Unauthorized",
    is_default: false,
    response: {
      status_code: 401,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: { type: "json", value: { error: "Valid Bearer token required." } },
    },
    rule_tree: {
      label: "Unauthenticated",
      type: "or",
      predicates: [
        {
          label: "Invalid Auth Token",
          type: "simple",
          actual: "{{request.headers.authorization}}",
          operator: "not_equals",
          expected: "{{constants.auth_token}}",
        },
      ],
      children: [],
    },
    post_response_actions: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: listApi.id,
    execution_order: 2,
    name: "Success",
    is_default: true,
    response: {
      status_code: 200,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json_script",
        code: `
posts_map = globals.get("posts", {})
all_posts = list(posts_map.values())

query_params = request.get("query_params", {})
page = int(query_params.get("page", 1))
limit = int(query_params.get("limit", 10))

offset = (page - 1) * limit
paginated_posts = all_posts[offset : offset + limit]

return {
    "data": paginated_posts,
    "meta": {
        "total": len(all_posts),
        "page": page,
        "limit": limit
    }
}
`,
      },
    },
    rule_tree: null,
    post_response_actions: [],
  });

  // 2.2 Get Single Post
  const getSingleApi = await mockApisUsecase.createMockApi(user, {
    project_id: blogProject.id,
    method: "GET",
    path: "/posts/:id",
    name: "Get Post",
    description: "Returns a single blog post by ID.",
    variables: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: getSingleApi.id,
    execution_order: 1,
    name: "Unauthorized",
    is_default: false,
    response: {
      status_code: 401,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: { type: "json", value: { error: "Valid Bearer token required." } },
    },
    rule_tree: {
      label: "Unauthenticated",
      type: "or",
      predicates: [
        {
          label: "Invalid Auth Token",
          type: "simple",
          actual: "{{request.headers.authorization}}",
          operator: "not_equals",
          expected: "{{constants.auth_token}}",
        },
      ],
      children: [],
    },
    post_response_actions: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: getSingleApi.id,
    execution_order: 2,
    name: "Not Found",
    is_default: false,
    response: {
      status_code: 404,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: {
          error: "Post not found.",
        },
      },
    },
    rule_tree: {
      label: "Invalid ID",
      type: "or",
      predicates: [
        {
          label: "Check ID exists",
          type: "custom",
          script: `
posts = globals.get("posts", {})
post_id = str(request.get("path_params", {}).get("id"))
return post_id not in posts
`,
        },
      ],
      children: [],
    },
    post_response_actions: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: getSingleApi.id,
    execution_order: 3,
    name: "Success",
    is_default: true,
    response: {
      status_code: 200,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json_script",
        code: `
posts_map = globals.get("posts", {})
path_params = request.get("path_params", {})
return posts_map.get(str(path_params.get("id")))
`,
      },
    },
    rule_tree: null,
    post_response_actions: [],
  });

  // 2.3 Create Post
  const createApi = await mockApisUsecase.createMockApi(user, {
    project_id: blogProject.id,
    method: "POST",
    path: "/posts",
    name: "Create Post",
    description: "Adds a new post to the global key-value map.",
    variables: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: createApi.id,
    execution_order: 1,
    name: "Unauthorized",
    is_default: false,
    response: {
      status_code: 401,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: {
          error: "Valid Bearer token required.",
        },
      },
    },
    rule_tree: {
      label: "Unauthenticated",
      type: "or",
      predicates: [
        {
          label: "Invalid Auth Token",
          type: "simple",
          actual: "{{request.headers.authorization}}",
          operator: "not_equals",
          expected: "{{constants.auth_token}}",
        },
      ],
      children: [],
    },
    post_response_actions: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: createApi.id,
    execution_order: 2,
    name: "Invalid Request Body",
    is_default: false,
    response: {
      status_code: 400,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: {
          error: "Bad Request",
          message: "Validation failed. Title must be unique < 128 chars, Content <= 4096 chars, Status must be draft or published.",
        },
      },
    },
    rule_tree: {
      label: "Invalid Body",
      type: "or",
      predicates: [
        {
          label: "Validation Script",
          type: "custom",
          script: `
body = request.get("body", {}).get("value", {})
title = body.get("title")
content = body.get("content")
status = body.get("status")

if not isinstance(title, str) or len(title) >= 128 or len(title) == 0:
    return True
if not isinstance(content, str) or len(content) > 4096 or len(content) == 0:
    return True
if status not in ["draft", "published"]:
    return True

posts = globals.get("posts", {})
if any(str(p.get("title")) == str(title) for p in posts.values()):
    return True

return False
`,
        },
      ],
      children: [],
    },
    post_response_actions: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: createApi.id,
    execution_order: 3,
    name: "Post Created",
    is_default: true,
    response: {
      status_code: 201,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: {
          id: "{{globals.next_id}}",
          title: "{{request.body.value.title}}",
          content: "{{request.body.value.content}}",
        },
      },
    },
    rule_tree: null,
    post_response_actions: [
      {
        type: "script",
        language: "python",
        code: `
posts = globals.get("posts", {})
next_id = globals.get("next_id", 1)

new_post = {
    "id": next_id,
    "title": request.get("body", {}).get("value", {}).get("title"),
    "content": request.get("body", {}).get("value", {}).get("content"),
    "status": request.get("body", {}).get("value", {}).get("status")
}

posts[str(next_id)] = new_post

return [
    {"type": "set", "scope": "global", "key": "posts", "value": posts, "order": 1},
    {"type": "increment", "scope": "global", "key": "next_id", "amount": 1, "order": 2},
    {"type": "increment", "scope": "global", "key": "total_posts", "amount": 1, "order": 3}
]
`,
        order: 1,
      },
    ],
  });

  // 2.4 Update Post
  const updateApi = await mockApisUsecase.createMockApi(user, {
    project_id: blogProject.id,
    method: "PUT",
    path: "/posts/:id",
    name: "Update Post",
    description: "Updates an existing post.",
    variables: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: updateApi.id,
    execution_order: 1,
    name: "Unauthorized",
    is_default: false,
    response: {
      status_code: 401,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: {
          error: "Valid Bearer token required.",
        },
      },
    },
    rule_tree: {
      label: "Unauthenticated",
      type: "or",
      predicates: [
        {
          label: "Invalid Auth Token",
          type: "simple",
          actual: "{{request.headers.authorization}}",
          operator: "not_equals",
          expected: "{{constants.auth_token}}",
        },
      ],
      children: [],
    },
    post_response_actions: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: updateApi.id,
    execution_order: 2,
    name: "Not Found",
    is_default: false,
    response: {
      status_code: 404,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: {
          error: "Post not found.",
        },
      },
    },
    rule_tree: {
      label: "Invalid ID",
      type: "or",
      predicates: [
        {
          label: "Check ID exists",
          type: "custom",
          script: `
posts = globals.get("posts", {})
post_id = str(request.get("path_params", {}).get("id"))
return post_id not in posts
`,
        },
      ],
      children: [],
    },
    post_response_actions: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: updateApi.id,
    execution_order: 3,
    name: "Post Updated",
    is_default: true,
    response: {
      status_code: 200,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: {
          id: "{{request.path_params.id}}",
          title: "{{request.body.value.title}}",
          content: "{{request.body.value.content}}",
        },
      },
    },
    rule_tree: null,
    post_response_actions: [
      {
        type: "script",
        language: "python",
        code: `
posts = globals.get("posts", {})
post_id = str(request.get("path_params", {}).get("id"))

if post_id in posts:
    body = request.get("body", {}).get("value", {})
    if "title" in body:
        posts[post_id]["title"] = body["title"]
    if "content" in body:
        posts[post_id]["content"] = body["content"]
    if "status" in body:
        posts[post_id]["status"] = body["status"]

return [
    {"type": "set", "scope": "global", "key": "posts", "value": posts, "order": 1}
]
`,
        order: 1,
      },
    ],
  });

  // 2.5 Delete Post
  const deleteApi = await mockApisUsecase.createMockApi(user, {
    project_id: blogProject.id,
    method: "DELETE",
    path: "/posts/:id",
    name: "Delete Post",
    description: "Deletes a post from the global list using a Python script.",
    variables: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: deleteApi.id,
    execution_order: 1,
    name: "Unauthorized",
    is_default: false,
    response: {
      status_code: 401,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: { type: "json", value: { error: "Valid Bearer token required." } },
    },
    rule_tree: {
      label: "Unauthenticated",
      type: "or",
      predicates: [
        {
          label: "Invalid Auth Token",
          type: "simple",
          actual: "{{request.headers.authorization}}",
          operator: "not_equals",
          expected: "{{constants.auth_token}}",
        },
      ],
      children: [],
    },
    post_response_actions: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: deleteApi.id,
    execution_order: 2,
    name: "Not Found",
    is_default: false,
    response: {
      status_code: 404,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json",
        value: {
          error: "Post not found.",
        },
      },
    },
    rule_tree: {
      label: "Invalid ID",
      type: "or",
      predicates: [
        {
          label: "Check ID exists",
          type: "custom",
          script: `
posts = globals.get("posts", {})
post_id = str(request.get("path_params", {}).get("id"))
return post_id not in posts
`,
        },
      ],
      children: [],
    },
    post_response_actions: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: deleteApi.id,
    execution_order: 3,
    name: "Success",
    is_default: true,
    response: {
      status_code: 200,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: { type: "json", value: { message: "Post deleted successfully" } },
    },
    rule_tree: null,
    post_response_actions: [
      {
        type: "script",
        language: "python",
        code: `
posts = globals.get("posts", {})
post_id = str(request.get("path_params", {}).get("id"))

if post_id in posts:
    del posts[post_id]

return [
    {"type": "set", "scope": "global", "key": "posts", "value": posts, "order": 1},
    {"type": "decrement", "scope": "global", "key": "total_posts", "amount": 1, "order": 2}
]
`,
        order: 1,
      },
    ],
  });
}
