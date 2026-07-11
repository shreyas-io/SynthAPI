import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../../components/atoms/Button";
import { X } from "lucide-react";
import { useImportOpenApi, useCreateProject } from "../hooks/project_hooks";

export function ImportOpenApiModal({
  projectId,
  organizationId,
  onClose,
}: {
  projectId?: string;
  organizationId?: string | undefined;
  onClose: () => void;
}) {
  const [spec, setSpec] = useState("");
  const [projectName, setProjectName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const importOpenApi = useImportOpenApi();
  const createProject = useCreateProject(organizationId ?? "");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setSpec(content);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spec.trim()) {
      alert("Please paste an OpenAPI spec or upload a file.");
      return;
    }

    if (!projectId && !projectName.trim()) {
      alert("Please enter a project name.");
      return;
    }

    let targetProjectId = projectId;

    if (!targetProjectId && organizationId) {
      try {
        const project = await createProject.mutateAsync({
          name: projectName.trim(),
          description: "Imported from OpenAPI Spec",
          organization_id: organizationId,
        });
        targetProjectId = project.id;
      } catch (err: any) {
        alert(`Failed to create project: ${err.message || "Unknown error"}`);
        return;
      }
    }

    if (!targetProjectId) return;

    importOpenApi.mutate({ projectId: targetProjectId, spec }, {
      onSuccess: (data: any) => {
        alert(`Successfully imported ${data.count} Mock APIs!`);
        onClose();
        if (!projectId) {
          // If we created a new project, navigate to it
          navigate(`/projects/${targetProjectId}`);
        }
      },
      onError: (error: any) => {
        alert(`Failed to import: ${error.message || "Unknown error"}`);
      },
    });
  };

  return (
    <div className="variable-reference-modal-backdrop">
      <section className="variable-reference-modal card" style={{ maxWidth: 600, width: "100%" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Import OpenAPI Spec</h2>
          <button 
            type="button" 
            className="icon-btn" 
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.875rem", padding: "0.25rem 0.5rem" }}
          >
            <X size={16} /> Close
          </button>
        </header>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
          <p className="muted-text">
            Generate mock APIs instantly by pasting your OpenAPI / Swagger spec below, or upload a <code>.json</code> or <code>.yaml</code> file.
          </p>
          
          {!projectId && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label htmlFor="project-name" style={{ fontWeight: 600 }}>Project Name</label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Mock API Project"
                style={{ padding: "0.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "var(--color-bg)" }}
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="file-upload" style={{ fontWeight: 600 }}>Upload File</label>
            <input
              id="file-upload"
              type="file"
              accept=".json,.yaml,.yml"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>

          <div style={{ textAlign: "center", color: "var(--color-text-secondary)", margin: "0.5rem 0" }}>
            - OR -
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="spec-textarea" style={{ fontWeight: 600 }}>Paste Spec</label>
            <textarea
              id="spec-textarea"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="openapi: 3.0.0..."
              style={{ minHeight: "200px", fontFamily: "monospace" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!spec.trim() || importOpenApi.isPending || createProject.isPending}
            >
              {importOpenApi.isPending || createProject.isPending ? "Importing..." : "Import APIs"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
