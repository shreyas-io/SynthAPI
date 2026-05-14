const fs = require('fs');
const file = 'web-apps/apps/web/src/features/rule-tree-editor/components/RuleTreeEditor.tsx';
let code = fs.readFileSync(file, 'utf8');
const operatorAliases = `const operatorAliases: Record<string, string> = {
  null: "Is Null",
  not_null: "Is Not Null",
  empty_array: "Is Empty Array",
  not_empty_array: "Is Not Empty Array",
  is_set: "Is Set (Exists)",
  is_not_set: "Is Not Set (Missing)",
  string_empty: "Is Empty String",
  string_not_empty: "Is Not Empty String",
  equals: "Equals",
  not_equals: "Does Not Equal",
  regex: "Matches Regex",
  gt: "Greater Than (>)",
  gte: "Greater Than or Equal (>=)",
  lt: "Less Than (<)",
  lte: "Less Than or Equal (<=)",
  array_includes: "Array Includes",
  string_includes: "String Contains",
  string_not_includes: "String Does Not Contain",
  valid_json_schema: "Validates against JSON Schema",
};`;
code = code.replace(
  'const operators = [...operatorsWithoutExpected, ...operatorsWithExpected] as const;',
  `const operators = [...operatorsWithoutExpected, ...operatorsWithExpected] as const;\n\n${operatorAliases}`
);
code = code.replace(
  'const nodeHeight = 120; // Avg height',
  'const nodeHeight = 180; // Avg height'
);
const oldPredicateBody = `<div className="rf-node-body">
        <input
          placeholder="{{request.body.id}}"
          value={data.actual}
          onChange={(e) => data.onChange({ actual: e.target.value })}
          className="rf-input"
        />
        <select
          value={data.operator}
          onChange={(e) => {
            const op = e.target.value;
            data.onChange({
              operator: op,
              expected: operatorNeedsExpected(op) ? data.expected : "",
            });
          }}
          className="rf-select"
        >
          {operators.map((operator) => (
            <option key={operator} value={operator}>
              {operator}
            </option>
          )i}
        </select>
        {operatorNeedsExpected(data.operator) && (
          <div className="rf-expected-wrapper">
            <JsonInput
              label=""
              value={data.expected}
              onChange={(value) => data.onChange({ expected: value || "" })}
            />
          </div>
        )}
      </div>`;
const newPredicateBody = `<div className="rf-node-body">
        <label>
          Actual Value
          <input
            placeholder="{{request.body.id}}"
            value={data.actual}
            onChange={(e) => data.onChange({ actual: e.target.value })}
            className="rf-input"
          />
        </label>
        <label>
          Operator
          <select
            value={data.operator}
            onChange={(e) => {
              const op = e.target.value;
              data.onChange({
                operator: op,
                expected: operatorNeedsExpected(op) ? data.expected : "",
              });
            }}
            className="rf-select"
          >
            {operators.map((operator) => (
              <option key={operator} value={operator}>
                {operatorAliases[operator] || operator}
              </option>
            ))}
          </select>
        </label>
        {operatorNeedsExpected(data.operator) && (
          <div className="rf-expected-wrapper">
            <JsonInput
              label="Expected Value"
              value={data.expected}
              onChange={(value) => data.onChange({ expected: value || "" })}
            />
          </div>
        )}
      </div>`;
code = code.replace(oldPredicateBody, newPredicateBody);
fs.writeFileSync(file, code);
console.log("Patched successfully");