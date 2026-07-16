import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) return setError(error.message);
    navigate("/dashboard");
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-20">
      <h1 className="font-display text-2xl font-bold text-ink">Log in</h1>
      <p className="text-sm text-ink/50 mt-1.5 mb-8">Welcome back — pick up where your cascade left off.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-ink/40">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1.5 rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-ink/40">Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1.5 rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none" />
        </div>
        {error && <p className="text-xs text-bear font-semibold">{error}</p>}
        <button disabled={loading} className="w-full bg-royal text-white font-bold text-sm py-3 rounded-xl">
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="text-sm text-ink/50 mt-6 text-center">
        No account? <Link to="/signup" className="text-royal font-semibold">Start a free trial</Link>
      </p>
    </div>
  );
}
