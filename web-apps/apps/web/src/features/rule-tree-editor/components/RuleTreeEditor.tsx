import { useEffect, useState, type DragEvent } from "react";

import { JsonInput } from "../../../shared/components/JsonInput";
import type { PredicateValue, RulePredicate, RuleTree } from "../../mock-api-responses/types";

const operatorsWithoutExpected = [
  "null",
  "not_null",
  "empty_array",
  "not_empty_array",
  "is_set",
  "is_not_set",
  "string_empty",
  "string_not_empty",
] as const;

const operatorsWithExpected = [
  "equals",
  "not_equals",
  "regex",
  "gt",
  "gte",
  "lt",
  "lte",
  "array_includes",
  "string_includes",
  "string_not_includes",
  "valid_json_schema",
] as const;

const operators = [...operatorsWithoutExpected, ...operatorsWithExpected] as const;

type PredicateBox = {
  id: string;
  label: string;
  actual: string;
  operator: string;
  expected: string;
};

type RuleBox = {
  id: string;
  label: string;
  type: "and" | "or";
  predicates: PredicateBox[];
  children: RuleBox[];
};

type PredicateTemplate = Omit<PredicateBox, "id">;

type DraggedBox =
  | { type: "predicate_template"; template: PredicateTemplate }
  | { type: "rule_template"; ruleType: RuleBox["type"] };

type SelectedBox =
  | { type: "rule"; ruleId: string }
  | { type: "predicate"; predicateId: string };

const defaultPredicateTemplate: PredicateTemplate = {
  label: "Header matches",
  actual: "{{request.headers.content-type}}",
  operator: "equals",
  expected: "application/json",
};

const predicateTemplates: PredicateTemplate[] = [
  defaultPredicateTemplate,
  {
    label: "Request body matches",
    actual: "{{request.body.value.title}}",
    operator: "equals",
    expected: "Hello world",
  },
  {
    label: "Query param matches",
    actual: "{{request.query_params.status}}",
    operator: "equals",
    expected: "published",
  },
  {
    label: "Cookie exists",
    actual: "{{request.cookies.session}}",
    operator: "is_set",
    expected: "",
  },
  {
    label: "Method matches",
    actual: "{{request.method}}",
    operator: "equals",
    expected: "POST",
  },
];

const createId = () => crypto.randomUUID();

const createPredicate = (template: PredicateTemplate): PredicateBox => ({
  ...template,
  id: createId(),
});

const createRule = (type: RuleBox["type"]): RuleBox => ({
  id: createId(),
  label: `${type.toUpperCase()} group`,
  type,
  predicates: [],
  children: [],
});

const initialRuleTree: RuleBox = {
  id: createId(),
  label: "Root rule",
  type: "and",
  predicates: [createPredicate(defaultPredicateTemplate)],
  children: [],
};

const stringifyExpected = (value: PredicateValue | undefined): string => {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

const operatorNeedsExpected = (operator: string) =>
  (operatorsWithExpected as readonly string[]).includes(operator);

const parseExpected = (value: string): PredicateValue => {
  if (!value.trim()) return "";

  try {
    return JSON.parse(value) as PredicateValue;
  } catch {
    return value;
  }
};

const toPredicate = (predicate: PredicateBox): RulePredicate => {
  const next: RulePredicate = {
    label: predicate.label,
    type: "simple",
    actual: predicate.actual,
    operator: predicate.operator,
  };

  if (operatorNeedsExpected(predicate.operator)) {
    next.expected = parseExpected(predicate.expected);
  }

  return next;
};

const toRuleTree = (rule: RuleBox): RuleTree => ({
  label: rule.label,
  type: rule.type,
  predicates: rule.predicates.map(toPredicate),
  children: rule.children.map(toRuleTree),
});

const fromPredicate = (predicate: RulePredicate): PredicateBox => ({
  id: createId(),
  label: predicate.label,
  actual: predicate.actual,
  operator: predicate.operator,
  expected: stringifyExpected(predicate.expected),
});

const fromRuleTree = (rule: RuleTree): RuleBox => ({
  id: createId(),
  label: rule.label,
  type: rule.type,
  predicates: rule.predicates.map(fromPredicate),
  children: (rule.children ?? []).map(fromRuleTree),
});

const updateRule = (
  rule: RuleBox,
  ruleId: string,
  update: (rule: RuleBox) => RuleBox,
): RuleBox => {
  if (rule.id === ruleId) return update(rule);

  return {
    ...rule,
    children: rule.children.map((child) => updateRule(child, ruleId, update)),
  };
};

const updatePredicate = (
  rule: RuleBox,
  predicateId: string,
  update: (predicate: PredicateBox) => PredicateBox,
): RuleBox => ({
  ...rule,
  predicates: rule.predicates.map((predicate) => {
    if (predicate.id === predicateId) return update(predicate);

    return predicate;
  }),
  children: rule.children.map((child) => updatePredicate(child, predicateId, update)),
});

const removeRule = (rule: RuleBox, ruleId: string): RuleBox => ({
  ...rule,
  children: rule.children
    .filter((child) => child.id !== ruleId)
    .map((child) => removeRule(child, ruleId)),
});

const findRule = (rule: RuleBox, ruleId: string): RuleBox | null => {
  if (rule.id === ruleId) return rule;

  for (const child of rule.children) {
    const found = findRule(child, ruleId);
    if (found) return found;
  }

  return null;
};

const findPredicate = (rule: RuleBox, predicateId: string): PredicateBox | null => {
  const predicate = rule.predicates.find((item) => item.id === predicateId);
  if (predicate) return predicate;

  for (const child of rule.children) {
    const found = findPredicate(child, predicateId);
    if (found) return found;
  }

  return null;
};

function RulePalette({
  onDragPredicateTemplate,
  onDragRuleTemplate,
  onDragEnd,
}: {
  onDragPredicateTemplate: (template: PredicateTemplate) => void;
  onDragRuleTemplate: (ruleType: RuleBox["type"]) => void;
  onDragEnd: () => void;
}) {
  return (
    <aside className="rule-palette">
      <div>
        <p className="eyebrow">Blocks</p>
        <h3>Drag into a group</h3>
      </div>
      {predicateTemplates.map((template) => (
        <button
          className="palette-block"
          draggable
          key={template.label}
          type="button"
          onDragEnd={onDragEnd}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "copy";
            event.dataTransfer.setData("text/plain", template.label);
            onDragPredicateTemplate(template);
          }}
        >
          <span>{template.label}</span>
          <small>{template.actual}</small>
        </button>
      ))}
      <div className="palette-section">
        <h3>Child groups</h3>
        {(["and", "or"] as const).map((ruleType) => (
          <button
            className="palette-block connection-block"
            draggable
            key={ruleType}
            type="button"
            onDragEnd={onDragEnd}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "copy";
              event.dataTransfer.setData("text/plain", `${ruleType} group`);
              onDragRuleTemplate(ruleType);
            }}
          >
            <span>{ruleType === "and" ? "ALL conditions" : "ANY condition"}</span>
            <small>Drop into a group</small>
          </button>
        ))}
      </div>
    </aside>
  );
}

function RuleTreeNode({
  rule,
  isRoot,
  selected,
  draggedBox,
  onSelect,
  onChangeRule,
  onRemoveRule,
  onDropRule,
}: {
  rule: RuleBox;
  isRoot: boolean;
  selected: SelectedBox;
  draggedBox: DraggedBox | null;
  onSelect: (selected: SelectedBox) => void;
  onChangeRule: (ruleId: string, update: (rule: RuleBox) => RuleBox) => void;
  onRemoveRule: (ruleId: string) => void;
  onDropRule: (ruleId: string) => void;
}) {
  const isSelected = selected.type === "rule" && selected.ruleId === rule.id;

  const dropOnRule = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onDropRule(rule.id);
  };

  return (
    <section className={`tree-rule-card ${isSelected ? "selected" : ""}`}>
      <header className="tree-rule-header" onClick={() => onSelect({ type: "rule", ruleId: rule.id })}>
        {isRoot && <span className="pill">Root</span>}
        <span className="pill">{rule.type.toUpperCase()}</span>
        <div>
          <strong>{rule.label}</strong>
          <small>
            {rule.predicates.length} predicate{rule.predicates.length === 1 ? "" : "s"}
            , {rule.children.length} group{rule.children.length === 1 ? "" : "s"}
          </small>
        </div>
        {!isRoot && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemoveRule(rule.id);
            }}
          >
            Remove
          </button>
        )}
      </header>

      <div className="tree-children">
        {rule.predicates.map((predicate) => (
          <PredicateNode
            key={predicate.id}
            predicate={predicate}
            selected={selected}
            onSelect={onSelect}
            onRemove={() => {
              onChangeRule(rule.id, (current) => ({
                ...current,
                predicates: current.predicates.filter((item) => item.id !== predicate.id),
              }));
              onSelect({ type: "rule", ruleId: rule.id });
            }}
          />
        ))}
        {rule.children.map((child) => (
          <RuleTreeNode
            key={child.id}
            rule={child}
            isRoot={false}
            selected={selected}
            draggedBox={draggedBox}
            onSelect={onSelect}
            onChangeRule={onChangeRule}
            onRemoveRule={onRemoveRule}
            onDropRule={onDropRule}
          />
        ))}
        <div
          className={`tree-dropzone ${draggedBox ? "drag-active" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect =
              draggedBox?.type === "predicate_template" ||
              draggedBox?.type === "rule_template"
                ? "copy"
                : "move";
          }}
          onDrop={dropOnRule}
        >
          <span>Drop predicate or child group here</span>
        </div>
      </div>
    </section>
  );
}

function PredicateNode({
  predicate,
  selected,
  onSelect,
  onRemove,
}: {
  predicate: PredicateBox;
  selected: SelectedBox;
  onSelect: (selected: SelectedBox) => void;
  onRemove: () => void;
}) {
  const isSelected = selected.type === "predicate" && selected.predicateId === predicate.id;

  return (
    <article
      className={`tree-predicate-card ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect({ type: "predicate", predicateId: predicate.id })}
    >
      <div className="tree-predicate-header">
        <div>
          <strong>{predicate.label}</strong>
          <small>{predicate.operator}</small>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          Remove
        </button>
      </div>
    </article>
  );
}

function RuleConfigPanel({
  tree,
  selected,
  onChangeRule,
  onChangePredicate,
}: {
  tree: RuleBox;
  selected: SelectedBox;
  onChangeRule: (ruleId: string, update: (rule: RuleBox) => RuleBox) => void;
  onChangePredicate: (
    predicateId: string,
    update: (predicate: PredicateBox) => PredicateBox,
  ) => void;
}) {
  if (selected.type === "rule") {
    const rule = findRule(tree, selected.ruleId);
    if (!rule) return null;

    return (
      <aside className="rule-config">
        <p className="eyebrow">Configure group</p>
        <h3>{rule.label}</h3>
        <label>
          Label
          <input
            value={rule.label}
            onChange={(event) =>
              onChangeRule(rule.id, (current) => ({
                ...current,
                label: event.target.value,
              }))
            }
          />
        </label>
        <label>
          Match strategy
          <select
            value={rule.type}
            onChange={(event) =>
              onChangeRule(rule.id, (current) => ({
                ...current,
                type: event.target.value as RuleBox["type"],
              }))
            }
          >
            <option value="and">ALL predicates must match</option>
            <option value="or">ANY predicate can match</option>
          </select>
        </label>
      </aside>
    );
  }

  const predicate = findPredicate(tree, selected.predicateId);
  if (!predicate) return null;

  return (
    <aside className="rule-config">
      <p className="eyebrow">Configure predicate</p>
      <h3>{predicate.label}</h3>
      <label>
        Label
        <input
          value={predicate.label}
          onChange={(event) =>
            onChangePredicate(predicate.id, (current) => ({
              ...current,
              label: event.target.value,
            }))
          }
        />
      </label>
      <label>
        Actual value
        <input
          value={predicate.actual}
          onChange={(event) =>
            onChangePredicate(predicate.id, (current) => ({
              ...current,
              actual: event.target.value,
            }))
          }
        />
      </label>
      <label>
        Operator
        <select
          value={predicate.operator}
          onChange={(event) =>
            onChangePredicate(predicate.id, (current) => ({
              ...current,
              operator: event.target.value,
              expected: operatorNeedsExpected(event.target.value) ? current.expected : "",
            }))
          }
        >
          {operators.map((operator) => (
            <option key={operator} value={operator}>
              {operator}
            </option>
          ))}
        </select>
      </label>
      {operatorNeedsExpected(predicate.operator) && (
        <JsonInput
          label="Expected value"
          value={predicate.expected}
          onChange={(value) =>
              onChangePredicate(predicate.id, (current) => ({
                ...current,
                expected: value,
              }))
          }
        />
      )}
    </aside>
  );
}

export function RuleTreeEditor({
  initialTree,
  onChange,
}: {
  initialTree?: RuleTree | null;
  onChange: (tree: RuleTree) => void;
}) {
  const [tree, setTree] = useState<RuleBox>(() =>
    initialTree ? fromRuleTree(initialTree) : initialRuleTree,
  );
  const [draggedBox, setDraggedBox] = useState<DraggedBox | null>(null);
  const [selected, setSelected] = useState<SelectedBox>({
    type: "rule",
    ruleId: tree.id,
  });

  useEffect(() => {
    onChange(toRuleTree(tree));
  }, [tree, onChange]);

  const changeRule = (ruleId: string, update: (rule: RuleBox) => RuleBox) => {
    setTree((current) => updateRule(current, ruleId, update));
  };

  const changePredicate = (
    predicateId: string,
    update: (predicate: PredicateBox) => PredicateBox,
  ) => {
    setTree((current) => updatePredicate(current, predicateId, update));
  };

  const dropOnRule = (targetRuleId: string) => {
    const box = draggedBox;

    if (!box) {
      const childRule = createRule("and");
      setTree((current) =>
        updateRule(current, targetRuleId, (rule) => ({
          ...rule,
          children: [...rule.children, childRule],
        })),
      );
      setSelected({ type: "rule", ruleId: childRule.id });
      return;
    }

    if (box.type === "predicate_template") {
      const predicate = createPredicate(box.template);
      setTree((current) =>
        updateRule(current, targetRuleId, (rule) => ({
          ...rule,
          predicates: [...rule.predicates, predicate],
        })),
      );
      setSelected({ type: "predicate", predicateId: predicate.id });
      setDraggedBox(null);
      return;
    }

    if (box.type === "rule_template") {
      const childRule = createRule(box.ruleType);
      setTree((current) =>
        updateRule(current, targetRuleId, (rule) => ({
          ...rule,
          children: [...rule.children, childRule],
        })),
      );
      setSelected({ type: "rule", ruleId: childRule.id });
      setDraggedBox(null);
      return;
    }

  };

  return (
    <section className="card rule-editor">
      <header className="editor-toolbar">
        <div>
          <p className="eyebrow">Rule tree</p>
          <h2>Structured rule builder</h2>
        </div>
      </header>
      <div className="rule-builder">
        <RulePalette
          onDragPredicateTemplate={(template) =>
            setDraggedBox({ type: "predicate_template", template })
          }
          onDragRuleTemplate={(ruleType) =>
            setDraggedBox({ type: "rule_template", ruleType })
          }
          onDragEnd={() => setDraggedBox(null)}
        />
        <div className="rule-canvas">
          <RuleTreeNode
            rule={tree}
            isRoot
            selected={selected}
            draggedBox={draggedBox}
            onSelect={setSelected}
            onChangeRule={changeRule}
            onRemoveRule={(ruleId) => {
              setTree((current) => removeRule(current, ruleId));
              setSelected({ type: "rule", ruleId: tree.id });
            }}
            onDropRule={dropOnRule}
          />
        </div>
        <RuleConfigPanel
          tree={tree}
          selected={selected}
          onChangeRule={changeRule}
          onChangePredicate={changePredicate}
        />
      </div>
    </section>
  );
}
