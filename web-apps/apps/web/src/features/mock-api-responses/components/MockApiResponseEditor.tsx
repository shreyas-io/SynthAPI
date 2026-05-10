import { FormEvent, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { JsonInput } from "../../../shared/components/JsonInput";
import { queryKeys } from "../../../shared/api/query_keys";
import { getMockApi } from "../../mock-apis/api/mock_apis_api";
import { getProject } from "../../projects/api/projects_api";
import type { Variable } from "../../projects/types";
import { RuleTreeEditor } from "../../rule-tree-editor/components/RuleTreeEditor";
import type {
  MockApiResponse,
  MockApiResponseInput,
  PostResponseAction,
  PostResponseActionValue,
  ResponseBody,
  RuleTree,
  VariableScope,
} from "../types";

type EditorTab = "response" | "rule_tree" | "post_actions";

type KeyValueRow = {
  id: string;
  key: string;
  value: string;
};

type MockApiResponseEditorProps = {
  mockApiId: string;
  initialResponse?: MockApiResponse;
  submitLabel: string;
  isPending: boolean;
  errorMessage?: string;
  onSubmit: (input: Omit<MockApiResponseInput, "mock_api_id">) => void;
};

const actionTypes = [
  "set",
  "unset",
  "increment",
  "decrement",
  "append",
  "remove",
  "script",
] as const;

const createId = () => crypto.randomUUID();

const stringifyValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === undefined) return "";
  return JSON.stringify(value, null, 2);
};

const parseValue = (value: string): PostResponseActionValue => {
  if (!value.trim()) return "";

  return JSON.parse(value) as PostResponseActionValue;
};

const rowsFromRecord = (record: Record<string, unknown>): KeyValueRow[] => {
  const rows = Object.entries(record).map(([key, value]) => ({
    id: createId(),
    key,
    value: stringifyValue(value),
  }));

  return rows.length ? rows : [{ id: createId(), key: "", value: "" }];
};

const recordFromRows = (rows: KeyValueRow[]): Record<string, string> => {
  return Object.fromEntries(
    rows
      .map((row) => [row.key.trim(), row.value] as const)
      .filter(([key]) => key.length > 0),
  );
};

const bodyTextFromResponse = (body: ResponseBody): string => {
  if (body.type === "empty") return "";
  if (body.type === "text") return body.value;
  return JSON.stringify(body.value, null, 2);
};

type LegacyRulePredicate = RuleTree["predicates"][number] & {
  children?: RuleTree[];
};

const normalizeRuleTree = (ruleTree: RuleTree | null): RuleTree | null => {
  if (!ruleTree) return null;

  const predicates = ruleTree.predicates.map((predicate) => {
    const { children: _children, ...next } = predicate as LegacyRulePredicate;

    return next;
  });
  const predicateBranches = ruleTree.predicates
    .map((predicate) => predicate as LegacyRulePredicate)
    .filter((predicate) => predicate.children?.length)
    .map((predicate) => {
      const { children, ...next } = predicate;

      return {
        label: `${predicate.label} branch`,
        type: "and" as const,
        predicates: [next],
        children: (children ?? []).map(normalizeRuleTree).filter(Boolean),
      } as RuleTree;
    });

  return {
    label: ruleTree.label,
    type: ruleTree.type,
    predicates,
    children: [
      ...(ruleTree.children ?? []).map(normalizeRuleTree).filter(Boolean),
      ...predicateBranches,
    ],
  } as RuleTree;
};

const createAction = (
  type: PostResponseAction["type"],
  order: number,
): PostResponseAction => {
  if (type === "script") {
    return {
      type,
      language: "python",
      code: "return []",
      order,
    };
  }

  if (type === "increment" || type === "decrement") {
    return {
      type,
      scope: "local",
      key: "",
      amount: 1,
      order,
    };
  }

  if (type === "unset") {
    return {
      type,
      scope: "local",
      key: "",
      order,
    };
  }

  return {
    type,
    scope: "local",
    key: "",
    value: "",
    order,
  };
};

function KeyValueRows({
  label,
  rows,
  onChange,
}: {
  label: string;
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
}) {
  return (
    <section className="key-value-editor">
      <div className="section-heading">
        <h3>{label}</h3>
        <button
          type="button"
          onClick={() => onChange([...rows, { id: createId(), key: "", value: "" }])}
        >
          Add
        </button>
      </div>
      {rows.map((row) => (
        <div className="key-value-row" key={row.id}>
          <input
            placeholder="key"
            value={row.key}
            onChange={(event) =>
              onChange(
                rows.map((item) =>
                  item.id === row.id ? { ...item, key: event.target.value } : item,
                ),
              )
            }
          />
          <input
            placeholder="value"
            value={row.value}
            onChange={(event) =>
              onChange(
                rows.map((item) =>
                  item.id === row.id
                    ? { ...item, value: event.target.value }
                    : item,
                ),
              )
            }
          />
          <button
            type="button"
            onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
          >
            Remove
          </button>
        </div>
      ))}
    </section>
  );
}

function VariablesList({
  title,
  prefix,
  variables,
}: {
  title: string;
  prefix: "constants" | "globals" | "variables";
  variables: Variable[] | null | undefined;
}) {
  return (
    <section className="variable-reference-section">
      <h3>{title}</h3>
      {!variables?.length && <p>No variables configured.</p>}
      {variables?.map((variable) => (
        <div className="variable-reference-card" key={variable.name}>
          <strong>{variable.name}</strong>
          <small>
            {variable.type} · {`{{${prefix}.${variable.name}}}`}
          </small>
          <code>{stringifyValue(variable.value)}</code>
        </div>
      ))}
    </section>
  );
}

function VariablesReference({ mockApiId }: { mockApiId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const mockApi = useQuery({
    queryKey: queryKeys.mockApi(mockApiId),
    queryFn: () => getMockApi(mockApiId),
  });
  const project = useQuery({
    queryKey: queryKeys.project(mockApi.data?.project_id ?? ""),
    enabled: Boolean(mockApi.data?.project_id),
    queryFn: () => {
      if (!mockApi.data?.project_id) {
        throw new Error("Missing project ID");
      }

      return getProject(mockApi.data.project_id);
    },
  });

  return (
    <>
      <button
        className="variable-reference-toggle"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>
          <span className="eyebrow">Variables</span>
          <strong>Template references</strong>
        </span>
        <span>Open</span>
      </button>
      {isOpen && (
        <div className="variable-reference-modal-backdrop">
          <aside className="variable-reference-modal card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Variables</p>
                <h2>Template references</h2>
              </div>
              <button type="button" onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>
            {(mockApi.isPending || project.isPending) && <p>Loading variables...</p>}
            {mockApi.isError && <p className="error">{mockApi.error.message}</p>}
            {project.isError && <p className="error">{project.error.message}</p>}
            <VariablesList
              title="Constants"
              prefix="constants"
              variables={project.data?.constants}
            />
            <VariablesList
              title="Globals"
              prefix="globals"
              variables={project.data?.globals}
            />
            <VariablesList
              title="Local variables"
              prefix="variables"
              variables={mockApi.data?.variables}
            />
          </aside>
        </div>
      )}
    </>
  );
}

function PostActionForm({
  action,
  onChange,
  onRemove,
}: {
  action: PostResponseAction;
  onChange: (action: PostResponseAction) => void;
  onRemove: () => void;
}) {
  const [valueText, setValueText] = useState(
    "value" in action ? stringifyValue(action.value) : "",
  );
  const [valueError, setValueError] = useState<string | null>(null);

  useEffect(() => {
    setValueText("value" in action ? stringifyValue(action.value) : "");
    setValueError(null);
  }, [action]);

  return (
    <article className="post-action-card">
      <div className="section-heading">
        <h3>{action.type}</h3>
        <button type="button" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="form-grid">
        <label>
          Type
          <select
            value={action.type}
            onChange={(event) =>
              onChange(
                createAction(
                  event.target.value as PostResponseAction["type"],
                  action.order,
                ),
              )
            }
          >
            {actionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Order
          <input
            type="number"
            value={action.order}
            onChange={(event) =>
              onChange({ ...action, order: Number(event.target.value) })
            }
          />
        </label>
      </div>

      {action.type === "script" ? (
        <label>
          Python code
          <textarea
            value={action.code}
            onChange={(event) => onChange({ ...action, code: event.target.value })}
          />
        </label>
      ) : (
        <>
          <div className="form-grid">
            <label>
              Scope
              <select
                value={action.scope}
                onChange={(event) =>
                  onChange({
                    ...action,
                    scope: event.target.value as VariableScope,
                  })
                }
              >
                <option value="local">local</option>
                <option value="global">global</option>
              </select>
            </label>
            <label>
              Key
              <input
                value={action.key}
                onChange={(event) =>
                  onChange({ ...action, key: event.target.value })
                }
              />
            </label>
          </div>

          {(action.type === "increment" || action.type === "decrement") && (
            <label>
              Amount
              <input
                type="number"
                value={action.amount}
                onChange={(event) =>
                  onChange({ ...action, amount: Number(event.target.value) })
                }
              />
            </label>
          )}

          {(action.type === "set" ||
            action.type === "append" ||
            action.type === "remove") && (
            <JsonInput
              label="Value"
              value={valueText}
              error={valueError}
              onChange={(value) => {
                setValueText(value);

                try {
                  onChange({
                    ...action,
                    value: parseValue(value),
                  });
                  setValueError(null);
                } catch {
                  setValueError("Invalid JSON.");
                }
              }}
            />
          )}
        </>
      )}
    </article>
  );
}

export function MockApiResponseEditor({
  mockApiId,
  initialResponse,
  submitLabel,
  isPending,
  errorMessage,
  onSubmit,
}: MockApiResponseEditorProps) {
  const initialBody = initialResponse?.response.body ?? {
    type: "json" as const,
    value: { ok: true },
  };
  const [activeTab, setActiveTab] = useState<EditorTab>("response");
  const [name, setName] = useState(initialResponse?.name ?? "");
  const [isDefault, setIsDefault] = useState(initialResponse?.is_default ?? false);
  const [statusCode, setStatusCode] = useState(
    initialResponse?.response.status_code ?? 200,
  );
  const [bodyType, setBodyType] = useState<ResponseBody["type"]>(initialBody.type);
  const [bodyText, setBodyText] = useState(bodyTextFromResponse(initialBody));
  const [headers, setHeaders] = useState<KeyValueRow[]>(
    rowsFromRecord(initialResponse?.response.headers ?? { "content-type": "application/json" }),
  );
  const [cookies, setCookies] = useState<KeyValueRow[]>(
    rowsFromRecord(initialResponse?.response.cookies ?? {}),
  );
  const [ruleTree, setRuleTree] = useState<RuleTree | null>(
    initialResponse?.rule_tree ?? null,
  );
  const [postActions, setPostActions] = useState<PostResponseAction[]>(
    initialResponse?.post_response_actions ?? [],
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [bodyJsonError, setBodyJsonError] = useState<string | null>(null);

  useEffect(() => {
    const nextBody = initialResponse?.response.body ?? {
      type: "json" as const,
      value: { ok: true },
    };

    setName(initialResponse?.name ?? "");
    setIsDefault(initialResponse?.is_default ?? false);
    setStatusCode(initialResponse?.response.status_code ?? 200);
    setBodyType(nextBody.type);
    setBodyText(bodyTextFromResponse(nextBody));
    setHeaders(
      rowsFromRecord(
        initialResponse?.response.headers ?? { "content-type": "application/json" },
      ),
    );
    setCookies(rowsFromRecord(initialResponse?.response.cookies ?? {}));
    setRuleTree(initialResponse?.rule_tree ?? null);
    setPostActions(initialResponse?.post_response_actions ?? []);
    setFormError(null);
    setBodyJsonError(null);
  }, [initialResponse]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    let body: ResponseBody;

    try {
      if (bodyType === "json") {
        body = {
          type: "json",
          value: JSON.parse(bodyText),
        };
        setBodyJsonError(null);
      } else if (bodyType === "text") {
        body = {
          type: "text",
          value: bodyText,
        };
      } else {
        body = {
          type: "empty",
        };
      }
    } catch {
      setBodyJsonError("Invalid JSON.");
      setActiveTab("response");
      return;
    }

    onSubmit({
      name,
      is_default: isDefault,
      response: {
        status_code: statusCode,
        headers: recordFromRows(headers),
        cookies: recordFromRows(cookies),
        body,
      },
      rule_tree: isDefault ? null : normalizeRuleTree(ruleTree),
      post_response_actions: postActions,
    });
  };

  return (
    <form className="response-editor-shell" onSubmit={submit}>
      <section className="response-editor-main card">
        <div className="editor-toolbar">
          <div>
            <p className="eyebrow">Mock API response</p>
            <h1>{initialResponse ? initialResponse.name : "Create mock response"}</h1>
          </div>
          <VariablesReference mockApiId={mockApiId} />
          <button disabled={isPending || !mockApiId}>{submitLabel}</button>
        </div>

        <nav className="editor-tabs" aria-label="Response editor tabs">
          {[
            ["response", "Mock API Response"],
            ["rule_tree", "Rule Tree"],
            ["post_actions", "Post Actions"],
          ].map(([tab, label]) => (
            <button
              className={activeTab === tab ? "active" : ""}
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab as EditorTab)}
            >
              {label}
            </button>
          ))}
        </nav>

        {activeTab === "response" && (
          <section className="editor-tab-panel form">
            <div className="form-grid">
              <label>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                Status code
                <input
                  type="number"
                  value={statusCode}
                  onChange={(e) => setStatusCode(Number(e.target.value))}
                />
              </label>
            </div>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              Default response
            </label>
            <label>
              Body type
              <select
                value={bodyType}
                onChange={(event) =>
                  setBodyType(event.target.value as ResponseBody["type"])
                }
              >
                <option value="json">json</option>
                <option value="text">text</option>
                <option value="empty">empty</option>
              </select>
            </label>
            {bodyType !== "empty" && (
              bodyType === "json" ? (
                <JsonInput
                  label="Response body"
                  value={bodyText}
                  error={bodyJsonError}
                  onChange={(value) => {
                    setBodyText(value);
                    setBodyJsonError(null);
                  }}
                />
              ) : (
                <label>
                  Response body
                  <textarea
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                  />
                </label>
              )
            )}
            <KeyValueRows label="Headers" rows={headers} onChange={setHeaders} />
            <KeyValueRows label="Cookies" rows={cookies} onChange={setCookies} />
          </section>
        )}

        {activeTab === "rule_tree" && (
          <section className="editor-tab-panel">
            {isDefault && !ruleTree ? (
              <div className="empty-state">
                Default responses do not use rule trees.
              </div>
            ) : (
              <RuleTreeEditor initialTree={ruleTree} onChange={setRuleTree} />
            )}
          </section>
        )}

        {activeTab === "post_actions" && (
          <section className="editor-tab-panel post-actions-panel">
            <div className="section-heading">
              <div>
                <h2>Post response actions</h2>
                <p>Actions run after the mock response is selected.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPostActions([
                    ...postActions,
                    createAction("set", postActions.length + 1),
                  ])
                }
              >
                Add action
              </button>
            </div>
            {!postActions.length && <p>No post response actions configured.</p>}
            {postActions.map((action, index) => (
              <PostActionForm
                action={action}
                key={index}
                onChange={(nextAction) =>
                  setPostActions(
                    postActions.map((item, itemIndex) =>
                      itemIndex === index ? nextAction : item,
                    ),
                  )
                }
                onRemove={() =>
                  setPostActions(
                    postActions.filter((_item, itemIndex) => itemIndex !== index),
                  )
                }
              />
            ))}
          </section>
        )}

        {(formError || errorMessage) && (
          <p className="error">{formError ?? errorMessage}</p>
        )}
      </section>
    </form>
  );
}
