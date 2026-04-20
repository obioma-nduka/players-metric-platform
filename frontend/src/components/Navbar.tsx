import { Link, NavLink, useNavigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useAuthStore } from "@/context/AuthContext";
import { useThemeStore } from "@/context/ThemeContext";
import {
  canManageMetricTypes,
  canManageSettings,
  canManageUsers,
  canViewDirectoryPlayers,
  isPlayerRole,
} from "@/utils/permissions";

type NavItem = {
  label: string;
  to: string;
};

function getNavLinkClassName(isActive: boolean) {
  return `platform-nav-link${isActive ? " platform-nav-link-active" : ""}`;
}

export default function Navbar() {
  const { token, user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const authenticatedLinks: NavItem[] = [
    { label: "Dashboard", to: "/dashboard" },
  ];

  if (canViewDirectoryPlayers(user?.role)) {
    authenticatedLinks.push({ label: "Players", to: "/players-directory" });
  }

  if (isPlayerRole(user?.role)) {
    authenticatedLinks.push(
      { label: "My profile", to: "/my-profile" },
      { label: "My metrics", to: "/my-metrics" },
    );
  }

  if (token) {
    authenticatedLinks.push({ label: "Reports", to: "/reports" });
  }

  if (canManageMetricTypes(user?.role)) {
    authenticatedLinks.push({ label: "Metrics", to: "/metric-types" });
  }

  if (canManageSettings(user?.role)) {
    authenticatedLinks.push({ label: "Settings", to: "/settings" });
  }

  if (canManageUsers(user?.role)) {
    authenticatedLinks.push({ label: "Users", to: "/users" });
  }

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <>
      <style>{`
        .platform-theme-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 2.5rem;
          padding: 0.65rem 0.9rem;
          border-radius: var(--platform-radius-pill);
          border: 1px solid var(--platform-nav-user-border, rgba(148, 163, 184, 0.16));
          background: var(--platform-nav-user-bg, rgba(255, 255, 255, 0.06));
          color: var(--platform-nav-text);
          cursor: pointer;
          transition:
            background-color 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease,
            color 0.2s ease;
        }

        .platform-theme-toggle:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(96, 165, 250, 0.24);
          transform: translateY(-1px);
        }

        .platform-theme-toggle:focus-visible {
          outline: 2px solid var(--platform-primary);
          outline-offset: 2px;
        }

        .platform-theme-toggle-label {
          font-size: 0.85rem;
          font-weight: 700;
        }
      `}</style>

      <header className="platform-nav">
        <div className="platform-container platform-nav-inner">
          <div className="platform-nav-brand">
            <Link to={token ? "/dashboard" : "/"} className="platform-logo">
              <span className="platform-logo-mark">PM</span>
              <span className="platform-logo-text">
                <span className="platform-logo-title">Player Metrics</span>
                <span className="platform-logo-subtitle">
                  Performance platform
                </span>
              </span>
            </Link>
          </div>

          <nav className="platform-nav-links" aria-label="Primary navigation">
            {token ? (
              <>
                <div className="platform-nav-menu">
                  {authenticatedLinks.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        getNavLinkClassName(isActive)
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>

                <div className="platform-nav-actions">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="platform-theme-toggle"
                    aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                  >
                    {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                    <span className="platform-theme-toggle-label">
                      {theme === "dark" ? "Light mode" : "Dark mode"}
                    </span>
                  </button>

                  <span className="platform-nav-user">
                    {user?.email ?? "Signed in"}
                  </span>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="platform-btn platform-btn-danger"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="platform-nav-actions">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="platform-theme-toggle"
                  aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                  <span className="platform-theme-toggle-label">
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </span>
                </button>

                <NavLink
                  to="/"
                  end
                  className={({ isActive }) => getNavLinkClassName(isActive)}
                >
                  Home
                </NavLink>

                <NavLink
                  to="/login"
                  className={({ isActive }) => getNavLinkClassName(isActive)}
                >
                  Sign in
                </NavLink>

                <Link
                  to="/register"
                  className="platform-btn platform-btn-primary"
                >
                  Get started
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
