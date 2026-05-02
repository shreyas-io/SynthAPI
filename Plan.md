# Mock API V1 Product Plan

## Summary

This document defines the V1 product and its implementation plan.

V1 is a mock API runtime and configuration product. It lets users:

- define mock HTTP endpoints
- attach one or more response candidates to each endpoint
- decide which candidate should be returned using trigger rules
- return either a simple configured response or a script-generated response
- apply post-response actions to globals after the response is sent

V1 stays focused on endpoint configuration, response selection, response rendering, runtime serving, globals, and post-response updates.

---

## Product Boundary

### In Scope

- mock API definition
- response candidate definition
- response selection strategies:
  - `rules`
  - `sequential`
  - `random`
- trigger rule trees
- built-in and script predicates
- simple and script responses
- static and range delays
- user globals and system globals
- post-response actions
- runtime HTTP serving
- REST APIs for managing configuration
- admin/control APIs for globals and runtime reset

### Out of Scope

- database-backed resource mutations during request handling
- OAuth service simulation
- callbacks/webhooks
- CRUD-generated routes
- vector similarity search
- multi-step workflow engines

---

## Runtime Model

For a matched mock API, V1 runtime execution is:

1. match request by method and path
2. choose a response candidate using the mock API selection strategy
3. realize the selected response
4. apply response delay
5. return the HTTP response
6. run post-response actions
7. update system globals

There is no separate "policy phase". Rate limiting, maintenance behavior, and similar cases are modeled as response trigger rules that choose one response candidate over another.

---

## Core Domain

### MockAPI

A `MockAPI` defines one mocked HTTP endpoint.

Fields:

| Field                | Type      | Required  | Notes                                                       |
| -------------------- | --------- | --------- | ----------------------------------------------------------- |
| `id`                 | UUID      | generated | Primary key.                                                |
| `method`             | string    | yes       | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`. |
| `path`               | string    | yes       | Route pattern, e.g. `/users/:id`.                           |
| `selection_strategy` | string    | yes       | `rules`, `sequential`, `random`.                            |
| `name`               | string    | yes       | Human-readable name.                                        |
| `description`        | string    | no        | Optional description.                                       |
| `created_at`         | timestamp | generated | Creation time.                                              |
| `updated_at`         | timestamp | generated | Updated by trigger.                                         |

Shape:

```json
{
  "id": "0195d7de-9b59-7af3-8ae8-babf94835f85",
  "method": "GET",
  "path": "/users/:id",
  "selection_strategy": "rules",
  "name": "Get User",
  "description": "Returns user details",
  "created_at": "2026-05-02T10:00:00Z",
  "updated_at": "2026-05-02T10:00:00Z"
}
```

### MockAPIResponseCandidate

A `MockAPIResponseCandidate` defines one possible runtime response for a `MockAPI`.

Each candidate has three sections:

- `trigger`
- `response`
- `post_response`

Candidate fields:

| Field           | Type      | Required    | Notes                                                    |
| --------------- | --------- | ----------- | -------------------------------------------------------- |
| `id`            | UUID      | generated   | Primary key.                                             |
| `mock_api_id`   | UUID      | yes         | Parent mock API.                                         |
| `response_key`  | string    | yes         | Stable key unique within a mock API.                     |
| `name`          | string    | yes         | Human-readable name.                                     |
| `sort_order`    | integer   | yes         | Stable ordering within a mock API.                       |
| `is_default`    | boolean   | yes         | Fallback candidate in `rules` mode. Ignored in `random`. |
| `trigger`       | object    | conditional | Required for non-default rule-based candidates.          |
| `response`      | object    | yes         | The actual API response definition.                      |
| `post_response` | object    | no          | Actions run after the response is sent.                  |
| `created_at`    | timestamp | generated   | Creation time.                                           |
| `updated_at`    | timestamp | generated   | Updated by trigger.                                      |

Shape:

```json
{
  "id": "0195d7e0-0df6-7143-8e71-8b3d89d3c901",
  "mock_api_id": "0195d7de-9b59-7af3-8ae8-babf94835f85",
  "response_key": "user_found",
  "name": "User Found",
  "sort_order": 1,
  "is_default": false,
  "trigger": {
    "tree": {
      "id": "root_rule",
      "type": "AND",
      "predicates": [
        {
          "key": "path_id_is_1",
          "label": "Path ID is 1",
          "kind": "native",
          "target": "path_param",
          "modifier": "id",
          "operator": "equals",
          "value": "1"
        }
      ],
      "children": []
    }
  },
  "response": {
    "kind": "simple",
    "status_code": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "cookies": [],
    "body": {
      "id": "123",
      "name": "Alice"
    },
    "delay": {
      "kind": "static",
      "value_ms": 100
    }
  },
  "post_response": {
    "actions": [
      {
        "type": "increment_global",
        "key": "success_count",
        "amount": 1
      }
    ]
  }
}
```

---

## Response Selection Strategies

### `rules`

Load response candidates for the mock API ordered by `sort_order`.

For each candidate:

- if the candidate has a trigger tree, evaluate it
- return the first candidate whose trigger tree evaluates to `true`
- if none match, return the candidate where `is_default = true`

### `sequential`

Ignore trigger trees. Return response candidates in `sort_order`, cycling through them across requests.

This uses a system global such as `sequential_index`.

### `random`

Ignore trigger trees. Choose a response candidate at random from the configured candidates.

`is_default` has no special behavior in `random` mode.

---

## Trigger Rules

Each non-default response candidate may have a `trigger` section containing a rule tree.

```json
{
  "trigger": {
    "tree": {
      "id": "root_rule",
      "type": "AND",
      "predicates": [],
      "children": []
    }
  }
}
```

### Rule Node Shape

```json
{
  "id": "role_or_preview",
  "label": "Role Or Preview",
  "type": "OR",
  "predicates": [],
  "children": []
}
```

Fields:

| Field        | Type   | Required | Notes                                        |
| ------------ | ------ | -------- | -------------------------------------------- |
| `id`         | string | yes      | Stable internal key, unique within the tree. |
| `label`      | string | no       | Optional display label.                      |
| `type`       | string | yes      | `AND` or `OR`.                               |
| `predicates` | array  | yes      | Predicates evaluated directly by this node.  |
| `children`   | array  | yes      | Child rule-group nodes.                      |

`children` are nested rule nodes, not predicates.

### Predicate Shape

Predicates come in two kinds:

- `native`
- `script`

#### Native Predicate

```json
{
  "key": "role_is_admin",
  "label": "Role is admin",
  "kind": "native",
  "target": "header",
  "modifier": "X-Role",
  "operator": "equals",
  "value": "admin"
}
```

Fields:

| Field      | Type   | Required    | Notes                                                           |
| ---------- | ------ | ----------- | --------------------------------------------------------------- |
| `key`      | string | yes         | Stable internal key, unique within the tree.                    |
| `label`    | string | no          | Optional display label.                                         |
| `kind`     | string | yes         | `native`.                                                       |
| `target`   | string | yes         | Request/runtime component to inspect.                           |
| `modifier` | string | conditional | Required for `header`, `query`, `body`, `path_param`, `cookie`. |
| `operator` | string | yes         | Comparison operator.                                            |
| `value`    | scalar | conditional | Required for value-based operators.                             |
| `window`   | string | conditional | Used by time-based rate predicates.                             |
| `per`      | string | conditional | Scope for time-based rate predicates.                           |

#### Script Predicate

```json
{
  "key": "custom_match",
  "label": "Custom match",
  "kind": "script",
  "language": "python",
  "code": "result = request['headers'].get('x-role') == 'admin'"
}
```

Rules:

- script predicates receive read-only request, globals, and system globals
- they must return a boolean result
- they must not mutate state

### Native Predicate Targets

- `header`
- `query`
- `body`
- `path_param`
- `cookie`
- `request_method`
- `request_rate`
- `request_interval_ms`
- `global`
- `system_global`

### Native Predicate Operators

- `equals`
- `not_equals`
- `regex`
- `null`
- `not_null`
- `gt`
- `gte`
- `lt`
- `lte`
- `array_includes`
- `empty_array`
- `not_empty_array`
- `valid_json_schema`

### Time-Based Rate Limiting

Rate limiting is modeled as response trigger logic.

Examples:

```json
{
  "key": "limit_2_per_second",
  "kind": "native",
  "target": "request_rate",
  "operator": "lte",
  "value": 2,
  "window": "1s",
  "per": "mock_api"
}
```

```json
{
  "key": "one_call_every_500ms",
  "kind": "native",
  "target": "request_interval_ms",
  "operator": "gte",
  "value": 500,
  "per": "mock_api"
}
```

V1 `per` scopes:

- `global`
- `mock_api`

### Tree Evaluation Semantics

- evaluate from the root node recursively
- `AND` node is `true` only if all direct predicates and all child nodes are `true`
- `OR` node is `true` if at least one direct predicate or child node is `true`
- an empty `AND` node is invalid
- an empty `OR` node is invalid

---

## Response Definition

The selected candidate has a `response` section. This is the actual HTTP response to return.

Responses come in two kinds:

- `simple`
- `script`

### Simple Response

```json
{
  "kind": "simple",
  "status_code": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123",
      "http_only": true,
      "secure": true,
      "path": "/"
    }
  ],
  "body": {
    "ok": true
  },
  "delay": {
    "kind": "range",
    "min_ms": 200,
    "max_ms": 800
  }
}
```

Fields:

| Field         | Type    | Required | Notes                                 |
| ------------- | ------- | -------- | ------------------------------------- |
| `kind`        | string  | yes      | `simple`.                             |
| `status_code` | integer | yes      | HTTP status code.                     |
| `headers`     | object  | yes      | Response headers.                     |
| `cookies`     | array   | no       | Structured cookies to set.            |
| `body`        | any     | no       | Response body.                        |
| `file_path`   | string  | no       | Optional file-backed response source. |
| `delay`       | object  | no       | Delay before sending response.        |

### Script Response

```json
{
  "kind": "script",
  "language": "python",
  "code": "result = {'status_code': 200, 'headers': {'Content-Type': 'application/json'}, 'cookies': [], 'body': {'ok': True}, 'delay': {'kind': 'static', 'value_ms': 100}}"
}
```

Rules:

- script response receives read-only request, globals, system globals, and selected candidate metadata
- it returns a structured response object
- it does not mutate state directly

### Delay Shape

Delay lives inside the response only.

#### Static Delay

```json
{
  "kind": "static",
  "value_ms": 500
}
```

#### Range Delay

```json
{
  "kind": "range",
  "min_ms": 200,
  "max_ms": 800
}
```

Validation:

- static delay: `value_ms >= 0`
- range delay: `min_ms >= 0`, `max_ms >= 0`, `min_ms <= max_ms`

### Templating

Templating is supported in V1.

It should be available in:

- response body
- response headers
- file-backed responses
- post-response action templates

Template context should include:

- request
- user globals
- system globals
- selected response candidate metadata

---

## Post-Response

After the response has been sent, `post_response` actions are executed.

```json
{
  "post_response": {
    "actions": []
  }
}
```

### Built-In Actions

- `set_global`
- `unset_global`
- `increment_global`
- `decrement_global`
- `append_global`
- `remove_from_global`

Example:

```json
{
  "type": "set_global",
  "key": "last_user_id",
  "value_template": "{{request.path_params.id}}"
}
```

### Script Action

```json
{
  "type": "script",
  "language": "python",
  "code": "result = {'set': {'last_user_id': request['path_params']['id']}, 'increment': {'success_count': 1}}"
}
```

Rules:

- the script does not mutate globals directly
- it returns a mutation patch
- runtime validates and applies the patch

Patch shape:

```json
{
  "set": {
    "last_user_id": "123"
  },
  "increment": {
    "success_count": 1
  },
  "decrement": {},
  "append": {},
  "remove": {},
  "unset": []
}
```

### Post-Response Execution Order

1. response candidate selected
2. response realized
3. delay applied
4. HTTP response returned
5. `post_response.actions` executed
6. system globals updated

---

## Globals and Runtime State

V1 has two classes of globals:

- **user globals**
- **system globals**

### User Globals

User globals are custom values defined and updated by the user.

Use cases:

- maintenance mode
- feature flags
- scenario state
- cross-request data for response matching

Examples:

```json
{
  "maintenance_mode": false,
  "current_tenant": "tenant_123"
}
```

### System Globals

System globals are runtime-managed bookkeeping values.

Per mock API, V1 should maintain:

- `call_count`
- `last_called_at`
- `recent_call_timestamps`
- `sequential_index`
- optional `last_response_id`

Use cases:

- sequential mode
- time-based rate limiting
- debugging and traces

### Storage

V1 runtime state should use Redis.

Redis stores:

- user globals
- system globals
- rate-limit timestamps/counters
- runtime request-tracking state

### Admin / Control API

V1 should expose admin endpoints for:

- reading user globals
- setting user globals
- unsetting user globals
- resetting runtime state

Normal response logic must not allow direct writes to system globals except through runtime bookkeeping.

---

## Persistence Model

### `mock_apis`

```sql
id UUID PRIMARY KEY DEFAULT uuid_v7()
method TEXT NOT NULL
path TEXT NOT NULL
selection_strategy TEXT NOT NULL
name TEXT NOT NULL
description TEXT NOT NULL DEFAULT ''
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
UNIQUE (method, path)
```

### `mock_api_responses`

```sql
id UUID PRIMARY KEY DEFAULT uuid_v7()
mock_api_id UUID NOT NULL REFERENCES mock_apis(id) ON DELETE CASCADE
response_key TEXT NOT NULL
name TEXT NOT NULL
sort_order INTEGER NOT NULL
is_default BOOLEAN NOT NULL DEFAULT false
trigger JSONB NOT NULL DEFAULT '{}'::jsonb
response JSONB NOT NULL
post_response JSONB NOT NULL DEFAULT '{"actions":[]}'::jsonb
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
UNIQUE (mock_api_id, response_key)
UNIQUE (mock_api_id, sort_order)
```

Additional constraint:

- at most one response with `is_default = true` per `mock_api_id`

The earlier separate `mock_api_response_rule_trees` table is now conceptually superseded by the `trigger` object on response candidates. If the current implementation path wants to preserve the separate table temporarily, that is an implementation detail rather than the intended long-term V1 shape.

---

## Public API Shapes

### Mock API CRUD

Create:

```json
{
  "method": "GET",
  "path": "/users/:id",
  "selection_strategy": "rules",
  "name": "Get User",
  "description": "Returns user details"
}
```

### Mock API Response Candidate CRUD

Create:

```json
{
  "mock_api_id": "0195d7de-9b59-7af3-8ae8-babf94835f85",
  "response_key": "user_found",
  "name": "User Found",
  "sort_order": 1,
  "is_default": false,
  "trigger": {
    "tree": {
      "id": "root_rule",
      "type": "AND",
      "predicates": [
        {
          "key": "method_is_get",
          "kind": "native",
          "target": "request_method",
          "operator": "equals",
          "value": "GET"
        }
      ],
      "children": []
    }
  },
  "response": {
    "kind": "simple",
    "status_code": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "cookies": [],
    "body": {
      "ok": true
    },
    "delay": {
      "kind": "static",
      "value_ms": 100
    }
  },
  "post_response": {
    "actions": []
  }
}
```

---

## Validation Rules

### Mock API

- `method` must be one of the supported HTTP methods
- `selection_strategy` must be one of `rules`, `sequential`, `random`
- `path` is required and should start with `/`
- `name` is required
- `id` is required for get, update, delete
- `limit >= 0`
- `offset >= 0`

### Mock API Response Candidate

- `mock_api_id` is required
- `response_key` is required
- `name` is required
- `sort_order >= 0`
- `id` is required for get, update, delete
- only one default response per mock API
- parent mock API must exist
- `response.kind` must be `simple` or `script`
- simple response must have `status_code`
- script response must have `language` and `code`
- cookies must be structurally valid
- delay must match the selected delay kind

### Trigger Tree

- only one trigger tree per candidate
- root node is required for non-default `rules` candidates
- all node `id` values must be unique within the tree
- all predicate `key` values must be unique within the tree
- node `type` must be `AND` or `OR`
- every node must contain at least one predicate or one child
- predicate `kind` must be `native` or `script`
- native predicate target/operator combinations must be valid
- script predicate requires `language` and `code`
- native predicate requires `modifier` where applicable
- native predicate requires `value` where applicable
- `window` and `per` are only valid for time-based rate predicates

### Post-Response

- `actions` must be a valid list
- built-in action type must be supported
- script action requires `language` and `code`
- a built-in action that expects `value` or `value_template` must receive one

---

## REST API Surface

### Mock APIs

- `POST /mock-apis`
- `GET /mock-apis`
- `GET /mock-apis/:id`
- `PUT /mock-apis/:id`
- `DELETE /mock-apis/:id`

### Mock API Response Candidates

- `POST /mock-api-responses`
- `GET /mock-api-responses?mock_api_id=...`
- `GET /mock-api-responses/:id`
- `PUT /mock-api-responses/:id`
- `DELETE /mock-api-responses/:id`

### Admin / Globals

- `GET /mock-admin/globals`
- `PUT /mock-admin/globals/:key`
- `DELETE /mock-admin/globals/:key`
- `POST /mock-admin/reset-state`

Behavior:

- list defaults: `limit=20`, `offset=0`
- response list requires `mock_api_id`
- `POST` returns `201`
- `GET` and `PUT` return `200`
- `DELETE` returns `204`

Error mapping:

- validation error -> `400`
- not found -> `404`
- default-response conflict -> `409`
- unique violation -> `409`
- unexpected error -> `500`

---

## Runtime HTTP Behavior

### Request Flow

For `rules` mode:

1. resolve `MockAPI` by method and path
2. load response candidates by `sort_order`
3. evaluate trigger trees until one matches
4. fall back to `is_default = true` if none match
5. realize the selected response
6. apply delay
7. return the HTTP response
8. run post-response actions
9. update system globals

For `sequential` mode:

- ignore trigger trees
- choose the next candidate by `sequential_index`
- then use the same response and post-response flow

For `random` mode:

- ignore trigger trees
- choose a candidate randomly
- ignore default-response semantics
- then use the same response and post-response flow

---

## Testing Plan

### CRUD and Validation

- create/get/list/update/delete mock APIs
- create/get/list/update/delete response candidates
- reject invalid method or `selection_strategy`
- reject missing `mock_api_id` for response list
- reject duplicate `(method, path)`
- reject duplicate `response_key` within a mock API
- reject duplicate `sort_order` within a mock API
- reject multiple default candidates for one mock API

### Trigger Trees

- valid nested trees
- duplicate node ids
- duplicate predicate keys
- invalid native predicate target/operator combinations
- invalid script predicate config
- empty nodes
- missing `modifier` where required
- missing `value` where required
- rate-limiting predicates with invalid `window` / `per`

### Runtime

- route matching by method and path
- `rules` first-match behavior
- `rules` fallback to default candidate
- `sequential` counter behavior
- `random` ignoring default semantics
- static delay and range delay
- simple response rendering
- script response rendering
- cookies/headers/body/status emission

### Globals and Post-Response

- user globals read/write/reset via admin API
- system globals update correctly
- built-in post-response actions
- script post-response patch application
- script predicate read-only execution
- rate limiting backed by system globals

---

## Recommended Delivery Order

1. Freeze this V1 shape.
2. Update code-level DTO/entity shapes to match `selection_strategy`, `trigger`, `response`, and `post_response`.
3. Add trigger-tree CRUD and validation.
4. Add runtime serving for `rules`, `sequential`, and `random`.
5. Add Redis-backed globals and admin APIs.
6. Add script predicates, script responses, and script post-response patches through the generic Python sandbox.
7. Add file-backed responses and broader request body parsing.

This order keeps the runtime coherent and lets V1 ship as a focused response-selection and runtime-mocking product.
