import { Navigate, Outlet } from "react-router";

import { useCurrentUser } from "../hooks/use_current_user";

export function ProtectedRoute() {
  const user = useCurrentUser();

  if (user.isPending) {
    return <main className="page">Checking session...</main>;
  }

  if (user.isError) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
}
