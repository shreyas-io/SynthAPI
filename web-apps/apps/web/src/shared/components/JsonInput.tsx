type JsonInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
};

export function JsonInput({ label, value, onChange, error }: JsonInputProps) {
  return (
    <label className="json-input-field">
      {label}
      <textarea
        className="json-input"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <span className="json-input-error">{error}</span>}
    </label>
  );
}
