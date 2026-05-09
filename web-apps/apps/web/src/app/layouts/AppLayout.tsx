import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../shared/api/query_keys";
import { signout } from "../../features/auth/api/auth_api";
import { useCurrentUser } from "../../features/auth/hooks/use_current_user";
import { listProjects } from "../../features/projects/api/projects_api";

export function AppLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const projects = useQuery({
    queryKey: queryKeys.projects,
    queryFn: listProjects,
  });
  const signoutMutation = useMutation({
    mutationFn: signout,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: queryKeys.authUser });
      navigate("/signin");
    },
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/projects">
          Mock Stack
        </Link>
        <nav>
          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => setProjectsOpen((current) => !current)}
          >
            <span>Projects</span>
            <span>{projectsOpen ? "Collapse" : "Expand"}</span>
          </button>
          {projectsOpen && (
            <div className="sidebar-projects">
              <Link to="/projects">All projects</Link>
              {projects.data?.records.map((project) => (
                <Link key={project.id} to={`/projects/${project.id}`}>
                  {project.name}
                </Link>
              ))}
            </div>
          )}
        </nav>
        <div className="sidebar-footer">
          <span>{user.data?.username}</span>
          <button onClick={() => signoutMutation.mutate()}>Sign out</button>
        </div>
      </aside>
      <Outlet />
    </div>
  );
}
