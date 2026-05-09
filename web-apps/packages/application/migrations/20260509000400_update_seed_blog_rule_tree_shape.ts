import { sql, type Kysely } from "kysely";

const postCreatedResponseId = "0196f3b0-0000-7000-8000-000000000207";
const invalidPayloadResponseId = "0196f3b0-0000-7000-8000-000000000208";
const unauthorizedResponseId = "0196f3b0-0000-7000-8000-000000000209";

const postCreatedRuleTree = {
  label: "valid authenticated create",
  type: "and",
  predicates: [
    {
      label: "authorization present",
      type: "simple",
      actual: "{{request.headers.authorization}}",
      operator: "string_not_empty",
      children: [],
    },
    {
      label: "title present",
      type: "simple",
      actual: "{{request.body.value.title}}",
      operator: "string_not_empty",
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
              children: [],
            },
            {
              label: "missing content type is okay in local demos",
              type: "simple",
              actual: "{{request.headers.content-type}}",
              operator: "is_not_set",
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

const invalidPayloadRuleTree = {
  label: "missing title",
  type: "and",
  predicates: [
    {
      label: "title empty",
      type: "simple",
      actual: "{{request.body.value.title}}",
      operator: "string_empty",
      children: [],
    },
  ],
};

const unauthorizedRuleTree = {
  label: "missing authorization",
  type: "and",
  predicates: [
    {
      label: "authorization empty",
      type: "simple",
      actual: "{{request.headers.authorization}}",
      operator: "string_empty",
      children: [],
    },
  ],
};

const oldPostCreatedRuleTree = {
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
};

const oldInvalidPayloadRuleTree = {
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
};

const oldUnauthorizedRuleTree = {
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
};

const jsonb = (value: unknown) => sql`${JSON.stringify(value)}::jsonb`;

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    update mock_api_responses
    set rule_tree = ${jsonb(postCreatedRuleTree)}
    where id = ${postCreatedResponseId}
  `.execute(db);

  await sql`
    update mock_api_responses
    set rule_tree = ${jsonb(invalidPayloadRuleTree)}
    where id = ${invalidPayloadResponseId}
  `.execute(db);

  await sql`
    update mock_api_responses
    set rule_tree = ${jsonb(unauthorizedRuleTree)}
    where id = ${unauthorizedResponseId}
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    update mock_api_responses
    set rule_tree = ${jsonb(oldPostCreatedRuleTree)}
    where id = ${postCreatedResponseId}
  `.execute(db);

  await sql`
    update mock_api_responses
    set rule_tree = ${jsonb(oldInvalidPayloadRuleTree)}
    where id = ${invalidPayloadResponseId}
  `.execute(db);

  await sql`
    update mock_api_responses
    set rule_tree = ${jsonb(oldUnauthorizedRuleTree)}
    where id = ${unauthorizedResponseId}
  `.execute(db);
}
