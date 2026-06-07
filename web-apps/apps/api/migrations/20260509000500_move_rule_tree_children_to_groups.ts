import { sql, type Kysely } from "kysely";

type RulePredicate = Record<string, unknown> & {
  label?: string;
  children?: RuleTree[];
};

type RuleTree = {
  label: string;
  type: "and" | "or";
  predicates?: RulePredicate[];
  children?: RuleTree[];
};

const jsonb = (value: unknown) => sql`${JSON.stringify(value)}::jsonb`;

function stripPredicateChildren(predicate: RulePredicate): RulePredicate {
  const { children: _children, ...next } = predicate;

  return next;
}

function normalizeRuleTree(tree: RuleTree): RuleTree {
  const predicates = tree.predicates ?? [];
  const siblingPredicates = predicates
    .filter((predicate) => !predicate.children || predicate.children.length === 0)
    .map(stripPredicateChildren);
  const existingChildren = (tree.children ?? []).map(normalizeRuleTree);
  const predicateBranches = predicates
    .filter((predicate) => predicate.children && predicate.children.length > 0)
    .map((predicate) => ({
      label: `${predicate.label ?? "predicate"} branch`,
      type: "and" as const,
      predicates: [stripPredicateChildren(predicate)],
      children: predicate.children?.map(normalizeRuleTree) ?? [],
    }));

  return {
    label: tree.label,
    type: tree.type,
    predicates: siblingPredicates,
    children: [...existingChildren, ...predicateBranches],
  };
}

function denormalizeRuleTree(tree: RuleTree): RuleTree {
  const predicates = tree.predicates ?? [];
  const children = tree.children ?? [];
  const branchPredicates = children
    .filter((child) => child.type === "and" && child.predicates?.length === 1)
    .map((child) => ({
      ...stripPredicateChildren(child.predicates?.[0] ?? {}),
      children: (child.children ?? []).map(denormalizeRuleTree),
    }));
  const remainingChildren = children
    .filter((child) => child.type !== "and" || child.predicates?.length !== 1)
    .map(denormalizeRuleTree);

  return {
    label: tree.label,
    type: tree.type,
    predicates: [
      ...predicates.map((predicate) => ({
        ...stripPredicateChildren(predicate),
        children: [],
      })),
      ...branchPredicates,
    ],
    children: remainingChildren,
  };
}

async function updateRuleTrees(
  db: Kysely<unknown>,
  transform: (tree: RuleTree) => RuleTree,
): Promise<void> {
  const { rows } = await sql<{ id: string; rule_tree: RuleTree | null }>`
    select id, rule_tree
    from mock_api_responses
    where rule_tree is not null
  `.execute(db);

  for (const row of rows) {
    if (!row.rule_tree) {
      continue;
    }

    await sql`
      update mock_api_responses
      set rule_tree = ${jsonb(transform(row.rule_tree))}
      where id = ${row.id}
    `.execute(db);
  }
}

export async function up(db: Kysely<unknown>): Promise<void> {
  await updateRuleTrees(db, normalizeRuleTree);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await updateRuleTrees(db, denormalizeRuleTree);
}
