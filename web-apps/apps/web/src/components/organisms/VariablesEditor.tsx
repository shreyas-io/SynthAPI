import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { Variable } from "../../features/projects/types";
import { JsonInput } from "../atoms/JsonInput";

type VariableRow = Variable & {
  id: string;
  value_text: string;
  error?: string | null;
};

const createId = () => crypto.randomUUID();

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
  variables,
  onChange,
}: {
  title: string;
  variables: Variable[] | null | undefined;
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
        <button
          className="button purple-btn"
          type="button"
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
        </button>
      </div>
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
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="array">array</option>
                <option value="object">object</option>
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
                <option value="true">true</option>
                <option value="false">false</option>
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
          <button
            className="button danger-btn"
            type="button"
            onClick={() => emit(rows.filter((item) => item.id !== row.id))}
          >
            <Trash2 size={14} />
            Remove
          </button>
        </article>
      ))}
    </section>
  );
}

export function VariablesViewer({
  title,
  variables,
}: {
  title: string;
  variables: Variable[] | null | undefined;
}) {
  return (
    <section className="variables-editor">
      <h3>{title}</h3>
      {!variables?.length && <p>No variables configured.</p>}
      {variables?.map((variable) => (
        <article className="variable-editor-row" key={variable.name}>
          <div>
            <strong>{variable.name}</strong>
            <p>
              {variable.type}: <code>{stringifyValue(variable.value)}</code>
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}
