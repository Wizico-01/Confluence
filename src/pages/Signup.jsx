import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="max-w-sm mx-auto px-5 py-24 text-center">
        <h1 className="font-display text-xl font-bold text-ink">Check your inbox</h1>
        <p className="text-sm text-ink/60 mt-2">We sent a confirmation link to {email}. Confirm it, then log in to choose a plan.</p>
        <Link to="/login" className="inline-block mt-6 text-royal font-semibold text-sm">Go to login</Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-20">
      <h1 className="font-display text-2xl font-bold text-ink">Start your free trial</h1>
      <p className="text-sm text-ink/50 mt-1.5 mb-8">Create an account, then choose a plan to unlock the dashboard.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-ink/40">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1.5 rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-ink/40">Password</label>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1.5 rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none" />
        </div>
        {error && <p className="text-xs text-bear font-semibold">{error}</p>}
        <button disabled={loading} className="w-full bg-royal text-white font-bold text-sm py-3 rounded-xl">
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="text-sm text-ink/50 mt-6 text-center">
        Already have an account? <Link to="/login" className="text-royal font-semibold">Log in</Link>
      </p>
    </div>
  );
}
