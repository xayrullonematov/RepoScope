"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";
import type { SessionState, SessionConfig } from "@/types/domain";
import ResultsDashboard, {
  ResultsDashboardSkeleton,
} from "@/components/workspace/ResultsDashboard";
import { toast } from "@/hooks/useToast";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const { data, error, isLoading } = useSWR<SessionState & { config?: SessionConfig }>(
    `/api/sessions/${sessionId}`,
    fetcher,
  );

  async function handleExport() {
    const res = await fetch(`/api/sessions/${sessionId}/results/markdown`);
    if (!res.ok) {
      toast.error({ message: "Export failed", description: "Couldn't generate the report. Please try again." });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ??
      `review-${sessionId}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main id="main-content" className="mx-auto flex h-[calc(100svh-4rem)] max-w-4xl flex-col px-4 py-6 sm:px-6">
      <Link
        href={`/sessions/${sessionId}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={14} />
        Back to review
      </Link>

      <header className="mt-4 mb-2">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Review Report</h1>
        {data && (
          <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
            {data.problemDescription.slice(0, 140)}
            {data.problemDescription.length > 140 ? "…" : ""}
          </p>
        )}
      </header>

      <div className="mt-2 flex-1 min-h-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        {isLoading ? (
          <ResultsDashboardSkeleton />
        ) : error || !data ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div>
              <p className="text-base font-medium text-red-400">Couldn&apos;t load the report</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {error instanceof Error ? error.message : "Review not found"}
              </p>
            </div>
          </div>
        ) : (
          <ResultsDashboard session={data} config={data.config} onExport={handleExport} />
        )}
      </div>
    </main>
  );
}
