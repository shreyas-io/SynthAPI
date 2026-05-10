import { Link, Outlet, useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../shared/api/query_keys";
import { signout } from "../../features/auth/api/auth_api";

export function AppLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const signoutMutation = useMutation({
    mutationFn: signout,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: queryKeys.authUser });
      navigate("/signin");
    },
  });

  return (
    <div className="app-shell">
      <div className="app-main">
        <header className="top-header">
          <Link className="button" to="/projects">
            Projects
          </Link>
          <button onClick={() => signoutMutation.mutate()}>Sign out</button>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
