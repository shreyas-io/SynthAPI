import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { useSelectedOrganization } from "../../../app/context/OrganizationContext";
import { Button } from "../../../components/atoms/Button";
import { useCreateProject } from "../hooks/project_hooks";

export function NewProjectPage() {
  const navigate = useNavigate();
  const { selectedOrganizationId } = useSelectedOrganization();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const mutation = useCreateProject(selectedOrganizationId ?? "");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedOrganizationId) return;
    mutation.mutate(
      {
        name,
        description,
        organization_id: selectedOrganizationId,
        globals: [],
        constants: [],
      },
      {
        onSuccess(project) {
          navigate(`/projects/${project.id}`);
        },
      },
    );
  };

  return (
    <main className="page narrow">
      <form className="card form" onSubmit={submit}>
        <p className="eyebrow">New project</p>
        <h1>Create project</h1>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {mutation.isError && <p className="error">{mutation.error.message}</p>}
        <Button type="submit" disabled={mutation.isPending || !selectedOrganizationId}>
          Create project
        </Button>
      </form>
    </main>
  );
}
