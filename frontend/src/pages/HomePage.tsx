import {
  Activity,
  BarChart3,
  ClipboardList,
  HeartPulse,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuthStore } from "@/context/AuthContext";
import { useThemeStore } from "@/context/ThemeContext";

const features = [
  {
    icon: Activity,
    title: "Track player readiness",
    description:
      "Keep wellness, workload, and availability in one place so staff can quickly see who is ready to train or play.",
  },
  {
    icon: Users,
    title: "Manage teams and roles",
    description:
      "Organize players, coaches, analysts, and medical staff with access that fits each role.",
  },
  {
    icon: BarChart3,
    title: "Review useful reports",
    description:
      "Turn player data into simple reports that support training, recovery, and match preparation.",
  },
];

const workflow = [
  {
    icon: ShieldCheck,
    title: "Create your account",
    description:
      "Sign up as a player or staff member and access the tools that fit your role.",
  },
  {
    icon: ClipboardList,
    title: "Set up your team",
    description:
      "Add players, assign staff, and build a clear structure for managing performance data.",
  },
  {
    icon: HeartPulse,
    title: "Monitor and act",
    description:
      "Follow player metrics, review readiness, and make better day-to-day decisions.",
  },
];

const roles = [
  "Coaches",
  "Medical Staff",
  "Performance Analysts",
  "Fitness Staff",
  "Players",
  "Admins",
];

export default function HomePage() {
  const token = useAuthStore((state) => state.token);
  const theme = useThemeStore((state) => state.theme);

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <style>{`
        .platform-main:has(.pm-homepage) {
          max-width: 100%;
          padding: 0;
        }

        .pm-homepage {
          color: var(--pm-home-text);
        }

        .pm-homepage-dark {
          --pm-home-bg: #202741;
          --pm-home-text: #f8fafc;
          --pm-home-muted: rgba(226, 232, 240, 0.76);
          --pm-home-muted-strong: rgba(226, 232, 240, 0.82);
          --pm-home-hero-cut: #242b49;
          --pm-home-kicker-bg: rgba(15, 23, 42, 0.35);
          --pm-home-kicker-border: rgba(96, 165, 250, 0.25);
          --pm-home-kicker-text: #93c5fd;
          --pm-home-secondary-bg: rgba(255, 255, 255, 0.05);
          --pm-home-secondary-border: rgba(148, 163, 184, 0.22);
          --pm-home-secondary-hover: rgba(255, 255, 255, 0.1);
          --pm-home-panel-bg: rgba(255, 255, 255, 0.06);
          --pm-home-panel-border: rgba(148, 163, 184, 0.14);
          --pm-home-soft-card-bg: rgba(255, 255, 255, 0.05);
          --pm-home-soft-card-border: rgba(148, 163, 184, 0.14);
          --pm-home-dashboard-bg: rgba(15, 23, 42, 0.92);
          --pm-home-dashboard-text: #f8fafc;
          --pm-home-dashboard-muted: rgba(226, 232, 240, 0.76);
          --pm-home-player-bg: rgba(255, 255, 255, 0.92);
          --pm-home-player-text: #0f172a;
          --pm-home-player-muted: #475569;
          --pm-home-role-bg: rgba(255, 255, 255, 0.05);
          --pm-home-role-border: rgba(148, 163, 184, 0.16);
          --pm-home-role-text: #e2e8f0;
          --pm-home-link-text: rgba(226, 232, 240, 0.82);
          --pm-home-link-hover: #f8fafc;
          --pm-home-screen-shadow: inset 0 0 0 1px rgba(203, 213, 225, 0.9);
          --pm-home-cta-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
          --pm-home-showcase-bg: #dbeafe;
          --pm-home-chart-bg: #60a5fa;
          --pm-home-avatar-bg: #2563eb;
        }

        .pm-homepage-light {
          --pm-home-bg: #eef4ff;
          --pm-home-text: #0f172a;
          --pm-home-muted: rgba(51, 65, 85, 0.78);
          --pm-home-muted-strong: rgba(30, 41, 59, 0.84);
          --pm-home-hero-cut: #e5eefc;
          --pm-home-kicker-bg: rgba(255, 255, 255, 0.72);
          --pm-home-kicker-border: rgba(56, 189, 248, 0.24);
          --pm-home-kicker-text: #1d4ed8;
          --pm-home-secondary-bg: rgba(255, 255, 255, 0.72);
          --pm-home-secondary-border: rgba(148, 163, 184, 0.24);
          --pm-home-secondary-hover: rgba(255, 255, 255, 0.95);
          --pm-home-panel-bg: rgba(255, 255, 255, 0.72);
          --pm-home-panel-border: rgba(148, 163, 184, 0.16);
          --pm-home-soft-card-bg: rgba(255, 255, 255, 0.72);
          --pm-home-soft-card-border: rgba(148, 163, 184, 0.16);
          --pm-home-dashboard-bg: #1e293b;
          --pm-home-dashboard-text: #f8fafc;
          --pm-home-dashboard-muted: rgba(226, 232, 240, 0.76);
          --pm-home-player-bg: rgba(255, 255, 255, 0.96);
          --pm-home-player-text: #0f172a;
          --pm-home-player-muted: #475569;
          --pm-home-role-bg: rgba(255, 255, 255, 0.78);
          --pm-home-role-border: rgba(148, 163, 184, 0.18);
          --pm-home-role-text: #334155;
          --pm-home-link-text: rgba(30, 41, 59, 0.8);
          --pm-home-link-hover: #0f172a;
          --pm-home-screen-shadow: inset 0 0 0 1px rgba(203, 213, 225, 0.8);
          --pm-home-cta-shadow: 0 18px 40px rgba(148, 163, 184, 0.16);
          --pm-home-showcase-bg: #dbeafe;
          --pm-home-chart-bg: #38bdf8;
          --pm-home-avatar-bg: #2563eb;
        }

        .pm-homepage {
          background: var(--pm-home-bg);
        }

        .pm-shell {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        .pm-section {
          padding: 4rem 0;
        }

        .pm-top-links {
          display: flex;
          justify-content: center;
          gap: 1.2rem;
          flex-wrap: wrap;
          padding: 1.25rem 0 0.25rem;
        }

        .pm-top-links a {
          color: var(--pm-home-link-text);
          text-decoration: none;
          font-size: 0.9rem;
        }

        .pm-top-links a:hover {
          color: var(--pm-home-link-hover);
          text-decoration: none;
        }

        .pm-hero {
          position: relative;
          overflow: hidden;
          padding: 3rem 0 6rem;
          text-align: center;
        }

        .pm-hero::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          height: 120px;
          background: var(--pm-home-hero-cut);
          clip-path: polygon(0 35%, 50% 100%, 100% 35%, 100% 100%, 0 100%);
        }

        .pm-hero-inner {
          position: relative;
          z-index: 1;
        }

        .pm-kicker {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.9rem;
          border-radius: 999px;
          background: var(--pm-home-kicker-bg);
          border: 1px solid var(--pm-home-kicker-border);
          color: var(--pm-home-kicker-text);
          font-size: 0.82rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .pm-hero h1 {
          margin: 0 auto;
          max-width: 720px;
          font-size: clamp(2.3rem, 5vw, 4.25rem);
          line-height: 1.08;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .pm-hero p {
          margin: 1rem auto 0;
          max-width: 680px;
          color: var(--pm-home-muted-strong);
          line-height: 1.8;
          font-size: 1rem;
        }

        .pm-actions {
          display: flex;
          justify-content: center;
          gap: 0.9rem;
          flex-wrap: wrap;
          margin-top: 1.75rem;
        }

        .pm-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 150px;
          padding: 0.85rem 1.25rem;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 700;
          font-size: 0.92rem;
          transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
        }

        .pm-btn:hover {
          transform: translateY(-1px);
          text-decoration: none;
        }

        .pm-btn-primary {
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.28);
        }

        .pm-btn-primary:hover {
          color: #ffffff;
          background: #1d4ed8;
        }

        .pm-btn-secondary {
          background: var(--pm-home-secondary-bg);
          border: 1px solid var(--pm-home-secondary-border);
          color: var(--pm-home-link-text);
        }

        .pm-btn-secondary:hover {
          color: var(--pm-home-link-hover);
          background: var(--pm-home-secondary-hover);
        }

        .pm-hero-panel {
          width: min(100%, 820px);
          margin: 2.5rem auto 0;
          padding: 1rem;
          border-radius: 28px;
          background: var(--pm-home-panel-bg);
          border: 1px solid var(--pm-home-panel-border);
          box-shadow: 0 28px 56px rgba(2, 8, 23, 0.28);
        }

        .pm-hero-visual {
          position: relative;
          min-height: 320px;
          border-radius: 22px;
          overflow: hidden;
          background: var(--pm-home-showcase-bg);
        }

        .pm-dashboard-card,
        .pm-player-card {
          position: absolute;
          border-radius: 18px;
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.18);
        }

        .pm-dashboard-card {
          top: 2rem;
          right: 2rem;
          width: min(300px, 58%);
          padding: 1rem;
          background: var(--pm-home-dashboard-bg);
          color: var(--pm-home-dashboard-text);
          text-align: left;
        }

        .pm-dashboard-card h3,
        .pm-player-card h3 {
          margin: 0 0 0.35rem;
          font-size: 1rem;
        }

        .pm-dashboard-card p,
        .pm-player-card p {
          margin: 0;
          font-size: 0.84rem;
          line-height: 1.6;
        }

        .pm-dashboard-card p {
          color: var(--pm-home-dashboard-muted);
        }

        .pm-chart-lines {
          display: grid;
          gap: 0.6rem;
          margin-top: 1rem;
        }

        .pm-chart-lines span {
          display: block;
          height: 0.55rem;
          border-radius: 999px;
          background: var(--pm-home-chart-bg);
        }

        .pm-player-card {
          left: 2rem;
          bottom: 2rem;
          width: min(250px, 52%);
          padding: 1rem;
          background: var(--pm-home-player-bg);
          color: var(--pm-home-player-text);
          text-align: left;
        }

        .pm-player-card p {
          color: var(--pm-home-player-muted);
        }

        .pm-avatar {
          width: 52px;
          height: 52px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.75rem;
          background: var(--pm-home-avatar-bg);
          color: #ffffff;
          font-weight: 800;
        }

        .pm-section-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .pm-section-header h2 {
          margin: 0;
          font-size: clamp(1.8rem, 3vw, 2.6rem);
        }

        .pm-section-header p {
          margin: 0.75rem auto 0;
          max-width: 640px;
          color: var(--pm-home-muted);
          line-height: 1.75;
        }

        .pm-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.2rem;
        }

        .pm-card {
          border-radius: 22px;
          padding: 1.5rem;
          background: var(--pm-home-soft-card-bg);
          border: 1px solid var(--pm-home-soft-card-border);
        }

        .pm-icon {
          width: 3rem;
          height: 3rem;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          background: rgba(56, 189, 248, 0.12);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.16);
        }

        .pm-card h3 {
          margin: 0 0 0.65rem;
          font-size: 1.05rem;
        }

        .pm-card p {
          margin: 0;
          color: var(--pm-home-muted);
          line-height: 1.7;
          font-size: 0.94rem;
        }

        .pm-two-column {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          gap: 2rem;
          align-items: center;
        }

        .pm-copy h2 {
          margin: 0 0 1rem;
          font-size: clamp(1.8rem, 3vw, 2.6rem);
          line-height: 1.15;
        }

        .pm-copy p {
          margin: 0 0 1.1rem;
          color: var(--pm-home-muted);
          line-height: 1.75;
        }

        .pm-steps {
          display: grid;
          gap: 0.9rem;
          margin-top: 1.5rem;
        }

        .pm-step {
          display: flex;
          gap: 0.85rem;
          align-items: flex-start;
          color: var(--pm-home-muted-strong);
        }

        .pm-step svg {
          flex-shrink: 0;
          color: #38bdf8;
          margin-top: 0.15rem;
        }

        .pm-mockup {
          padding: 1rem;
          border-radius: 24px;
          background: var(--pm-home-soft-card-bg);
          border: 1px solid var(--pm-home-soft-card-border);
        }

        .pm-screen {
          min-height: 300px;
          border-radius: 20px;
          padding: 1rem;
          background: #f8fafc;
          box-shadow: var(--pm-home-screen-shadow);
        }

        .pm-screen-top {
          height: 2.8rem;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.08);
          margin-bottom: 1rem;
        }

        .pm-screen-grid {
          display: grid;
          grid-template-columns: 180px 1fr;
          gap: 1rem;
        }

        .pm-screen-sidebar,
        .pm-screen-main {
          display: grid;
          gap: 0.7rem;
        }

        .pm-screen-sidebar div,
        .pm-screen-main div {
          min-height: 2.8rem;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.22);
        }

        .pm-roles {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.85rem;
        }

        .pm-role-pill {
          padding: 0.75rem 1rem;
          border-radius: 999px;
          background: var(--pm-home-role-bg);
          border: 1px solid var(--pm-home-role-border);
          color: var(--pm-home-role-text);
          font-weight: 600;
        }

        .pm-cta {
          text-align: center;
        }

        .pm-cta-box {
          border-radius: 28px;
          padding: 2rem;
          background: var(--pm-home-soft-card-bg);
          border: 1px solid var(--pm-home-soft-card-border);
          box-shadow: var(--pm-home-cta-shadow);
        }

        .pm-cta-box h2 {
          margin: 0 0 0.75rem;
          font-size: clamp(1.8rem, 3vw, 2.5rem);
        }

        .pm-cta-box p {
          margin: 0 auto;
          max-width: 620px;
          color: var(--pm-home-muted);
          line-height: 1.75;
        }

        .pm-contact {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          gap: 1.2rem;
        }

        .pm-contact-box {
          border-radius: 22px;
          padding: 1.5rem;
          background: var(--pm-home-soft-card-bg);
          border: 1px solid var(--pm-home-soft-card-border);
        }

        .pm-contact-box h3 {
          margin: 0 0 0.75rem;
          font-size: 1.15rem;
        }

        .pm-contact-box p {
          margin: 0 0 0.85rem;
          color: var(--pm-home-muted);
          line-height: 1.75;
        }

        .pm-contact-list {
          display: grid;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .pm-contact-item {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          color: var(--pm-home-muted-strong);
        }

        .pm-contact-item svg {
          flex-shrink: 0;
          color: #38bdf8;
          margin-top: 0.15rem;
        }

        @media (max-width: 1024px) {
          .pm-grid-3,
          .pm-two-column,
          .pm-contact {
            grid-template-columns: 1fr;
          }

          .pm-dashboard-card,
          .pm-player-card {
            position: static;
            width: 100%;
            margin-top: 1rem;
          }

          .pm-hero-visual {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding: 1rem;
          }
        }

        @media (max-width: 768px) {
          .pm-shell {
            padding: 0 1rem;
          }

          .pm-hero {
            padding: 2.5rem 0 5rem;
          }

          .pm-hero::after {
            height: 90px;
          }

          .pm-actions {
            flex-direction: column;
          }

          .pm-btn {
            width: 100%;
          }

          .pm-screen-grid {
            grid-template-columns: 1fr;
          }

          .pm-hero-visual {
            min-height: 260px;
          }
        }
      `}</style>

      <div className={`pm-homepage pm-homepage-${theme}`}>
        <div className="pm-shell">
          <div className="pm-top-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#roles">Who it is for</a>
            <a href="#contact">Contact</a>
          </div>
        </div>

        <section className="pm-hero">
          <div className="pm-shell">
            <div className="pm-hero-inner">
              <span className="pm-kicker">
                <Target size={16} />
                Player Metrics Platform
              </span>

              <h1>
                Manage player readiness, team data, and reports in one place.
              </h1>

              <p>
                This platform helps clubs and performance teams track player
                metrics, organize staff access, and make clearer decisions
                around training, recovery, and availability.
              </p>

              <div className="pm-actions">
                <Link to="/register" className="pm-btn pm-btn-primary">
                  Create account
                </Link>
                <Link to="/login" className="pm-btn pm-btn-secondary">
                  Sign in
                </Link>
              </div>

              <div className="pm-hero-panel">
                <div className="pm-hero-visual">
                  <div className="pm-dashboard-card">
                    <h3>Squad overview</h3>
                    <p>
                      See player readiness, recent updates, and key team signals
                      without switching between tools.
                    </p>
                    <div className="pm-chart-lines">
                      <span style={{ width: "84%" }} />
                      <span style={{ width: "68%" }} />
                      <span style={{ width: "91%" }} />
                    </div>
                  </div>

                  <div className="pm-player-card">
                    <div className="pm-avatar">PM</div>
                    <h3>Player profile</h3>
                    <p>
                      Keep player information, metrics, and progress easier to
                      review for every role.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="pm-section">
          <div className="pm-shell">
            <div className="pm-section-header">
              <h2>What the platform helps you do</h2>
              <p>
                The homepage content is focused on the core purpose of the
                product: player monitoring, team management, and staff decision
                support.
              </p>
            </div>

            <div className="pm-grid-3">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <article key={feature.title} className="pm-card">
                    <div className="pm-icon">
                      <Icon size={22} />
                    </div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="pm-section">
          <div className="pm-shell">
            <div className="pm-two-column">
              <div className="pm-copy">
                <h2>A simple workflow for clubs and staff</h2>
                <p>
                  Player Metrics Platform is designed to reduce scattered
                  communication and make it easier to follow what matters across
                  the team.
                </p>

                <div className="pm-steps">
                  {workflow.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.title} className="pm-step">
                        <Icon size={18} />
                        <div>
                          <strong>{item.title}</strong>
                          <div>{item.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pm-mockup">
                <div className="pm-screen">
                  <div className="pm-screen-top" />
                  <div className="pm-screen-grid">
                    <div className="pm-screen-sidebar">
                      <div />
                      <div />
                      <div />
                      <div />
                    </div>
                    <div className="pm-screen-main">
                      <div />
                      <div />
                      <div />
                      <div />
                      <div />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="roles" className="pm-section">
          <div className="pm-shell">
            <div className="pm-section-header">
              <h2>Who it is for</h2>
              <p>
                Built for the people involved in player performance, health, and
                team operations.
              </p>
            </div>

            <div className="pm-roles">
              {roles.map((role) => (
                <div key={role} className="pm-role-pill">
                  {role}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pm-section pm-cta">
          <div className="pm-shell">
            <div className="pm-cta-box">
              <h2>Start with a simpler setup</h2>
              <p>
                Create an account, organize your team, and start managing player
                metrics in a way that matches how your staff actually works.
              </p>

              <div className="pm-actions">
                <Link to="/register" className="pm-btn pm-btn-primary">
                  Get started
                </Link>
                <Link to="/login" className="pm-btn pm-btn-secondary">
                  I already have an account
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="pm-section">
          <div className="pm-shell">
            <div className="pm-contact">
              <div className="pm-contact-box">
                <h3>Need access for your club?</h3>
                <p>
                  If you want to use the platform for your team or organization,
                  create an account and begin setting up your staff and players.
                </p>
                <Link to="/register" className="pm-btn pm-btn-primary">
                  Create account
                </Link>
              </div>

              <div className="pm-contact-box">
                <h3>Platform focus</h3>
                <div className="pm-contact-list">
                  <div className="pm-contact-item">
                    <Activity size={18} />
                    <div>Player readiness and availability tracking</div>
                  </div>
                  <div className="pm-contact-item">
                    <Users size={18} />
                    <div>Team, player, and role management</div>
                  </div>
                  <div className="pm-contact-item">
                    <BarChart3 size={18} />
                    <div>
                      Reports for training, recovery, and performance review
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
