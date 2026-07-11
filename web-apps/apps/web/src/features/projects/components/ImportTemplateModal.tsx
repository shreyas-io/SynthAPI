import { useState } from "react";
import { useNavigate } from "react-router";
import { CreditCard, Loader2, X } from "lucide-react";
import { useTemplates, useCreateProjectFromTemplate } from "../hooks/project_hooks";

export function ImportTemplateModal({
  organizationId,
  onClose,
}: {
  organizationId: string | undefined;
  onClose: () => void;
}) {
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const templatesQuery = useTemplates();
  const createFromTemplateMutation = useCreateProjectFromTemplate(organizationId);

  return (
    <div className="variable-reference-modal-backdrop">
      <section className="variable-reference-modal card" style={{ maxWidth: 600, width: "100%" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Import from Template</h2>
          <button 
            type="button" 
            className="icon-btn" 
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.875rem", padding: "0.25rem 0.5rem" }}
          >
            <X size={16} /> Close
          </button>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
          <p className="muted-text">
            Kickstart your workspace with a pre-configured mock API based on popular platforms.
          </p>

          {templatesQuery.isLoading ? (
            <p className="muted-text">Loading templates...</p>
          ) : templatesQuery.isError ? (
            <p className="error">Failed to load templates.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {templatesQuery.data?.map(template => {
                const isCreating = creatingTemplateId === template.id;
                return (
                  <button
                    key={template.id}
                    className="card link-card"
                    disabled={isCreating}
                    onClick={async () => {
                      setCreatingTemplateId(template.id);
                      try {
                        const newProject = await createFromTemplateMutation.mutateAsync(template.id);
                        navigate(`/projects/${newProject.id}`);
                        onClose();
                      } catch (e) {
                        alert("Failed to create project from template.");
                      } finally {
                        setCreatingTemplateId(null);
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      textAlign: "left",
                      background: "var(--color-surface)",
                      cursor: isCreating ? "not-allowed" : "pointer"
                    }}
                  >
                    <div style={{ flexShrink: 0 }}>
                      {template.icon === "credit-card" && <CreditCard size={32} style={{ color: "#635BFF" }} />}
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
                      <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {template.name}
                        {isCreating && (
                          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--color-primary)", fontSize: "0.75rem", fontWeight: "normal" }}>
                            <Loader2 size={12} className="spin" /> Creating...
                          </span>
                        )}
                      </h3>
                      <p className="muted-text" style={{ fontSize: "0.875rem", margin: 0 }}>
                        {template.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
