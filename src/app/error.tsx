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

  // Map common error messages to user-friendly text
  const friendlyMessage = getFriendlyMessage(error.message);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
      <div className="max-w-md w-full rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Something went wrong</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {friendlyMessage}
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-[var(--text-muted)] font-mono">ref: {error.digest}</p>
        )}
        <button
          onClick={() => retry()}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--brand-violet)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--violet-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-glow)]"
        >
          <RotateCcw size={14} /> Try again
        </button>
      </div>
    </div>
  );
}

function getFriendlyMessage(message: string): string {
  if (!message) return "An unexpected error occurred. Please try again.";
  const lower = message.toLowerCase();
  if (lower.includes("fetch") || lower.includes("network")) return "Couldn't reach the server. Check your connection and try again.";
  if (lower.includes("rate limit")) return "GitHub rate limit reached. Wait a minute and try again.";
  if (lower.includes("not found") || lower.includes("404")) return "The resource you're looking for wasn't found.";
  if (lower.includes("timeout")) return "The request timed out. The review may still be running — refresh to check.";
  if (lower.includes("api key") || lower.includes("unauthorized")) return "AI provider key is missing or invalid. Check your settings.";
  return message;
}
