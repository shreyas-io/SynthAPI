import { Link, Outlet, useNavigate } from "react-router";

import { useSignout } from "../../features/auth/hooks/auth_hooks";

export function AppLayout() {
  const navigate = useNavigate();
  const signoutMutation = useSignout();

  return (
    <div className="app-shell">
      <header className="app-top-bar">
        <Link className="brand" to="/projects">synthapi</Link>
        <nav className="app-nav-links">
          <Link to="/projects">Projects</Link>
        </nav>
        <button
          className="button secondary-btn compact-action"
          onClick={() =>
            signoutMutation.mutate(undefined, {
              onSuccess() {
                navigate("/signin");
              },
            })
          }
        >
          Sign out
        </button>
      </header>
      <div className="app-main">
        <div className="app-content-wrapper">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
