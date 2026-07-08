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
          theme="synthapi-dark"
          value={value}
          onChange={(val) => onChange(val || "")}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme("synthapi-dark", {
              base: "vs-dark",
              inherit: true,
              rules: [
                { token: "string.key.json", foreground: "69d2e7" },
                { token: "string.value.json", foreground: "ffc857" },
                { token: "number.json", foreground: "ae81ff" },
                { token: "keyword.json", foreground: "ff7b72" },
              ],
              colors: {
                "editor.background": "#060706",
                "editor.foreground": "#f4f7f1",
                "editor.lineHighlightBackground": "#0e100f",
                "editor.selectionBackground": "#1e2a23",
                "editorCursor.foreground": "#69d2e7",
                "editorIndentGuide.background1": "#1e2a23",
                "editorIndentGuide.activeBackground1": "#76847a",
              },
            });
          }}
          options={{
            minimap: { enabled: false },
            glyphMargin: false,
            folding: false,
            lineNumbers: "off",
            lineDecorationsWidth: 8,
            lineNumbersMinChars: 0,
            padding: { top: 8, bottom: 8 },
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
