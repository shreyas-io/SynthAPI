import Editor from "@monaco-editor/react";

type JsonInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null | undefined;
};

export function JsonInput({ label, value, onChange, error }: JsonInputProps) {
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
    } catch {
      // Ignored if invalid JSON
    }
  };

  return (
    <div className="json-input-field">
      <div className="json-input-header">
        {label && <label>{label}</label>}
        <button
          type="button"
          className="pill"
          onClick={handleFormat}
          title="Format JSON"
        >
          Beautify
        </button>
      </div>
      <div className="json-input-editor">
        <Editor
          height="100%"
          defaultLanguage="json"
          theme="light"
          value={value}
          onChange={(val) => onChange(val || "")}
          options={{
            minimap: { enabled: false },
            lineNumbers: "off",
            scrollBeyondLastLine: false,
            tabSize: 2,
            formatOnPaste: true,
            fontSize: 12,
          }}
        />
      </div>
      {error && <span className="json-input-error">{error}</span>}
    </div>
  );
}
