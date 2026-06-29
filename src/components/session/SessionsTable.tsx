"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, ArrowUpDown, ArrowDown, ArrowUp, FileText } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";

interface SessionSummary {
  id: string;
  title: string | null;
  problemDescription?: string;
  status: "active" | "paused" | "completed";
  currentRound: number;
  createdAt: string;
  artifactCount?: number;
}

interface SessionsTableProps {
  sessions: SessionSummary[];
  loading?: boolean;
}

type SortKey = "createdAt" | "round" | "status" | "title";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "active" | "paused" | "completed";

/** Extract repo identifier from session title (e.g. "owner/repo — security") */
function extractRepo(title: string | null): string | null {
  if (!title) return null;
  const match = title.match(/^([\w.-]+\/[\w.-]+)/);
  return match ? match[1] : null;
}

type Trend = "up" | "down" | "same" | null;

/** Compute trend for each session by comparing artifact count to prior analysis of same repo. */
function computeTrends(sessions: SessionSummary[]): Map<string, Trend> {
  const trends = new Map<string, Trend>();
  // Group by repo, sorted by date desc
  const byRepo = new Map<string, SessionSummary[]>();
  for (const s of sessions) {
    const repo = extractRepo(s.title);
    if (!repo || s.artifactCount === undefined) continue;
    if (!byRepo.has(repo)) byRepo.set(repo, []);
    byRepo.get(repo)!.push(s);
  }
  for (const [, group] of byRepo) {
    const sorted = [...group].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    for (let i = 0; i < sorted.length; i++) {
      if (i === sorted.length - 1) { trends.set(sorted[i].id, null); continue; }
      const current = sorted[i].artifactCount ?? 0;
      const previous = sorted[i + 1].artifactCount ?? 0;
      if (current < previous) trends.set(sorted[i].id, "down"); // fewer issues = improving
      else if (current > previous) trends.set(sorted[i].id, "up"); // more issues = worse
      else trends.set(sorted[i].id, "same");
    }
  }
  return trends;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const statusOrder: Record<SessionSummary["status"], number> = {
  active: 0,
  paused: 1,
  completed: 2,
};

const statusVariant = (s: SessionSummary["status"]) => {
  switch (s) {
    case "active": return "success" as const;
    case "paused": return "warning" as const;
    case "completed": return "info" as const;
  }
};

const statusLabel = (s: SessionSummary["status"]) => {
  switch (s) {
    case "active": return "Analyzing";
    case "paused": return "Paused";
    case "completed": return "Complete";
  }
};

function actionLabel(status: SessionSummary["status"]): string {
  switch (status) {
    case "completed": return "Open report";
    case "active": return "Continue analysis";
    case "paused": return "Continue analysis";
  }
}

export default function SessionsTable({ sessions, loading = false }: SessionsTableProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const trends = useMemo(() => computeTrends(sessions), [sessions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = sessions.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      return (s.title ?? s.problemDescription ?? "").toLowerCase().includes(q);
    });
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortKey === "round") cmp = a.currentRound - b.currentRound;
      else if (sortKey === "status") cmp = statusOrder[a.status] - statusOrder[b.status];
      else cmp = (a.title ?? a.problemDescription ?? "").localeCompare(b.title ?? b.problemDescription ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [sessions, query, statusFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "title" ? "asc" : "desc");
    }
  }

  const sortIconFor = (k: SortKey) => {
    if (sortKey !== k) return <ArrowUpDown size={11} className="opacity-40" />;
    return sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-11 w-full rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search & Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            placeholder="Search reviews…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-violet)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-glow)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="min-h-11 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand-violet)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-glow)]"
        >
          <option value="all">All status</option>
          <option value="active">Analyzing</option>
          <option value="paused">Paused</option>
          <option value="completed">Complete</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={query || statusFilter !== "all" ? "No reviews match" : "No reviews yet"}
          description={
            query || statusFilter !== "all"
              ? "Try a different search or status filter."
              : "Paste a GitHub repo to generate your first report."
          }
          action={
            !query && statusFilter === "all" ? (
              <Link
                href="/"
                className="rounded-lg bg-[var(--brand-violet)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--violet-hover)] transition-colors"
              >
                Start a review
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {filtered.map((session) => (
              <ReviewCard key={session.id} session={session} trend={trends.get(session.id) ?? null} />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-[var(--border)] sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-2.5">
                    <button type="button" onClick={() => toggleSort("title")} className="inline-flex items-center gap-1 hover:text-[var(--text-secondary)]">
                      Review {sortIconFor("title")}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-center">
                    <button type="button" onClick={() => toggleSort("status")} className="inline-flex items-center gap-1 hover:text-[var(--text-secondary)]">
                      Status {sortIconFor("status")}
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-right">
                    <button type="button" onClick={() => toggleSort("createdAt")} className="inline-flex items-center gap-1 hover:text-[var(--text-secondary)]">
                      Created {sortIconFor("createdAt")}
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((session) => (
                  <tr key={session.id} className="transition-colors hover:bg-[var(--surface-elevated)]/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/sessions/${session.id}`}
                        className="block text-[var(--text-primary)] transition-colors hover:text-violet-300"
                      >
                        <span className="block truncate max-w-md">
                          {(session.title ?? session.problemDescription ?? "Untitled review").slice(0, 100)}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                          {session.currentRound > 0 && (
                            <span>{session.currentRound} review pass{session.currentRound !== 1 ? "es" : ""}</span>
                          )}
                          {trends.get(session.id) === "down" && (
                            <span className="inline-flex items-center gap-0.5 text-green-400" title="Fewer issues than last analysis">
                              <ArrowDown size={10} />improving
                            </span>
                          )}
                          {trends.get(session.id) === "up" && (
                            <span className="inline-flex items-center gap-0.5 text-red-400" title="More issues than last analysis">
                              <ArrowUp size={10} />regressed
                            </span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge label={statusLabel(session.status)} variant={statusVariant(session.status)} />
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-muted)] whitespace-nowrap">
                      {timeAgo(session.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/sessions/${session.id}`}
                        className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-violet-300 border border-[var(--brand-violet)]/40 bg-[var(--violet-soft-bg)] hover:bg-[var(--brand-violet)]/20 transition-colors whitespace-nowrap"
                      >
                        {actionLabel(session.status)}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          Showing {filtered.length} of {sessions.length} review{sessions.length === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

function ReviewCard({ session, trend }: { session: SessionSummary; trend: Trend }) {
  const title = (session.title ?? session.problemDescription ?? "Untitled review").slice(0, 120);
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 transition-colors hover:border-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet-glow)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="line-clamp-2 text-sm font-medium leading-snug text-[var(--text-primary)]">{title}</h2>
        <StatusBadge label={statusLabel(session.status)} variant={statusVariant(session.status)} />
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-[var(--text-muted)]">
        {session.currentRound > 0 && (
          <>
            <span>{session.currentRound} review pass{session.currentRound !== 1 ? "es" : ""}</span>
            <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
          </>
        )}
        <span>{timeAgo(session.createdAt)}</span>
        {trend === "down" && <span className="text-green-400 flex items-center gap-0.5"><ArrowDown size={10} />improving</span>}
        {trend === "up" && <span className="text-red-400 flex items-center gap-0.5"><ArrowUp size={10} />regressed</span>}
      </div>
      <div className="mt-2.5">
        <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium text-violet-300 border border-[var(--brand-violet)]/40 bg-[var(--violet-soft-bg)]">
          {actionLabel(session.status)}
        </span>
      </div>
    </Link>
  );
}
