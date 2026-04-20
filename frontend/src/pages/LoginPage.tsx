import { FormEvent, useEffect, useState } from "react";
import { useAuthStore } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, token } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      const { user: u } = useAuthStore.getState();
      if (u?.role === "player" && u?.player_id) {
        navigate("/my-metrics", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      let errorMessage = "Login failed. Please try again.";
      if (axios.isAxiosError(err)) {
        errorMessage =
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-center">
      <div className="platform-card" style={{ padding: "2rem" }}>
        <h2 className="platform-page-title" style={{ marginBottom: "0.25rem" }}>
          Sign in
        </h2>
        <p
          className="platform-page-subtitle"
          style={{ marginBottom: "1.5rem" }}
        >
          Sign in to your Player Metrics account
        </p>

        {error && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
              background: "#fef2f2",
              borderLeft: "4px solid var(--platform-danger)",
              borderRadius: "var(--platform-radius)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "var(--platform-danger)",
              }}
            >
              {error}
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <div>
            <label htmlFor="email-address" className="platform-label">
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="platform-input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="platform-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="platform-input"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="platform-btn platform-btn-primary"
            style={{ width: "100%", padding: "0.5rem 1rem" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p
          style={{
            marginTop: "1.5rem",
            marginBottom: 0,
            fontSize: "0.875rem",
            color: "var(--platform-text-muted)",
            textAlign: "center",
          }}
        >
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
