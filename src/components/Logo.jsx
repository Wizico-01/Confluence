import React, { useState } from "react";

export default function Logo({ light = false, size = "md" }) {
  const [imgError, setImgError] = useState(false);
  const heightClass = size === "sm" ? "h-6" : "h-8";

  return (
    <div className="flex items-center">
      {!imgError ? (
        <img
          src="./logo.png"
          alt="GOBULU Logo"
          onError={() => setImgError(true)}
          className={`${heightClass} w-auto object-contain ${light ? "brightness-0 invert" : ""}`}
        />
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-royal flex items-center justify-center font-bold text-white text-sm">
            G
          </div>
          <span className={`text-xl font-display font-bold ${light ? "text-white" : "text-ink"}`}>
            GOBULU
          </span>
        </div>
      )}
    </div>
  );
}