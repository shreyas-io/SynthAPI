import { useMemo, useState } from "react";

import { Button } from "../atoms/Button";

type TemplateKind =
  | "form_field"
  | "json_field"
  | "header"
  | "query"
  | "path_param"
  | "cookie"
  | "global"
  | "constant"
  | "local";

type TemplateOption = {
  kind: TemplateKind;
  label: string;
  prefix: string;
  defaultName: string;
};

const templateOptions: TemplateOption[] = [
  {
    kind: "form_field",
    label: "Form body field",
    prefix: "request.body.value",
    defaultName: "email",
  },
  {
    kind: "json_field",
    label: "JSON body field",
    prefix: "request.body.value",
    defaultName: "email",
  },
  {
    kind: "header",
    label: "Header",
    prefix: "request.headers",
    defaultName: "authorization",
  },
  {
    kind: "query",
    label: "Query param",
    prefix: "request.query_params",
    defaultName: "page",
  },
  {
    kind: "path_param",
    label: "Path param",
    prefix: "request.path_params",
    defaultName: "id",
  },
  {
    kind: "cookie",
    label: "Cookie",
    prefix: "request.cookies",
    defaultName: "session_id",
  },
  {
    kind: "global",
    label: "Global variable",
    prefix: "globals",
    defaultName: "next_id",
  },
  {
    kind: "constant",
    label: "Constant",
    prefix: "constants",
    defaultName: "api_version",
  },
  {
    kind: "local",
    label: "Local variable",
    prefix: "variables",
    defaultName: "request_count",
  },
];

const normalizePathSegment = (value: string) =>
  value.trim().replace(/^\.+|\.+$/g, "");

const getTemplate = (option: TemplateOption, name: string): string => {
  const segment = normalizePathSegment(name) || option.defaultName;
  return `{{${option.prefix}.${segment}}}`;
};

type RequestTemplatePickerProps = {
  label?: string;
  onInsert?: (template: string) => void;
  insertLabel?: string;
};

export function RequestTemplatePicker({
  label = "Request values",
  onInsert,
  insertLabel = "Insert",
}: RequestTemplatePickerProps) {
  const [kind, setKind] = useState<TemplateKind>("form_field");
  const option = useMemo(
    () => templateOptions.find((item) => item.kind === kind) ?? templateOptions[0]!,
    [kind],
  );
  const [name, setName] = useState(option.defaultName);
  const template = getTemplate(option, name);

  const setOption = (nextKind: TemplateKind) => {
    const nextOption =
      templateOptions.find((item) => item.kind === nextKind) ??
      templateOptions[0]!;
    setKind(nextKind);
    setName(nextOption.defaultName);
  };

  const copyTemplate = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(template);
  };

  return (
    <div className="request-template-picker">
      <div className="request-template-picker-header">
        <span>{label}</span>
      </div>
      <div className="request-template-picker-controls">
        <select
          aria-label={`${label} source`}
          value={kind}
          onChange={(event) => setOption(event.target.value as TemplateKind)}
        >
          {templateOptions.map((item) => (
            <option key={item.kind} value={item.kind}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          aria-label={`${label} field`}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <code>{template}</code>
        {onInsert && (
          <Button
            variant="secondary"
            size="compact"
            onClick={() => onInsert(template)}
          >
            {insertLabel}
          </Button>
        )}
        <Button variant="secondary" size="compact" onClick={copyTemplate}>
          Copy
        </Button>
      </div>
    </div>
  );
}
