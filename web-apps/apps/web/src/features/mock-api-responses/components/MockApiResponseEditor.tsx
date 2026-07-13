import { FormEvent, useEffect, useState } from "react";
import { Save, Trash2, Info } from "lucide-react";

import { Button } from "../../../components/atoms/Button";
import { JsonInput } from "../../../components/atoms/JsonInput";
import { createId } from "../../../lib/id/create_id";
import { RuleTreeEditor } from "../../rule-tree-editor/components/RuleTreeEditor";
import type {
  MockApiResponse,
  MockApiResponseInput,
  PostResponseAction,
  ResponseBody,
  RuleTree,
  SseStreamItem,
  VariableScope,
} from "../types";

type KeyValueRow = {
  id: string;
  key: string;
  value: string;
};

function TooltipLabel({
  label,
  tooltip,
}: {
  label: React.ReactNode;
  tooltip: string;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
      {label}
      <span
        title={tooltip}
        style={{ cursor: "help", display: "inline-flex", alignItems: "center" }}
      >
        <Info size={14} className="muted-text" />
      </span>
    </span>
  );
}

type EditableSseStreamItem = {
  id: string;
  delayMs: string;
  eventName: string;
  eventId: string;
  retryMs: string;
  dataMode: "text" | "json";
  dataText: string;
};

type MockApiResponseEditorProps = {
  mockApiId: string;
  initialResponse?: MockApiResponse;
  submitLabel: string;
  isPending: boolean;
  errorMessage?: string | undefined;
  isDeleting?: boolean;
  deleteErrorMessage?: string | undefined;
  onDelete?: () => void;
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
  if (body.type === "json_script") return body.code;
  if (body.type === "sse") {
    return body.mode === "script" ? body.code : "";
  }
  return body.value;
};

const createEditableSseStreamItem = (
  item?: SseStreamItem,
): EditableSseStreamItem => ({
  id: createId(),
  delayMs:
    item?.delay_ms === undefined || item.delay_ms === null
      ? ""
      : String(item.delay_ms),
  eventName: item?.sse.event ?? "",
  eventId: item?.sse.id ?? "",
  retryMs:
    item?.sse.retry_ms === undefined || item.sse.retry_ms === null
      ? ""
      : String(item.sse.retry_ms),
  dataMode: typeof item?.sse.data === "string" ? "text" : "json",
  dataText:
    item === undefined
      ? ""
      : typeof item.sse.data === "string"
        ? item.sse.data
        : JSON.stringify(item.sse.data, null, 2),
});

const editableSseItemsFromResponse = (
  body: ResponseBody,
): EditableSseStreamItem[] =>
  body.type === "sse" && body.mode === "events"
    ? body.events.map((item) => createEditableSseStreamItem(item))
    : [];

const sseItemsFromEditable = (
  items: EditableSseStreamItem[],
): SseStreamItem[] =>
  items.map((item) => ({
    ...(item.delayMs.trim()
      ? { delay_ms: Number.parseInt(item.delayMs, 10) }
      : {}),
    sse: {
      ...(item.eventName.trim() ? { event: item.eventName.trim() } : {}),
      ...(item.eventId.trim() ? { id: item.eventId.trim() } : {}),
      ...(item.retryMs.trim()
        ? { retry_ms: Number.parseInt(item.retryMs, 10) }
        : {}),
      data:
        item.dataMode === "json" ? JSON.parse(item.dataText) : item.dataText,
    },
  }));

const hasSseContentType = (rows: KeyValueRow[]): boolean =>
  rows.some(
    (row) =>
      row.key.trim().toLowerCase() === "content-type" &&
      row.value.trim().toLowerCase().includes("text/event-stream"),
  );

const normalizeRuleTree = (ruleTree: RuleTree | null): RuleTree | null => {
  if (!ruleTree) return null;

  const predicates = ruleTree.predicates.filter((pred) =>
    pred.type === "custom" ? pred.script.trim() : pred.actual.trim(),
  );
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
        <Button
          variant="secondary"
          size="compact"
          onClick={() =>
            onChange([...rows, { id: createId(), key: "", value: "" }])
          }
        >
          Add
        </Button>
      </div>
      {rows.map((row, index) => (
        <div key={row.id} className="key-value-row">
          <input
            placeholder="key"
            value={row.key}
            onChange={(e) =>
              onChange(
                rows.map((r) =>
                  r.id === row.id ? { ...r, key: e.target.value } : r,
                ),
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
          <Button
            variant="secondary"
            className="icon-btn"
            onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
          >
            ×
          </Button>
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
  const isValueAction =
    action.type === "set" ||
    action.type === "append" ||
    action.type === "remove";
  const actionValue = isValueAction ? (action as any).value : undefined;

  const valueType =
    actionValue === null
      ? "null"
      : Array.isArray(actionValue)
        ? "array"
        : typeof actionValue === "object" && actionValue !== null
          ? "object"
          : typeof actionValue === "boolean"
            ? "boolean"
            : typeof actionValue === "number"
              ? "number"
              : "string";

  const [draftJson, setDraftJson] = useState<string | null>(null);

  const handleTypeChange = (newType: string) => {
    setDraftJson(null);
    let newValue: any = "";
    if (newType === "number") newValue = 0;
    if (newType === "boolean") newValue = false;
    if (newType === "null") newValue = null;
    if (newType === "array") newValue = [];
    if (newType === "object") newValue = {};
    onChange({ ...action, value: newValue } as any);
  };

  const handleValueChange = (val: string) => {
    if (valueType === "number") {
      onChange({ ...action, value: Number(val) } as any);
    } else if (valueType === "boolean") {
      onChange({ ...action, value: val === "true" } as any);
    } else if (valueType === "array" || valueType === "object") {
      setDraftJson(val);
      try {
        const parsed = JSON.parse(val);
        onChange({ ...action, value: parsed } as any);
      } catch {
        // Invalid JSON, keep draft JSON but do not propagate
      }
    } else {
      onChange({ ...action, value: val } as any);
    }
  };

  let displayJson = "";
  let jsonError: string | null = null;
  if (valueType === "array" || valueType === "object") {
    displayJson =
      draftJson !== null ? draftJson : JSON.stringify(actionValue, null, 2);
    if (draftJson !== null) {
      try {
        JSON.parse(draftJson);
      } catch {
        jsonError = "Invalid JSON";
      }
    }
  }

  return (
    <div className="post-action-card form">
      <div className="section-heading">
        <select
          value={action.type}
          onChange={(e) => {
            setDraftJson(null);
            onChange(
              createAction(
                e.target.value as PostResponseAction["type"],
                action.order,
              ),
            );
          }}
        >
          {actionTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <Button variant="secondary" className="icon-btn" onClick={onRemove}>
          ×
        </Button>
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
                onChange={(e) =>
                  onChange({ ...action, amount: Number(e.target.value) })
                }
              />
            </label>
          ) : action.type === "unset" ? null : (
            <>
              <label>
                Value type
                <select
                  value={valueType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="null">null</option>
                  <option value="array">array</option>
                  <option value="object">object</option>
                </select>
              </label>
              {valueType === "null" ? null : valueType === "boolean" ? (
                <label>
                  Value
                  <select
                    value={String(actionValue)}
                    onChange={(e) => handleValueChange(e.target.value)}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </label>
              ) : valueType === "array" || valueType === "object" ? (
                <JsonInput
                  label="Value"
                  value={displayJson}
                  error={jsonError}
                  onChange={handleValueChange}
                />
              ) : (
                <label>
                  Value
                  <input
                    type={valueType === "number" ? "number" : "text"}
                    placeholder="e.g. {{request.body.value.email}}"
                    value={String(actionValue ?? "")}
                    onChange={(e) => handleValueChange(e.target.value)}
                  />
                </label>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SseStreamItemForm({
  item,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onChange,
  onRemove,
}: {
  item: EditableSseStreamItem;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChange: (item: EditableSseStreamItem) => void;
  onRemove: () => void;
}) {
  return (
    <div className="post-action-card form">
      <div className="section-heading">
        <div className="toolbar-actions">
          <Button
            variant="secondary"
            size="compact"
            disabled={isFirst}
            onClick={onMoveUp}
          >
            ↑
          </Button>
          <Button
            variant="secondary"
            size="compact"
            disabled={isLast}
            onClick={onMoveDown}
          >
            ↓
          </Button>
        </div>
        <Button variant="secondary" className="icon-btn" onClick={onRemove}>
          ×
        </Button>
      </div>

      <div className="form-grid">
        <label>
          Delay (ms)
          <input
            type="number"
            min="0"
            placeholder="5"
            value={item.delayMs}
            onChange={(e) => onChange({ ...item, delayMs: e.target.value })}
          />
        </label>
        <label>
          Event
          <input
            placeholder="message"
            value={item.eventName}
            onChange={(e) => onChange({ ...item, eventName: e.target.value })}
          />
        </label>
        <label>
          ID
          <input
            placeholder="evt-1"
            value={item.eventId}
            onChange={(e) => onChange({ ...item, eventId: e.target.value })}
          />
        </label>
        <label>
          Retry (ms)
          <input
            type="number"
            min="0"
            placeholder="1000"
            value={item.retryMs}
            onChange={(e) => onChange({ ...item, retryMs: e.target.value })}
          />
        </label>
        <label>
          Data type
          <select
            value={item.dataMode}
            onChange={(e) =>
              onChange({
                ...item,
                dataMode: e.target.value as EditableSseStreamItem["dataMode"],
              })
            }
          >
            <option value="text">text</option>
            <option value="json">json</option>
          </select>
        </label>
      </div>

      {item.dataMode === "json" ? (
        <JsonInput
          label="Data"
          value={item.dataText}
          onChange={(value) => onChange({ ...item, dataText: value })}
        />
      ) : (
        <label>
          Data
          <textarea
            value={item.dataText}
            onChange={(e) => onChange({ ...item, dataText: e.target.value })}
          />
        </label>
      )}
    </div>
  );
}

export function MockApiResponseEditor({
  mockApiId,
  initialResponse,
  submitLabel,
  isPending,
  errorMessage,
  isDeleting = false,
  deleteErrorMessage,
  onDelete,
  onSubmit,
}: MockApiResponseEditorProps) {
  const initialBody = initialResponse?.response.body ?? {
    type: "json" as const,
    value: { ok: true },
  };

  const [name, setName] = useState(initialResponse?.name ?? "");
  const [activeTab, setActiveTab] = useState<"response" | "actions" | "rules">(
    "response",
  );
  const [isDefault, setIsDefault] = useState(
    initialResponse?.is_default ?? false,
  );
  const [statusCode, setStatusCode] = useState(
    initialResponse?.response.status_code ?? 200,
  );
  const [bodyType, setBodyType] = useState<ResponseBody["type"]>(
    initialBody.type,
  );
  const [bodyText, setBodyText] = useState(bodyTextFromResponse(initialBody));
  const [sseMode, setSseMode] = useState<"events" | "script">(
    initialBody.type === "sse" ? initialBody.mode : "events",
  );
  const [sseItems, setSseItems] = useState<EditableSseStreamItem[]>(
    editableSseItemsFromResponse(initialBody),
  );
  const [sseScript, setSseScript] = useState(
    initialBody.type === "sse" && initialBody.mode === "script"
      ? initialBody.code
      : "return []",
  );
  const [headers, setHeaders] = useState<KeyValueRow[]>(
    rowsFromRecord(
      initialResponse?.response.headers ?? {
        "content-type": "application/json",
      },
    ),
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
    setSseMode(nextBody.type === "sse" ? nextBody.mode : "events");
    setSseItems(editableSseItemsFromResponse(nextBody));
    setSseScript(
      nextBody.type === "sse" && nextBody.mode === "script"
        ? nextBody.code
        : "return []",
    );
    setHeaders(
      rowsFromRecord(
        initialResponse?.response.headers ?? {
          "content-type": "application/json",
        },
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
      } else if (bodyType === "sse") {
        body =
          sseMode === "events"
            ? {
                type: "sse",
                mode: "events",
                events: sseItemsFromEditable(sseItems),
              }
            : {
                type: "sse",
                mode: "script",
                code: sseScript,
              };
      } else if (bodyType === "json_script") {
        body = {
          type: "json_script",
          code: bodyText,
        };
      } else {
        body = {
          type: "empty",
        };
      }
    } catch {
      if (bodyType === "json") {
        setBodyJsonError("Invalid JSON.");
      } else {
        setFormError("Invalid SSE JSON event data.");
      }
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
      rule_tree: normalizeRuleTree(ruleTree),
      post_response_actions: postActions,
    });
  };

  return (
    <form className="response-editor-shell flat-editor" onSubmit={submit}>
      <div className="workspace-row editor-toolbar dense-editor-toolbar">
        <div className="editor-title-row">
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              gap: "24px",
            }}
          >
            <h2
              title={initialResponse ? initialResponse.name : "Create response"}
              style={{ flex: "none", maxWidth: "400px" }}
            >
              {initialResponse ? initialResponse.name : "Create response"}
            </h2>
            <div className="editor-tabs compact-tabs inline-tabs">
              <button
                className={activeTab === "response" ? "active" : ""}
                type="button"
                onClick={() => setActiveTab("response")}
              >
                Response
              </button>
              <button
                className={activeTab === "actions" ? "active" : ""}
                type="button"
                onClick={() => setActiveTab("actions")}
              >
                Actions
              </button>
              <button
                type="button"
                className={activeTab === "rules" ? "active" : ""}
                onClick={() => setActiveTab("rules")}
              >
                Rules
              </button>
            </div>
          </div>
          <div className="toolbar-actions">
            <Button
              type="submit"
              size="icon"
              aria-label={submitLabel}
              disabled={isPending || !mockApiId}
            >
              <Save size={14} />
            </Button>
            {onDelete && (
              <Button
                variant="danger"
                size="icon"
                aria-label="Delete"
                disabled={isPending || isDeleting}
                onClick={onDelete}
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>

      <section className="response-editor-main">
        <div className="response-editor-stack">
          {activeTab === "response" && (
            <div className="editor-tab-panel form flat-panel">
              <div className="field-grid">
                <label>
                  <TooltipLabel
                    label="Name"
                    tooltip="A descriptive name for this response branch."
                  />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  <TooltipLabel
                    label="Status code"
                    tooltip="The HTTP status code to return when this response matches."
                  />
                  <input
                    type="number"
                    value={statusCode}
                    onChange={(e) => setStatusCode(Number(e.target.value))}
                  />
                </label>
                <label>
                  <TooltipLabel
                    label="Set as Default Response"
                    tooltip="This response will be used as a fallback if no other response's rules match the incoming request."
                  />
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                  />
                </label>
                <label>
                  <TooltipLabel
                    label="Body type"
                    tooltip="The format of the response body. 'json_script' allows dynamic generation via Python."
                  />
                  <select
                    value={bodyType}
                    onChange={(event) =>
                      setBodyType(event.target.value as ResponseBody["type"])
                    }
                  >
                    <option value="json">json</option>
                    <option value="json_script">json_script</option>
                    <option value="text">text</option>
                    <option value="sse">sse</option>
                    <option value="empty">empty</option>
                  </select>
                </label>
              </div>
              {bodyType !== "empty" &&
                (bodyType === "json" ? (
                  <JsonInput
                    label="Response body"
                    value={bodyText}
                    error={bodyJsonError}
                    onChange={(value) => {
                      setBodyText(value);
                      setBodyJsonError(null);
                    }}
                  />
                ) : bodyType === "json_script" ? (
                  <JsonInput
                    label="Python JSON builder script"
                    value={bodyText}
                    onChange={(value) => {
                      setBodyText(value);
                    }}
                  />
                ) : bodyType === "sse" ? (
                  <div className="form">
                    <div className="field-grid">
                      <label>
                        SSE mode
                        <select
                          value={sseMode}
                          onChange={(event) =>
                            setSseMode(
                              event.target.value as "events" | "script",
                            )
                          }
                        >
                          <option value="events">events</option>
                          <option value="script">script</option>
                        </select>
                      </label>
                    </div>

                    {!hasSseContentType(headers) && (
                      <p className="muted-text">
                        Recommended header:{" "}
                        <code>content-type: text/event-stream</code>
                      </p>
                    )}

                    {sseMode === "events" ? (
                      <section className="post-actions-panel">
                        <div className="section-heading">
                          <div>
                            <h3>SSE events</h3>
                          </div>
                          <Button
                            variant="secondary"
                            size="compact"
                            onClick={() =>
                              setSseItems([
                                ...sseItems,
                                createEditableSseStreamItem(),
                              ])
                            }
                          >
                            + Add
                          </Button>
                        </div>
                        {!sseItems.length && (
                          <p className="muted-text">
                            No SSE events configured.
                          </p>
                        )}
                        {sseItems.map((item, index) => (
                          <SseStreamItemForm
                            key={item.id}
                            item={item}
                            isFirst={index === 0}
                            isLast={index === sseItems.length - 1}
                            onMoveUp={() =>
                              setSseItems((current) => {
                                if (index === 0) return current;

                                const next = [...current];
                                const previousItem = next[index - 1];
                                const currentItem = next[index];

                                if (!previousItem || !currentItem) {
                                  return current;
                                }

                                next[index - 1] = currentItem;
                                next[index] = previousItem;
                                return next;
                              })
                            }
                            onMoveDown={() =>
                              setSseItems((current) => {
                                if (index === current.length - 1) {
                                  return current;
                                }

                                const next = [...current];
                                const currentItem = next[index];
                                const nextItem = next[index + 1];

                                if (!currentItem || !nextItem) {
                                  return current;
                                }

                                next[index] = nextItem;
                                next[index + 1] = currentItem;
                                return next;
                              })
                            }
                            onChange={(nextItem) =>
                              setSseItems((current) =>
                                current.map((currentItem) =>
                                  currentItem.id === item.id
                                    ? nextItem
                                    : currentItem,
                                ),
                              )
                            }
                            onRemove={() =>
                              setSseItems((current) =>
                                current.filter(
                                  (currentItem) => currentItem.id !== item.id,
                                ),
                              )
                            }
                          />
                        ))}
                      </section>
                    ) : (
                      <JsonInput
                        label="Python script"
                        value={sseScript}
                        onChange={setSseScript}
                      />
                    )}
                  </div>
                ) : (
                  <label>
                    Response body
                    <textarea
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                    />
                  </label>
                ))}
              <KeyValueRows
                label="Headers"
                rows={headers}
                onChange={setHeaders}
              />
              <KeyValueRows
                label="Cookies"
                rows={cookies}
                onChange={setCookies}
              />
            </div>
          )}

          {activeTab === "actions" && (
            <div className="editor-tab-panel post-actions-panel flat-panel">
              <div className="section-heading">
                <div>
                  <h3>Post response actions</h3>
                </div>
                <Button
                  variant="secondary"
                  size="compact"
                  onClick={() =>
                    setPostActions([
                      ...postActions,
                      createAction("set", postActions.length + 1),
                    ])
                  }
                >
                  + Add
                </Button>
              </div>
              <p className="muted-text" style={{ marginBottom: "1rem" }}>
                Execute state-changing actions immediately after this response
                is served, such as incrementing a counter, or mutating a global
                variable.
              </p>
              {!postActions.length && (
                <p className="muted-text">
                  No post response actions configured.
                </p>
              )}
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
                      postActions.filter(
                        (_item, itemIndex) => itemIndex !== index,
                      ),
                    )
                  }
                />
              ))}
            </div>
          )}

          {activeTab === "rules" && (
            <div className="editor-tab-panel rule-editor-panel flat-panel">
              <p className="muted-text" style={{ marginBottom: "1rem" }}>
                Rules define the conditions that must be met for this response
                to be served. You can match against headers, validate JSON
                payloads, or check internal state variables.
              </p>
              <div className="rule-editor-frame">
                <RuleTreeEditor initialTree={ruleTree} onChange={setRuleTree} />
              </div>
            </div>
          )}
        </div>

        {(formError || errorMessage || deleteErrorMessage) && (
          <p className="error">
            {formError ?? errorMessage ?? deleteErrorMessage}
          </p>
        )}
      </section>
    </form>
  );
}
