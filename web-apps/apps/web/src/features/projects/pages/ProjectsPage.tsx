import { Link } from "react-router";

import { useSelectedOrganization } from "../../../app/context/OrganizationContext";
import { useProjects } from "../hooks/project_hooks";

export function ProjectsPage() {
  const { selectedOrganizationId } = useSelectedOrganization();
  const projects = useProjects(selectedOrganizationId ?? "");

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
