import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Gate that requires both a logged-in user and an active subscription.
// Logged-in-but-unpaid users are bounced to Pricing rather than Login.
export default function ProtectedRoute({ children }) {
  const { user, isSubscribed, loading } = useAuth();

  if (loading) return <div className="py-24 text-center text-ink/50 text-sm">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSubscribed) return <Navigate to="/pricing" replace />;
  return children;
}
