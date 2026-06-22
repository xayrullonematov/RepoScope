"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}

export default function GlobalError({ error, unstable_retry, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  const retry = unstable_retry ?? reset ?? (() => window.location.reload());

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
      <div className="max-w-md w-full rounded-xl border border-red-900/60 bg-red-950/30 p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-900/40 text-red-300">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-lg font-semibold text-gray-50">Something went wrong</h2>
        <p className="mt-2 text-sm text-gray-400">
          {error.message || "An unexpected error occurred while rendering this page."}
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-gray-600 font-mono">ref: {error.digest}</p>
        )}
        <button
          onClick={() => retry()}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          <RotateCcw size={14} /> Try again
        </button>
      </div>
    </div>
  );
}
