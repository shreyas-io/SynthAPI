import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { BrowserRouter } from "react-router";

import { createQueryClient } from "../lib/query/client";
import { OrganizationProvider } from "./context/OrganizationContext";

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <OrganizationProvider>
        <BrowserRouter basename={routerBasename}>{children}</BrowserRouter>
      </OrganizationProvider>
    </QueryClientProvider>
  );
}
