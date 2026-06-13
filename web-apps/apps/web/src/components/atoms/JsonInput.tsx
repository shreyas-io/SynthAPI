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
                { token: "string.key.json", foreground: "66d9ef" },
                { token: "string.value.json", foreground: "fd971f" },
                { token: "number.json", foreground: "ae81ff" },
                { token: "keyword.json", foreground: "f92672" },
              ],
              colors: {
                "editor.background": "#080808",
                "editor.foreground": "#f8f8f2",
                "editor.lineHighlightBackground": "#111111",
                "editor.selectionBackground": "#3e3d32",
                "editorCursor.foreground": "#66d9ef",
                "editorIndentGuide.background1": "#1a1a1a",
                "editorIndentGuide.activeBackground1": "#75715e",
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
