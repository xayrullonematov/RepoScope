import {
  AlertTriangle,
  Bug,
  FileCode,
  Shield,
  TrendingUp,
} from "lucide-react";

const findings = [
  {
    severity: "critical" as const,
    file: "src/routes/auth/callback.ts",
    message: "OAuth state param not validated - CSRF possible",
  },
  {
    severity: "warning" as const,
    file: "src/middleware/rateLimit.ts",
    message: "Rate limiter uses in-memory store, resets on deploy",
  },
  {
    severity: "warning" as const,
    file: "src/db/queries/users.ts",
    message: "Raw SQL interpolation in search filter",
  },
];

const fixes = [
  "Validate state param against session before token exchange",
  "Move rate limit store to Redis or use upstream proxy",
  "Use parameterized queries for user search",
];

function severityColor(severity: "critical" | "warning") {
  return severity === "critical"
    ? "bg-red-500/15 text-red-300 border-red-500/40"
    : "bg-amber-500/15 text-amber-300 border-amber-500/40";
}

function severityDot(severity: "critical" | "warning") {
  return severity === "critical" ? "bg-red-400" : "bg-amber-400";
}

export default function SampleReport() {
  return (
    <section id="sample-report" className="px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-5 sm:gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div className="space-y-3 sm:space-y-4">
          <div className="inline-flex min-h-9 items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/10 px-3 text-sm font-medium text-violet-200">
            <FileCode size={16} />
            Example report
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-50 md:text-4xl">
            See what you get.
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-gray-300 sm:text-base">
            A file-level report with findings, severity, and fixes you can ship today.
            No fluff, just code-referenced evidence.
          </p>
        </div>

        {/* Report card */}
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg shadow-black/20">
          {/* Header */}
          <div className="border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div>
                <p className="font-mono text-xs text-[var(--text-muted)] tracking-wide">
                  acme-corp/payments-api
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Security + bug review
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-500/10 px-2.5 py-0.5 text-sm font-medium text-amber-200">
                  <AlertTriangle size={14} />
                  3 findings
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/50 bg-violet-500/10 px-2.5 py-0.5 text-sm font-medium text-violet-200">
                  <TrendingUp size={14} />
                  Score: 6.2/10
                </span>
              </div>
            </div>
          </div>

          {/* Findings */}
          <div className="border-b border-[var(--border)] p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2 text-[var(--text-secondary)] sm:mb-3">
              <Shield size={16} />
              <h4 className="text-sm font-semibold">Findings</h4>
            </div>
            <ul className="space-y-2">
              {findings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityDot(f.severity)}`} />
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-[var(--text-muted)]">{f.file}</span>
                    <p className="text-[var(--text-secondary)]">{f.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Fixes */}
          <div className="p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2 text-[var(--text-secondary)] sm:mb-3">
              <Bug size={16} />
              <h4 className="text-sm font-semibold">Suggested fixes</h4>
            </div>
            <ol className="space-y-1.5 text-sm text-[var(--text-secondary)]">
              {fixes.map((fix, index) => (
                <li key={index} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-violet-500/50 text-xs text-violet-200">
                    {index + 1}
                  </span>
                  <span>{fix}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
