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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {label && <label>{label}</label>}
        <button
          type="button"
          className="pill"
          onClick={handleFormat}
          style={{ cursor: "pointer", border: 0, marginLeft: "auto" }}
          title="Format JSON"
        >
          Beautify
        </button>
      </div>
      <div
        style={{
          border: "1px solid #735F32",
          borderRadius: "6px",
          overflow: "hidden",
          height: "200px",
        }}
      >
        <Editor
          height="100%"
          defaultLanguage="json"
          theme="vs-dark"
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