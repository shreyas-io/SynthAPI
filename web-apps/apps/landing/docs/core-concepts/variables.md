---
title: 'Variables & Constants'
description: 'How to build stateful mocks using Constants, Globals, and Local Variables'
---

State is what makes SynthAPI uniquely powerful. By storing values and updating them across requests, you can mock databases, carts, authentication flows, and rate limiters.

## Types of State

### 1. Constants
- **Scope**: Project-wide
- **Lifespan**: Permanent
- **Mutable?**: No (Read-only at runtime)
- **Use Case**: API versions, fixed account IDs, tenant IDs.
- **Template Syntax**: <code v-pre>{{constants.api_version}}</code>

### 2. Globals
- **Scope**: Project-wide
- **Lifespan**: 24-hour TTL (Redis backed)
- **Mutable?**: Yes
- **Use Case**: Cross-endpoint counters (`next_id`), shared resources (`users` array), global rate limiters.
- **Template Syntax**: <code v-pre>{{globals.next_id}}</code>

### 3. Local Variables
- **Scope**: Specific to one Mock API endpoint
- **Lifespan**: 1-hour TTL (Redis backed)
- **Mutable?**: Yes
- **Use Case**: Endpoint-specific retry counters, flaky upstreams, endpoint-specific rate limiters.
- **Template Syntax**: <code v-pre>{{variables.retry_count}}</code>

## Templates

You can dynamically inject these variables (as well as Request data) directly into your JSON response bodies, headers, or cookies.

```json
{
  "id": "{{globals.next_id}}",
  "method": "{{request.method}}",
  "auth": "{{request.headers.authorization}}"
}
```

## Post-Response Actions

Variables aren't just for reading. You can update them **after** a response is served.

When you configure a Post-Response Action, you can:
- **Set** a variable to a new value.
- **Increment / Decrement** a numerical variable.
- **Append / Remove** from an array.

This is what makes a mock stateful. A single `POST /users` call can return <code v-pre>{{globals.next_id}}</code> and immediately trigger an action to `increment` `next_id` by 1 for the next call.

For a full example, see **[Blog CRUD API](/examples/blog-crud-api)**. The `Create Post`, `Update Post`, and `Delete Post` responses all mutate shared project state after returning a response.
