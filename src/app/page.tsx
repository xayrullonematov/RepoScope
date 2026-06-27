"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Bug,
  Rocket,
  Layers,
  BookOpen,
  Wrench,
  Link2,
  Search,
  FileText,
  CheckCircle2,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";

const reviewTypes = [
  { id: "security", label: "Security review", icon: Shield, desc: "Find vulnerabilities, auth issues, injection risks" },
  { id: "bugs", label: "Bug hunt", icon: Bug, desc: "Detect logic errors, race conditions, edge cases" },
  { id: "production", label: "Production readiness", icon: Rocket, desc: "Check deployment, logging, error handling gaps" },
  { id: "architecture", label: "Architecture review", icon: Layers, desc: "Assess structure, coupling, scalability patterns" },
  { id: "explain", label: "Explain this repo", icon: BookOpen, desc: "Get a plain-language walkthrough of the codebase" },
  { id: "refactor", label: "Refactor priorities", icon: Wrench, desc: "Identify tech debt and cleanup opportunities" },
] as const;

const sampleFindings = [
  {
    severity: "critical" as const,
    title: "Long-running review blocks request lifecycle",
    location: "src/app/api/sessions/[sessionId]/advance/route.ts",
    why: "The orchestrator runs synchronously inside the HTTP handler. If it takes >30s the request times out, leaving the review in a broken state.",
    fix: "Move orchestration to a background job queue and return 202 Accepted immediately.",
  },
  {
    severity: "high" as const,
    title: "Demo password gate uses weak access control",
    location: "src/app/api/gate/route.ts",
    why: "A single plaintext password in an env var protects the entire app. No rate limiting, no lockout, no session expiry.",
    fix: "Replace with proper auth (OAuth or magic link) or add rate limiting + constant-time comparison at minimum.",
  },
  {
    severity: "medium" as const,
    title: "Missing CI build/test pipeline",
    location: "/ (root)",
    why: "No GitHub Actions or CI config found. Tests exist but never run automatically, so regressions ship unchecked.",
    fix: "Add a CI workflow that runs lint, type-check, and vitest on every push and PR.",
  },
];

function severityStyles(severity: "critical" | "high" | "medium") {
  switch (severity) {
    case "critical": return { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", label: "Critical" };
    case "high": return { bg: "bg-orange-500/10 border-orange-500/30", text: "text-orange-400", label: "High" };
    case "medium": return { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", label: "Medium" };
  }
}

export default function Home() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [selectedType, setSelectedType] = useState("production");
  const [showProcess, setShowProcess] = useState(false);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    const params = new URLSearchParams({ repo: repoUrl.trim(), type: selectedType });
    router.push(`/sessions?${params.toString()}`);
  };

  return (
    <div className="min-h-screen">
      {/* ─── Hero ─── */}
      <section className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-[var(--text-primary)] sm:text-4xl md:text-5xl lg:text-6xl">
            Review any GitHub repo{" "}
            <span className="bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
              in minutes
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
            Paste a public repository and get a prioritized engineering report with bugs, security risks, architecture issues, and production-readiness gaps.
          </p>

          <form onSubmit={handleAnalyze} className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row sm:gap-2">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="github.com/owner/repo"
              aria-label="GitHub repository URL"
              className="min-h-12 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] font-mono focus:border-[var(--brand-violet)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-glow)]"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className="min-h-12 whitespace-nowrap rounded-lg bg-[var(--brand-violet)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--violet-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-glow)]"
            >
              Analyze repo →
            </button>
          </form>

          <div className="flex flex-col items-center gap-2">
            <a
              href="#sample-report"
              className="text-sm text-[var(--text-secondary)] underline underline-offset-4 decoration-[var(--border)] hover:text-[var(--text-primary)] transition-colors"
            >
              See sample report
            </a>
            <p className="text-xs text-[var(--text-muted)]">
              Public GitHub repos work instantly. Private repo support is coming later.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Review Type Selector ─── */}
      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-3 text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            What do you want checked?
          </h2>
          <p className="mb-8 text-center text-sm text-[var(--text-secondary)] sm:text-base">
            Choose a review type. You can run multiple later.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Review type">
            {reviewTypes.map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selectedType === id}
                onClick={() => setSelectedType(id)}
                className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--violet-glow)] ${
                  selectedType === id
                    ? "border-[var(--brand-violet)] bg-[var(--violet-soft-bg)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--text-muted)]"
                }`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${selectedType === id ? "text-violet-400" : "text-[var(--text-muted)]"}`} strokeWidth={1.5} />
                <div>
                  <span className={`text-sm font-medium ${selectedType === id ? "text-violet-200" : "text-[var(--text-primary)]"}`}>
                    {label}
                  </span>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Sample Report ─── */}
      <section id="sample-report" className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-3 text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            What you&apos;ll get
          </h2>
          <p className="mb-8 text-center text-sm text-[var(--text-secondary)] sm:text-base">
            A structured report with severity, evidence, and actionable fixes.
          </p>

          {/* Report summary bar */}
          <div className="mb-6 flex flex-wrap items-center justify-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6 sm:py-4">
            <div className="text-center">
              <p className="text-xs text-[var(--text-muted)]">Readiness</p>
              <p className="text-sm font-semibold text-amber-400">Medium risk</p>
            </div>
            <div className="h-8 w-px bg-[var(--border)] hidden sm:block" />
            <div className="text-center">
              <p className="text-xs text-[var(--text-muted)]">Findings</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">7</p>
            </div>
            <div className="h-8 w-px bg-[var(--border)] hidden sm:block" />
            <div className="text-center">
              <p className="text-xs text-[var(--text-muted)]">Critical</p>
              <p className="text-sm font-semibold text-red-400">1</p>
            </div>
            <div className="h-8 w-px bg-[var(--border)] hidden sm:block" />
            <div className="text-center">
              <p className="text-xs text-[var(--text-muted)]">High</p>
              <p className="text-sm font-semibold text-orange-400">2</p>
            </div>
            <div className="h-8 w-px bg-[var(--border)] hidden sm:block" />
            <div className="text-center">
              <p className="text-xs text-[var(--text-muted)]">Medium</p>
              <p className="text-sm font-semibold text-amber-400">4</p>
            </div>
          </div>

          {/* Finding cards */}
          <div className="space-y-4">
            {sampleFindings.map((finding, i) => {
              const s = severityStyles(finding.severity);
              return (
                <div key={i} className={`rounded-lg border ${s.bg} p-4 sm:p-5`}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${s.text} border ${s.bg}`}>
                      <AlertTriangle size={12} />
                      {s.label}
                    </span>
                    <span className="font-mono text-xs text-[var(--text-muted)]">{finding.location}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{finding.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-2">
                    <span className="font-medium text-[var(--text-muted)]">Why it matters:</span> {finding.why}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-muted)]">Suggested fix:</span> {finding.fix}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
            {[
              { icon: Link2, step: "1", title: "Paste repo", desc: "Drop a GitHub URL. Public repos work instantly." },
              { icon: Search, step: "2", title: "AI reviewers inspect files", desc: "Specialized reviewers check security, bugs, architecture, and more." },
              { icon: FileText, step: "3", title: "Get a prioritized fix plan", desc: "Receive a structured report with severity, evidence, and fixes." },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 md:flex-col md:items-center md:text-center md:p-6">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)]">
                  <Icon className="h-5 w-5 text-[var(--text-secondary)]" strokeWidth={1.5} />
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-violet)] text-[10px] font-bold text-white">
                    {step}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] md:mt-3">{title}</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)] md:text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Optional disclosure */}
          <div className="mt-8 mx-auto max-w-2xl">
            <button
              type="button"
              onClick={() => setShowProcess(!showProcess)}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors mx-auto"
              aria-expanded={showProcess}
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${showProcess ? "rotate-180" : ""}`} />
              How does the review process work?
            </button>
            {showProcess && (
              <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--text-muted)] leading-relaxed">
                Multiple AI reviewers analyze the repository in parallel, each focused on a different concern (security, performance, architecture, bugs). They produce independent findings, then a synthesis step merges and prioritizes them into a single report. The process typically takes 1–3 minutes depending on repo size.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Trust / Differentiation ─── */}
      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-3 text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Why not just ask a chatbot?
          </h2>
          <p className="mb-8 text-center text-sm text-[var(--text-secondary)] sm:text-base">
            A single prompt gives you a wall of text. This gives you an engineering report.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { title: "Multiple angles", desc: "Specialized reviewers check security, performance, architecture, and bugs independently." },
              { title: "Structured findings", desc: "Findings are categorized by severity with file paths, not buried in paragraphs." },
              { title: "File-level evidence", desc: "Every finding points to the exact file and line, so you know where to look." },
              { title: "Copy-paste fixes", desc: "Suggested fixes are concrete enough to paste into your editor or coding tool." },
            ].map(({ title, desc }) => (
              <div key={title} className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" strokeWidth={1.5} />
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">{title}</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-xl text-center space-y-5">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Analyze your repo
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Paste a GitHub URL and get your report in minutes.
          </p>
          <form onSubmit={handleAnalyze} className="flex flex-col gap-3 sm:flex-row sm:gap-2">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="github.com/owner/repo"
              aria-label="GitHub repository URL"
              className="min-h-12 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] font-mono focus:border-[var(--brand-violet)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-glow)]"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className="min-h-12 whitespace-nowrap rounded-lg bg-[var(--brand-violet)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--violet-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-glow)]"
            >
              Analyze repo →
            </button>
          </form>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[var(--border)] px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-medium text-[var(--text-secondary)]">RepoScope</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            File-level findings · Evidence-backed fixes · Powered by AI reviewers
          </p>
        </div>
      </footer>
    </div>
  );
}
