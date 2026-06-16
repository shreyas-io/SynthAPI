import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { BrowserRouter } from "react-router";

import { createQueryClient } from "../lib/query/client";
import { OrganizationProvider } from "./context/OrganizationContext";

const getRouterBasename = () => {
  const configuredBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  if (configuredBase && configuredBase !== "/") {
    return configuredBase;
  }

  return window.location.pathname.startsWith("/platform") ? "/platform" : "";
};

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <OrganizationProvider>
        <BrowserRouter basename={getRouterBasename()}>{children}</BrowserRouter>
      </OrganizationProvider>
    </QueryClientProvider>
  );
}
