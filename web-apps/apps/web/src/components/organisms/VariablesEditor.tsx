import { Plus, Trash2, Copy, Check } from "lucide-react";
import { useEffect, useState } from "react";

import type { Variable } from "../../features/projects/types";
import { Button } from "../atoms/Button";
import { JsonInput } from "../atoms/JsonInput";
import { createId } from "../../lib/id/create_id";

type VariableRow = Variable & {
  id: string;
  value_text: string;
  error?: string | null;
};

const stringifyValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === undefined) return "";
  return JSON.stringify(value, null, 2);
};

const rowsFromVariables = (
  variables: Variable[] | null | undefined,
): VariableRow[] =>
  (variables ?? []).map((variable) => ({
    ...variable,
    id: createId(),
    value_text: stringifyValue(variable.value),
    error: null,
  }));

const parseValue = (row: VariableRow): unknown => {
  if (row.type === "string") return row.value_text;
  if (row.type === "number") return Number(row.value_text);
  if (row.type === "boolean") return row.value_text === "true";

  return JSON.parse(row.value_text);
};

export function VariablesEditor({
  title,
  description,
  variables,
  allowAdd = true,
  onChange,
}: {
  title: string;
  description?: React.ReactNode;
  variables: Variable[] | null | undefined;
  allowAdd?: boolean;
  onChange: (variables: Variable[]) => void;
}) {
  const [rows, setRows] = useState<VariableRow[]>(() =>
    rowsFromVariables(variables),
  );

  useEffect(() => {
    setRows(rowsFromVariables(variables));
  }, [variables]);

  const emit = (nextRows: VariableRow[]) => {
    setRows(nextRows);

    const parsedRows = nextRows.map((row) => {
      try {
        return {
          ...row,
          value: parseValue(row),
          error: null,
        };
      } catch {
        return {
          ...row,
          error: "Invalid JSON.",
        };
      }
    });

    setRows(parsedRows);

    if (parsedRows.some((row) => row.error)) return;

    onChange(
      parsedRows
        .filter((row) => row.name.trim())
        .map((row) => ({
          name: row.name.trim(),
          type: row.type,
          value: row.value,
        })),
    );
  };

  return (
    <section className="variables-editor">
      <div className="section-heading">
        <h3>{title}</h3>
        {allowAdd && (
          <Button
            variant="purple"
            onClick={() =>
              emit([
                ...rows,
                {
                  id: createId(),
                  name: "",
                  type: "string",
                  value: "",
                  value_text: "",
                },
              ])
            }
          >
            <Plus size={14} />
            Add
          </Button>
        )}
      </div>
      {description && <p className="muted-text" style={{ marginBottom: "1rem", marginTop: "-0.5rem" }}>{description}</p>}
      {!rows.length && <p>No variables configured.</p>}
      {rows.map((row) => (
        <article className="variable-editor-row" key={row.id}>
          <div className="form-grid">
            <label>
              Name
              <input
                value={row.name}
                onChange={(event) =>
                  emit(
                    rows.map((item) =>
                      item.id === row.id
                        ? { ...item, name: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <label>
              Type
              <select
                value={row.type}
                onChange={(event) => {
                  const type = event.target.value as Variable["type"];
                  emit(
                    rows.map((item) =>
                      item.id === row.id
                        ? {
                            ...item,
                            type,
                            value_text:
                              type === "boolean"
                                ? "false"
                                : type === "array"
                                  ? "[]"
                                  : type === "object"
                                    ? "{}"
                                    : "",
                          }
                        : item,
                    ),
                  );
                }}
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="array">Array</option>
                <option value="object">Object</option>
              </select>
            </label>
          </div>
          {row.type === "boolean" ? (
            <label>
              Value
              <select
                value={row.value_text}
                onChange={(event) =>
                  emit(
                    rows.map((item) =>
                      item.id === row.id
                        ? { ...item, value_text: event.target.value }
                        : item,
                    ),
                  )
                }
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </label>
          ) : row.type === "array" || row.type === "object" ? (
            <JsonInput
              label="Value"
              value={row.value_text}
              error={row.error}
              onChange={(value) =>
                emit(
                  rows.map((item) =>
                    item.id === row.id ? { ...item, value_text: value } : item,
                  ),
                )
              }
            />
          ) : (
            <label>
              Value
              <input
                type={row.type === "number" ? "number" : "text"}
                value={row.value_text}
                onChange={(event) =>
                  emit(
                    rows.map((item) =>
                      item.id === row.id
                        ? { ...item, value_text: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </label>
          )}
          <Button
            variant="danger"
            onClick={() => emit(rows.filter((item) => item.id !== row.id))}
          >
            <Trash2 size={14} />
            Remove
          </Button>
        </article>
      ))}
    </section>
  );
}

function VariableViewerRow({ variable, prefix }: { variable: Variable; prefix: string }) {
  const [copiedTag, setCopiedTag] = useState(false);
  const [copiedValue, setCopiedValue] = useState(false);

  const handleCopyTag = () => {
    void navigator.clipboard.writeText(`{{${prefix}.${variable.name}}}`);
    setCopiedTag(true);
    setTimeout(() => setCopiedTag(false), 2000);
  };

  const handleCopyValue = () => {
    void navigator.clipboard.writeText(stringifyValue(variable.value));
    setCopiedValue(true);
    setTimeout(() => setCopiedValue(false), 2000);
  };

  return (
    <article className="variable-editor-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <strong>{variable.name}</strong>
        <p>
          {variable.type}: <code>{stringifyValue(variable.value)}</code>
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button variant="secondary" size="compact" onClick={handleCopyValue}>
          {copiedValue ? <Check size={14} /> : <Copy size={14} />}
          {copiedValue ? "Copied" : "Copy value"}
        </Button>
        <Button variant="secondary" size="compact" onClick={handleCopyTag}>
          {copiedTag ? <Check size={14} /> : <Copy size={14} />}
          {copiedTag ? "Copied" : "Copy tag"}
        </Button>
      </div>
    </article>
  );
}

export function VariablesViewer({
  title,
  description,
  variables,
  prefix,
}: {
  title: string;
  description?: React.ReactNode;
  variables: Variable[] | null | undefined;
  prefix: string;
}) {
  return (
    <section className="variables-editor">
      <h3>{title}</h3>
      {description && <p className="muted-text" style={{ marginBottom: "1rem", marginTop: "-0.5rem" }}>{description}</p>}
      {!variables?.length && <p>No variables configured.</p>}
      {variables?.map((variable) => (
        <VariableViewerRow key={variable.name} variable={variable} prefix={prefix} />
      ))}
    </section>
  );
}
