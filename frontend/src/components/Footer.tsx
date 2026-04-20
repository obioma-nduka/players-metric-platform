import { Link } from "react-router-dom";
import { useAuthStore } from "@/context/AuthContext";

export default function Footer() {
  const year = new Date().getFullYear();
  const { token, user } = useAuthStore();

  const links = token
    ? [
        { label: "Dashboard", to: "/dashboard" },
        { label: "Players", to: "/players-directory" },
        { label: "Reports", to: "/reports" },
      ]
    : [
        { label: "Home", to: "/" },
        { label: "Sign in", to: "/login" },
        { label: "Register", to: "/register" },
      ];

  return (
    <>
      <style>{`
        .platform-footer {
          position: relative;
          margin-top: auto;
          background: var(--platform-footer-bg);
          color: var(--platform-footer-text);
          border-top: 1px solid var(--platform-footer-border, rgba(148, 163, 184, 0.14));
          transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease;
        }

        .platform-footer-inner {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-top: 1.5rem;
          padding-bottom: 1.5rem;
        }

        .platform-footer-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .platform-footer-brand {
          max-width: 32rem;
        }

        .platform-footer-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.8rem;
          border-radius: 999px;
          background: var(--platform-footer-badge-bg, rgba(15, 23, 42, 0.35));
          border: 1px solid var(--platform-footer-badge-border, rgba(96, 165, 250, 0.2));
          color: var(--platform-footer-badge-text, #93c5fd);
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 0.75rem;
          transition: background 0.25s ease, border-color 0.25s ease, color 0.25s ease;
        }

        .platform-footer-dot {
          width: 0.35rem;
          height: 0.35rem;
          border-radius: 999px;
          background: var(--platform-primary);
          display: inline-block;
        }

        .platform-footer-brand h3 {
          margin: 0 0 0.4rem;
          font-size: 1rem;
          color: var(--platform-footer-heading, #f8fafc);
          transition: color 0.25s ease;
        }

        .platform-footer-brand p {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.7;
          color: var(--platform-footer-text-muted, rgba(226, 232, 240, 0.7));
          transition: color 0.25s ease;
        }

        .platform-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          align-items: center;
          justify-content: flex-end;
        }

        .platform-footer-links a {
          color: var(--platform-footer-link, rgba(226, 232, 240, 0.78));
          text-decoration: none;
          padding: 0.45rem 0.8rem;
          border-radius: 999px;
          background: var(--platform-footer-link-bg, rgba(255, 255, 255, 0.04));
          border: 1px solid var(--platform-footer-link-border, rgba(148, 163, 184, 0.12));
          font-size: 0.88rem;
          transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }

        .platform-footer-links a:hover {
          color: var(--platform-footer-link-hover, white);
          text-decoration: none;
          background: var(--platform-footer-link-bg-hover, rgba(255, 255, 255, 0.08));
        }

        .platform-footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
          padding-top: 1rem;
          border-top: 1px solid var(--platform-footer-divider, rgba(148, 163, 184, 0.12));
          transition: border-color 0.25s ease;
        }

        .platform-footer-copy {
          margin: 0;
          font-size: 0.84rem;
          color: var(--platform-footer-copy, rgba(226, 232, 240, 0.62));
          transition: color 0.25s ease;
        }

        .platform-footer-meta {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          font-size: 0.84rem;
          color: var(--platform-footer-meta, rgba(191, 219, 254, 0.74));
          transition: color 0.25s ease;
        }

        @media (max-width: 768px) {
          .platform-footer-top {
            flex-direction: column;
          }

          .platform-footer-links {
            justify-content: flex-start;
          }

          .platform-footer-bottom {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <footer className="platform-footer">
        <div className="platform-container platform-footer-inner">
          <div className="platform-footer-top">
            <div className="platform-footer-brand">
              <span className="platform-footer-badge">
                <span className="platform-footer-dot" />
                Player Metrics Platform
              </span>
              <h3>Player readiness, team data, and reporting in one place.</h3>
              <p>
                Built for coaches, analysts, medical staff, fitness teams, and
                players.
              </p>
            </div>

            <div className="platform-footer-links">
              {links.map((item) => (
                <Link key={item.to} to={item.to}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="platform-footer-bottom">
            <p className="platform-footer-copy">
              © {year} Player Metrics Platform. All rights reserved.
            </p>

            <div className="platform-footer-meta">
              {token && user?.role ? (
                <span>{user.role.replace(/_/g, " ")}</span>
              ) : (
                <span>Performance operations</span>
              )}
              <span className="platform-footer-dot" />
              <span>Football staff workflow</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
