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
          <div className="header-left">
            <Link className="brand" to="/projects">
              synthapi
            </Link>
          </div>
          <button className="button secondary-btn" onClick={() => signoutMutation.mutate()}>Sign out</button>
        </header>
        <div className="app-content-wrapper">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
