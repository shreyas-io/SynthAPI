import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../../shared/api/query_keys";
import { listProjects } from "../api/projects_api";

export function ProjectsPage() {
  const projects = useQuery({
    queryKey: queryKeys.projects,
    queryFn: listProjects,
  });

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Projects</p>
          <h1>Mock API workspaces</h1>
        </div>
        <Link className="button" to="/projects/new">
          New project
        </Link>
      </header>

      {projects.isPending && <p>Loading projects...</p>}
      {projects.isError && <p className="error">{projects.error.message}</p>}
      {projects.data && (
        <section className="grid">
          {projects.data.records.map((project) => (
            <Link className="card link-card" to={`/projects/${project.id}`} key={project.id}>
              <h2>{project.name}</h2>
              <p>{project.description}</p>
              <code>{project.slug}</code>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
