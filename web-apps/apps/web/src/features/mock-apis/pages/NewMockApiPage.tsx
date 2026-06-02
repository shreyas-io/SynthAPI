import { FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { useCreateMockApi } from "../hooks/mock_api_hooks";
import type { HttpMethod } from "../types";

const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function NewMockApiPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [method, setMethod] = useState<HttpMethod>("POST");
  const [path, setPath] = useState("/posts");
  const [description, setDescription] = useState("");
  const mutation = useCreateMockApi(projectId);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!projectId) return;

    mutation.mutate(
      {
        project_id: projectId,
        name,
        method,
        path,
        description,
        variables: [],
      },
      {
        onSuccess(mockApi) {
          navigate(`/projects/${projectId}/mock-apis/${mockApi.id}`);
        },
      },
    );
  };

  return (
    <main className="page-content dense-page-content narrow">
      <form className="card form" onSubmit={submit}>
        <p className="eyebrow">New mock API</p>
        <h1>Create endpoint</h1>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Method
          <select value={method} onChange={(e) => setMethod(e.target.value as HttpMethod)}>
            {methods.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Path
          <input value={path} onChange={(e) => setPath(e.target.value)} />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {mutation.isError && <p className="error">{mutation.error.message}</p>}
        <button disabled={mutation.isPending || !projectId}>Create mock API</button>
      </form>
    </main>
  );
}
