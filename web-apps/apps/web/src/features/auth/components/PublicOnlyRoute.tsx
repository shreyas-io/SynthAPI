import { Navigate, Outlet } from "react-router";

import { useCurrentUser } from "../hooks/use_current_user";

export function PublicOnlyRoute() {
  const user = useCurrentUser();

  if (user.isPending) {
    return <main className="page">Checking session...</main>;
  }

  if (user.isSuccess) {
    return <Navigate to="/projects" replace />;
  }

  return <Outlet />;
}
