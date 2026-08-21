import React, { useState } from "react";

export default function Logo({ light = false, size = "md" }) {
  const [imgError, setImgError] = useState(false);
  const dims = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const text = size === "sm" ? "text-base" : "text-xl";

  return (
    <div className="flex items-center gap-2.5">
      {!imgError ? (
        <img
          src="./logo.png"
          alt="GOBULU Logo"
          onError={() => setImgError(true)}
          className={`${dims} rounded-lg object-contain`}
        />
      ) : (
        <div className={`${dims} rounded-lg bg-royal flex items-center justify-center font-bold text-white text-sm`}>
          G
        </div>
      )}
      <span className={`${text} font-display font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}>
        GOBULU
      </span>
    </div>
  );
}