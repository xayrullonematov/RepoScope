"use client";

import { use } from "react";
import { useSession } from "@/hooks/useSession";
import WorkspaceLayout from "@/components/workspace/WorkspaceLayout";
import { AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const { session, isLoading, error, mutate } = useSession(sessionId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={24} className="mx-auto text-[var(--brand-violet)] animate-spin" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">Loading review...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <AlertTriangle size={22} />
          </div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Couldn&apos;t load review</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {error?.message || "This review was not found or may have been deleted."}
          </p>
          <Link
            href="/sessions"
            className="mt-4 inline-flex rounded-lg bg-[var(--brand-violet)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--violet-hover)] transition-colors"
          >
            Back to reviews
          </Link>
        </div>
      </div>
    );
  }

  return <WorkspaceLayout session={session} mutate={mutate} />;
}
