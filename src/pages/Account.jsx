import React from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { Link } from "react-router-dom";

export default function Account() {
  const { user, profile, signOut } = useAuth();

  return (
    <div className="max-w-sm mx-auto px-5 py-16">
      <h1 className="font-display text-2xl font-bold text-ink">Account</h1>
      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-line p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/40">Email</p>
          <p className="text-sm font-semibold text-ink mt-1">{user?.email}</p>
        </div>
        <div className="rounded-xl border border-line p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/40">Subscription</p>
          <p className="text-sm font-semibold text-ink mt-1 capitalize">{profile?.subscription_status ?? "inactive"} {profile?.plan ? `· ${profile.plan}` : ""}</p>
          <Link to="/pricing" className="text-xs font-semibold text-royal mt-2 inline-block">Manage plan →</Link>
        </div>
        <button onClick={signOut} className="w-full rounded-xl border border-line py-3 text-sm font-bold text-ink">Sign out</button>
      </div>
    </div>
  );
}
