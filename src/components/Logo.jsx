import React from "react";
import { Target } from "lucide-react";

// Placeholder wordmark — swap the icon block for an <img src="/logo.svg" />
// once the brand logo file is added to /public.
export default function Logo({ light = false, size = "md" }) {
  const dims = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const text = size === "sm" ? "text-base" : "text-xl";
  return (
    <div className="flex items-center gap-2">
      <div className={`${dims} rounded-lg flex items-center justify-center bg-royal`}>
        <Target size={size === "sm" ? 15 : 18} color="#fff" strokeWidth={2.5} />
      </div>
      <span className={`${text} font-display font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}>
        Confluence
      </span>
    </div>
  );
}
