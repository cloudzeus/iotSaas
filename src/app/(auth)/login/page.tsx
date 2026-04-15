"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("dark");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    const saved = localStorage.getItem("dgsmart-theme") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Λάθος email ή κωδικός / Invalid email or password");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("dgsmart-theme", next);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
      }}
    >
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "8px 12px",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontSize: "0.8rem",
        }}
      >
        {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
      </button>

      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img
            src="https://dgsoft.b-cdn.net/dgsmart-hub-logo.png"
            alt="DGSmart Hub"
            style={{ height: "48px", marginBottom: "16px" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            DGSmart<span style={{ color: "var(--orange)" }}>Hub</span>
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              marginTop: "6px",
            }}
          >
            IoT Device Management Platform
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: "32px" }}>
          <h2
            style={{
              color: "var(--text-primary)",
              fontSize: "1.1rem",
              fontWeight: 600,
              marginBottom: "24px",
              textAlign: "center",
            }}
          >
            Είσοδος / Sign In
          </h2>

          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "6px",
                padding: "10px 14px",
                color: "#ef4444",
                fontSize: "0.875rem",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="user@company.gr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label className="label">Κωδικός / Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "12px" }}
            >
              {loading ? "Σύνδεση..." : "Είσοδος / Sign In"}
            </button>
          </form>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: "24px",
            color: "var(--text-muted)",
            fontSize: "0.75rem",
          }}
        >
          Powered by{" "}
          <span style={{ color: "var(--orange)", fontWeight: 600 }}>
            DGSOFT
          </span>
        </p>
      </div>
    </div>
  );
}
