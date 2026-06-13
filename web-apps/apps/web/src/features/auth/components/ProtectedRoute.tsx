import { Navigate, Outlet, useLocation } from "react-router";

import { useCurrentUser } from "../hooks/use_current_user";

export function ProtectedRoute() {
  const user = useCurrentUser();
  const location = useLocation();

  if (user.isPending) {
    return <main className="page">Checking session...</main>;
  }

  if (user.isError) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;

    return (
      <Navigate
        to={`/signin?return_to=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  return <Outlet />;
}
