import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router";
import { ChevronDown, LogOut, User } from "lucide-react";

import { useCurrentUser, useSignout } from "../../features/auth/hooks/auth_hooks";

export function AppLayout() {
  const navigate = useNavigate();
  const signoutMutation = useSignout();
  const user = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const displayName = user.data?.display_name ?? user.data?.email ?? "Profile";

  return (
    <div className="app-shell">
      <header className="app-top-bar">
        <Link className="brand" to="/projects">synthapi</Link>
        <nav className="app-nav-links">
          <Link to="/projects">Projects</Link>
        </nav>
        <div ref={menuRef} className="profile-dropdown">
          <button
            className="profile-dropdown-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {user.data?.avatar_url ? (
              <img
                src={user.data.avatar_url}
                alt=""
                className="profile-dropdown-avatar"
              />
            ) : (
              <User size={16} />
            )}
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
      </header>
      <div className="app-main">
        <div className="app-content-wrapper">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
