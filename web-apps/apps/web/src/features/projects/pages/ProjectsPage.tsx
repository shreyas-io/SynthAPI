import { useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, RotateCcw, Search } from "lucide-react";

import { useSelectedOrganization } from "../../../app/context/OrganizationContext";
import { FloatingAgentChat } from "../../agent-chat/components/FloatingAgentChat";
import { Avatar } from "../../../components/atoms/Avatar";
import { Button, ButtonLink } from "../../../components/atoms/Button";
import { ResourceCard } from "../../../components/molecules/ResourceCard";
import {
  useDeleteProject,
  useDeletedProjects,
  useProjects,
  useRestoreProject,
} from "../hooks/project_hooks";

type ProjectTab = "active" | "deleted";
const PAGE_SIZE = 12;

const formatCreatedAt = (value: string | undefined) => {
  if (!value) return "Created date unavailable";

  return `Created ${new Date(value).toLocaleDateString()}`;
};

const getCreatorLabel = (project: { created_by?: { display_name: string | null } }) => {
  return project.created_by?.display_name ?? "Unknown creator";
};

const getDeletedByLabel = (project: { deleted_by?: { display_name: string | null } | null }) => {
  return project.deleted_by?.display_name ?? "Unknown";
};

export function ProjectsPage() {
  const { selectedOrganizationId } = useSelectedOrganization();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const projectListParams = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
  };
  const projects = useProjects(selectedOrganizationId ?? "", {
    ...projectListParams,
  });
  const deletedProjectsQuery = useDeletedProjects(selectedOrganizationId ?? "", {
    ...projectListParams,
  });
  const deleteProject = useDeleteProject(selectedOrganizationId ?? undefined);
  const restoreProject = useRestoreProject(selectedOrganizationId ?? undefined);
  const [projectTab, setProjectTab] = useState<ProjectTab>("active");

  const activeProjects = projects.data?.records ?? [];
  const deletedProjects = deletedProjectsQuery.data?.records ?? [];
  const activeTotalPages = Math.max(1, Math.ceil((projects.data?.total ?? 0) / PAGE_SIZE));
  const deletedTotalPages = Math.max(1, Math.ceil((deletedProjectsQuery.data?.total ?? 0) / PAGE_SIZE));

  const resetPagination = () => setPage(0);

  const currentData = projectTab === "active" ? projects : deletedProjectsQuery;
  const totalPages = projectTab === "active" ? activeTotalPages : deletedTotalPages;

  return (
    <div className="projects-page-layout">
      <FloatingAgentChat />
      <main className="page projects-page-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Projects</p>
            <h1>Mock API workspaces</h1>
          </div>
          <ButtonLink to="/projects/new">
            New project
          </ButtonLink>
        </header>

        {currentData.isPending && <p>Loading projects...</p>}
        {currentData.isError && <p className="error">{currentData.error.message}</p>}
        <>
          <form
            className="project-list-controls"
            onSubmit={(event) => {
              event.preventDefault();
              setSearchQuery(searchInput);
              resetPagination();
            }}
          >
            <label>
              Search
              <div className="search-input">
                <Search size={14} />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search projects..."
                />
                <Button
                  type="submit"
                  variant="secondary"
                  size="compact"
                  style={{ marginLeft: "0.25rem" }}
                >
                  Search
                </Button>
              </div>
            </label>
          </form>

          <div className="org-tabs">
            <button
              className={projectTab === "active" ? "active" : ""}
              onClick={() => setProjectTab("active")}
            >
              Active
            </button>
            <button
              className={projectTab === "deleted" ? "active" : ""}
              onClick={() => setProjectTab("deleted")}
            >
              Deleted
            </button>
          </div>

          {projectTab === "active" && (
            <section className="grid project-grid">
              {activeProjects.map((project) => (
                <ResourceCard
                  key={project.id}
                  to={`/projects/${project.id}`}
                  title={project.name}
                  onDelete={() => {
                    if (confirm(`Delete project "${project.name}"?`)) {
                      deleteProject.mutate(project.id);
                    }
                  }}
                  deleteDisabled={deleteProject.isPending}
                  deleteLabel={`Delete ${project.name}`}
                >
                  <p>{project.description}</p>
                  <div className="project-card-meta">
                    <Avatar
                      src={project.created_by?.avatar_url}
                      label={getCreatorLabel(project)}
                      className="project-card-avatar"
                      fallbackClassName="project-card-avatar-fallback"
                    />
                    <span>{getCreatorLabel(project)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatCreatedAt(project.created_at)}</span>
                  </div>
                </ResourceCard>
              ))}
              <Link
                className="card link-card empty-card"
                to="/projects/new"
              >
                <h2 style={{ color: "var(--color-text-muted)" }}>+ New project</h2>
              </Link>
            </section>
          )}

          {projectTab === "deleted" && (
            <>
              <div className="org-deleted-banner">
                <AlertTriangle size={16} />
                Deleted projects are hidden from routing and public mock traffic.
              </div>
              {deletedProjects.length === 0 ? (
                <p className="muted-text">No deleted projects.</p>
              ) : (
                <section className="grid project-grid deleted-grid">
                  {deletedProjects.map((project) => (
                    <div className="card link-card project-card org-deleted" key={project.id}>
                      <h2>{project.name}</h2>
                      <p>{project.description}</p>
                      <div className="project-card-meta">
                        <Avatar
                          src={project.created_by?.avatar_url}
                          label={getCreatorLabel(project)}
                          className="project-card-avatar"
                          fallbackClassName="project-card-avatar-fallback"
                        />
                        <span>{getCreatorLabel(project)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatCreatedAt(project.created_at)}</span>
                      </div>
                      <div className="deleted-by-row">
                        Deleted {new Date(project.deleted_at!).toLocaleString()}
                        {project.deleted_by && (
                          <>
                            {" "}by{" "}
                            <Avatar
                              src={project.deleted_by?.avatar_url}
                              label={getDeletedByLabel(project)}
                              className="project-card-avatar"
                              fallbackClassName="project-card-avatar-fallback"
                            />
                            {getDeletedByLabel(project)}
                          </>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="compact"
                        onClick={() => restoreProject.mutate(project.id)}
                        disabled={restoreProject.isPending}
                      >
                        <RotateCcw size={14} />
                        Restore
                      </Button>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}

          <div className="pagination-row">
            <Button
              variant="secondary"
              size="compact"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0 || currentData.isFetching}
            >
              Previous
            </Button>
            <span className="muted-text">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="compact"
              onClick={() =>
                setPage((current) => Math.min(totalPages - 1, current + 1))
              }
              disabled={page >= totalPages - 1 || currentData.isFetching}
            >
              Next
            </Button>
          </div>

          {deleteProject.isError && (
            <p className="error">Failed to delete project.</p>
          )}
          {restoreProject.isError && (
            <p className="error">Failed to restore project.</p>
          )}
        </>
      </main>
    </div>
  );
}
