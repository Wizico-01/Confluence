import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "./Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const links = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/"><Logo /></Link>

        <nav className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `text-sm font-semibold ${isActive ? "text-royal" : "text-ink/70 hover:text-ink"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm font-semibold text-ink/80 hover:text-ink">Dashboard</Link>
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="text-sm font-bold px-4 py-2 rounded-lg border border-line text-ink"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-ink/80 hover:text-ink">Log in</Link>
              <Link to="/signup" className="text-sm font-bold px-4 py-2 rounded-lg bg-royal text-white">
                Start free trial
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen((o) => !o)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-line px-5 py-4 space-y-3 bg-white">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block text-sm font-semibold text-ink">
              {l.label}
            </Link>
          ))}
          <div className="pt-2 flex gap-3">
            {user ? (
              <Link to="/dashboard" className="text-sm font-bold px-4 py-2 rounded-lg bg-royal text-white">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-ink/80">Log in</Link>
                <Link to="/signup" className="text-sm font-bold px-4 py-2 rounded-lg bg-royal text-white">Start free trial</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
