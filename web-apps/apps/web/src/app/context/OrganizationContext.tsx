import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useProfile } from "../../features/profile/hooks/profile_hooks";

type OrganizationContextValue = {
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (id: string) => void;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (
      profile.data?.user.default_organization_id &&
      selectedOrganizationId === null
    ) {
      setSelectedOrganizationId(profile.data.user.default_organization_id);
    }
  }, [profile.data?.user.default_organization_id, selectedOrganizationId]);

  return (
    <OrganizationContext.Provider
      value={{ selectedOrganizationId, setSelectedOrganizationId }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useSelectedOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error(
      "useSelectedOrganization must be used within OrganizationProvider",
    );
  }
  return ctx;
}
