import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { BrowserRouter } from "react-router";

import { createQueryClient } from "../lib/query/client";
import { OrganizationProvider } from "./context/OrganizationContext";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <OrganizationProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </OrganizationProvider>
    </QueryClientProvider>
  );
}
