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
  return JSON.stringify(value);
};

const parseValue = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const rowsFromRecord = (record: Record<string, unknown>): KeyValueRow[] =>
  Object.entries(record).map(([key, value]) => ({
    id: createId(),
    key,
    value: stringifyValue(value),
  }));

const recordFromRows = (rows: KeyValueRow[]): Record<string, unknown> =>
  rows.reduce((acc, { key, value }) => {
    if (!key.trim()) return acc;
    return { ...acc, [key]: parseValue(value) };
  }, {});

const bodyTextFromResponse = (body: ResponseBody): string => {
  if (body.type === "empty") return "";
  if (body.type === "json") return JSON.stringify(body.value, null, 2);
  return body.value;
};

const normalizeRuleTree = (ruleTree: RuleTree | null): RuleTree | null => {
  if (!ruleTree) return null;

  const predicates = ruleTree.predicates.filter((pred) => pred.actual.trim());
  const predicateBranches = predicates.map((pred) => ({
    label: pred.label,
    type: "and" as const,
    predicates: [pred],
  }));

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
          className="secondary-btn"
          style={{ padding: "0.2rem 0.5rem" }}
          onClick={() => onChange([...rows, { id: createId(), key: "", value: "" }])}
        >
          Add
        </button>
      </div>
      {rows.map((row, index) => (
        <div key={row.id} className="key-value-row">
          <input
            placeholder="key"
            value={row.key}
            onChange={(e) =>
              onChange(
                rows.map((r) => (r.id === row.id ? { ...r, key: e.target.value } : r)),
              )
            }
          />
          <input
            placeholder="value"
            value={row.value}
            onChange={(e) =>
              onChange(
                rows.map((r) =>
                  r.id === row.id ? { ...r, value: e.target.value } : r,
                ),
              )
            }
          />
          <button
            type="button"
            className="secondary-btn icon-btn"
            onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
          >
            ×
          </button>
        </div>
      ))}
    </section>
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
  return (
    <div className="post-action-card form">
      <div className="section-heading">
        <select
          value={action.type}
          onChange={(e) =>
            onChange(
              createAction(e.target.value as PostResponseAction["type"], action.order),
            )
          }
        >
          {actionTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button type="button" className="icon-btn" onClick={onRemove}>
          ×
        </button>
      </div>

      {action.type === "script" ? (
        <JsonInput
          label="Python script"
          value={action.code}
          onChange={(value) => onChange({ ...action, code: value })}
        />
      ) : (
        <div className="form-grid">
          <label>
            Scope
            <select
              value={action.scope}
              onChange={(e) =>
                onChange({ ...action, scope: e.target.value as VariableScope })
              }
            >
              <option value="local">local</option>
              <option value="global">global</option>
            </select>
          </label>
          <label>
            Key
            <input
              placeholder="e.g. counter"
              value={action.key}
              onChange={(e) => onChange({ ...action, key: e.target.value })}
            />
          </label>
          {action.type === "increment" || action.type === "decrement" ? (
            <label>
              Amount
              <input
                type="number"
                value={action.amount}
                onChange={(e) => onChange({ ...action, amount: Number(e.target.value) })}
              />
            </label>
          ) : action.type === "unset" ? null : (
            <label>
              Value
              <input
                placeholder="e.g. {{request.body.id}}"
                value={String((action as any).value ?? "")}
                onChange={(e) => onChange({ ...action, value: e.target.value } as PostResponseAction)}
              />
            </label>
          )}
        </div>
      )}
    </div>
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
    queryFn: () => getProject(mockApi.data?.project_id ?? ""),
    enabled: !!mockApi.data?.project_id,
  });

  const renderVars = (title: string, vars?: Variable[] | null) => {
    if (!vars?.length) return null;
    return (
      <div className="variable-reference-section">
        <h3>{title}</h3>
        {vars.map((v) => (
          <div key={v.name} className="variable-reference-card">
            <small>{v.name}</small>
            <code>{`{{${title === "Local variables" ? "variables" : title === "Constants" ? "constants" : "globals"}.${v.name}}}`}</code>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="secondary-btn" style={{ padding: "0.2rem 0.5rem" }}>
        Variables Ref
      </button>

      {isOpen && (
        <div className="variable-reference-modal-backdrop">
          <section className="variable-reference-modal card">
            <div className="section-heading">
              <h2>Variables Reference</h2>
              <button type="button" onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>
            <p>You can use these variables in your templates (body, headers, expected values, etc).</p>
            {renderVars("Project globals", project.data?.globals)}
            {renderVars("Constants", project.data?.constants)}
            {renderVars("Local variables", mockApi.data?.variables)}
          </section>
        </div>
      )}
    </>
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

  const [name, setName] = useState(initialResponse?.name ?? "");
  const [leftTab, setLeftTab] = useState<"response" | "actions">("response");
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
      <div className="editor-toolbar" style={{ padding: "0.5rem", background: "transparent", border: "none" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", width: "100%" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{initialResponse ? initialResponse.name : "Create mock response"}</h2>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
             <VariablesReference mockApiId={mockApiId} />
             <button disabled={isPending || !mockApiId} style={{ padding: "0.2rem 0.5rem" }}>{submitLabel}</button>
          </div>
        </div>
      </div>

      <section className="response-editor-main" style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "1.5rem" }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="editor-tabs" style={{ gap: "0.5rem", flexWrap: "wrap", borderBottom: "none", paddingBottom: 0 }}>
            <button
              className={leftTab === "response" ? "active" : "secondary-btn"}
              type="button"
              onClick={() => setLeftTab("response")}
              style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem", borderRadius: "4px" }}
            >
              Response Config
            </button>
            <button
              className={leftTab === "actions" ? "active" : "secondary-btn"}
              type="button"
              onClick={() => setLeftTab("actions")}
              style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem", borderRadius: "4px" }}
            >
              Post Actions
            </button>
          </div>

          {leftTab === "response" && (
            <div className="card form">
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
            </div>
          )}

          {leftTab === "actions" && (
            <div className="card post-actions-panel">
              <div className="section-heading" style={{ marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ margin: 0 }}>Post response actions</h3>
                </div>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ padding: "0.2rem 0.5rem" }}
                  onClick={() =>
                    setPostActions([
                      ...postActions,
                      createAction("set", postActions.length + 1),
                    ])
                  }
                >
                  + Add
                </button>
              </div>
              {!postActions.length && <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>No post response actions configured.</p>}
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
            </div>
          )}
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 12rem)" }}>
          <div className="section-heading" style={{ marginBottom: "0.5rem" }}>
            <h3 style={{ margin: 0 }}>Rule Tree</h3>
          </div>
          {isDefault && !ruleTree ? (
            <div className="empty-state">
              Default responses do not use rule trees.
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0 }}>
              <RuleTreeEditor initialTree={ruleTree} onChange={setRuleTree} />
            </div>
          )}
        </div>

        {(formError || errorMessage) && (
          <p className="error" style={{ gridColumn: "1 / -1" }}>{formError ?? errorMessage}</p>
        )}
      </section>
    </form>
  );
}