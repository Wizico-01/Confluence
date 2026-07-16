import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-mist">
      <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <Logo size="sm" />
        <div className="flex gap-6 text-sm font-medium text-ink/60">
          <Link to="/how-it-works" className="hover:text-ink">How it works</Link>
          <Link to="/pricing" className="hover:text-ink">Pricing</Link>
          <Link to="/login" className="hover:text-ink">Log in</Link>
        </div>
        <p className="text-xs text-ink/40">© {new Date().getFullYear()} Confluence. Not investment advice.</p>
      </div>
    </footer>
  );
}
