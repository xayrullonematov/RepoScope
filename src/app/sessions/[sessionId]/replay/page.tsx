import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import ReplayScrubber from "@/components/workspace/ReplayScrubber";

export const metadata: Metadata = {
  title: "Activity log - RepoScope",
};

interface ReplayPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionReplayPage({ params }: ReplayPageProps) {
  const { sessionId } = await params;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href={`/sessions/${sessionId}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={14} />
        Back to review
      </Link>

      <header className="mt-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Activity log</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Key milestones from the analysis that shaped the final report.
        </p>
      </header>

      <div className="mt-6">
        <ReplayScrubber sessionId={sessionId} />
      </div>
    </div>
  );
}
