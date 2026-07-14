import { useState, useRef, useEffect } from "react";
import { Button } from "../atoms/Button";

type ContactFormStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success" }
  | { state: "error"; message: string };

export function ContactModal({
  isOpen,
  onClose,
  source,
}: {
  isOpen: boolean;
  onClose: () => void;
  source: string;
}) {
  const [status, setStatus] = useState<ContactFormStatus>({ state: "idle" });
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      setStatus({ state: "idle" });
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (status.state === "submitting") return;

    setStatus({ state: "submitting" });
    try {
      const data = new FormData(form);
      const payload = {
        name: String(data.get("name") ?? "").trim(),
        email: String(data.get("email") ?? "").trim(),
        company: String(data.get("company") ?? "").trim() || undefined,
        message: String(data.get("message") ?? "").trim(),
        source,
      };

      const response = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      setStatus({ state: "success" });
      form.reset();
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please try again.";
      setStatus({ state: "error", message });
    }
  };

  const disabled = status.state === "submitting";

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      style={{
        padding: "2rem",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        color: "var(--color-text)",
        maxWidth: "400px",
        width: "100%",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Contact Us</h2>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "1.5rem" }}
        >
          &times;
        </button>
      </div>

      {status.state === "success" ? (
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <p style={{ color: "var(--color-success)", fontSize: "2rem", margin: "0 0 1rem" }}>✓</p>
          <p style={{ margin: 0 }}>Message sent! We'll get back to you shortly.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {status.state === "error" && (
            <p style={{ color: "var(--color-danger)", fontSize: "0.875rem", margin: 0 }}>{status.message}</p>
          )}
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem" }}>
            Name
            <input name="name" required style={{ padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem" }}>
            Email
            <input name="email" type="email" required style={{ padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem" }}>
            Company (optional)
            <input name="company" style={{ padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem" }}>
            Message
            <textarea name="message" required rows={4} style={{ padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)", resize: "vertical" }} />
          </label>
          <Button type="submit" disabled={disabled} style={{ marginTop: "0.5rem" }}>
            {disabled ? "Sending..." : "Send Message"}
          </Button>
        </form>
      )}
    </dialog>
  );
}
