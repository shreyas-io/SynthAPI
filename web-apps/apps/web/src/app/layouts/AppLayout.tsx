import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router";
import { ChevronDown, LogOut, Sparkles, User, Hexagon } from "lucide-react";

import {
  useCurrentUser,
  useSignout,
} from "../../features/auth/hooks/auth_hooks";
import {
  useOrganizationCredits,
  useProfile,
} from "../../features/profile/hooks/profile_hooks";
import { Avatar } from "../../components/atoms/Avatar";
import { useSelectedOrganization } from "../context/OrganizationContext";

export function AppLayout() {
  const navigate = useNavigate();
  const signoutMutation = useSignout();
  const user = useCurrentUser();
  const profile = useProfile();
  const { selectedOrganizationId, setSelectedOrganizationId } =
    useSelectedOrganization();
  const credits = useOrganizationCredits(selectedOrganizationId ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const orgMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (
        orgMenuRef.current &&
        !orgMenuRef.current.contains(event.target as Node)
      ) {
        setOrgMenuOpen(false);
      }
    }
    if (menuOpen || orgMenuOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen, orgMenuOpen]);

  const displayName = user.data?.display_name ?? user.data?.email ?? "Profile";

  const activeOrgs = (profile.data?.organizations ?? []).filter(
    (org) => org.deleted_at == null,
  );
  const selectedOrg = activeOrgs.find(
    (org) => org.id === selectedOrganizationId,
  );

  return (
    <div className="app-shell">
      <header className="app-top-bar">
        <Link className="brand" to="/projects">
          <Hexagon className="brand-logo-icon" size={18} strokeWidth={3.5} />
          <i>SynthAPI</i>
        </Link>
        <nav className="app-nav-links">
          <Link to="/projects">Projects</Link>
        </nav>
        <div className="top-bar-actions">
          {selectedOrganizationId && credits.data && (
            <div className="org-credits-badge" title="AI credits remaining">
              <Sparkles size={14} />
              <span>{credits.data.remaining}</span>
            </div>
          )}
          <div ref={orgMenuRef} className="api-selector">
            <button
              className="api-selector-toggle"
              onClick={() => setOrgMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={orgMenuOpen}
            >
              <span className="api-selector-name">
                {selectedOrg?.name ?? "Select org"}
              </span>
              <ChevronDown size={14} />
            </button>
            {orgMenuOpen && (
              <div className="api-selector-list" role="menu">
                {activeOrgs.map((org) => (
                  <button
                    key={org.id}
                    className={`api-selector-item ${
                      org.id === selectedOrganizationId ? "active" : ""
                    }`}
                    onClick={() => {
                      setSelectedOrganizationId(org.id);
                      setOrgMenuOpen(false);
                    }}
                    role="menuitem"
                  >
                    <span>{org.name}</span>
                    {org.id === selectedOrganizationId && (
                      <span className="pill">active</span>
                    )}
                  </button>
                ))}
                {activeOrgs.length === 0 && (
                  <span className="api-selector-item">No organisations</span>
                )}
              </div>
            )}
          </div>
          <div ref={menuRef} className="profile-dropdown">
            <button
              className="profile-dropdown-toggle"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Avatar
                src={user.data?.avatar_url}
                label={displayName}
                className="profile-dropdown-avatar"
                fallbackClassName="profile-dropdown-avatar-placeholder"
              />
              <span className="profile-dropdown-name">{displayName}</span>
              <ChevronDown size={14} />
            </button>
            {menuOpen && (
              <div className="profile-dropdown-menu" role="menu">
                <Link
                  className="profile-dropdown-item"
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  role="menuitem"
                >
                  <User size={14} />
                  View profile
                </Link>
                <button
                  className="profile-dropdown-item"
                  onClick={() =>
                    signoutMutation.mutate(undefined, {
                      onSuccess() {
                        setMenuOpen(false);
                        navigate("/signin");
                      },
                    })
                  }
                  role="menuitem"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="app-main">
        <div className="app-content-wrapper">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
