import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../../shared/api/query_keys";
import { listMockApis } from "../../mock-apis/api/mock_apis_api";
import { getProject } from "../api/projects_api";

export function ProjectDetailPage() {
  const { projectId } = useParams();

  if (!projectId) {
    return <main className="page">Missing project ID.</main>;
  }

  const project = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => getProject(projectId),
  });
  const mockApis = useQuery({
    queryKey: queryKeys.mockApis(projectId),
    queryFn: () => listMockApis(projectId),
  });

  return (
    <main className="page">
      {project.data && (
        <header className="page-header">
          <div>
            <p className="eyebrow">{project.data.slug}</p>
            <h1>{project.data.name}</h1>
            <p>{project.data.description}</p>
          </div>
          <Link className="button" to={`/projects/${projectId}/mock-apis/new`}>
            New mock API
          </Link>
        </header>
      )}

      {project.isError && <p className="error">{project.error.message}</p>}
      {mockApis.isPending && <p>Loading mock APIs...</p>}
      {mockApis.isError && <p className="error">{mockApis.error.message}</p>}
      {mockApis.data && (
        <section className="grid">
          {mockApis.data.records.map((mockApi) => (
            <Link className="card link-card" to={`/mock-apis/${mockApi.id}`} key={mockApi.id}>
              <span className="pill">{mockApi.method}</span>
              <h2>{mockApi.name}</h2>
              <code>{mockApi.path}</code>
              <p>{mockApi.description}</p>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
