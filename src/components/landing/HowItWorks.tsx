"use client";

import { Link2, Cpu, FileText } from "lucide-react";

interface Step {
  icon: typeof Link2;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: Link2,
    title: "Paste a GitHub repo",
    description:
      "Drop a link to any public repo. Private repos coming soon.",
  },
  {
    icon: Cpu,
    title: "AI agents inspect the code",
    description:
      "Security, architecture, performance, and bug reviewers scan every file.",
  },
  {
    icon: FileText,
    title: "Get a file-level report",
    description:
      "Findings, severity, affected paths, and fixes you can apply right away.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-14 sm:px-6 sm:py-24">
      <div className="max-w-5xl mx-auto">
        <h2 className="mb-8 text-center text-2xl font-bold text-[var(--text-primary)] sm:mb-16 sm:text-3xl">
          How It Works
        </h2>

        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
          {/* Connecting lines (desktop only) */}
          <div className="hidden md:block absolute top-12 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-0.5 bg-gradient-to-r from-violet-500/35 via-[var(--border)] to-violet-500/35" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]/70 p-3 text-left md:flex-col md:border-0 md:bg-transparent md:p-0 md:text-center">
                {/* Step number + icon */}
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] md:mb-6 md:h-24 md:w-24">
                  <Icon className="h-6 w-6 text-[var(--text-secondary)] md:h-10 md:w-10" strokeWidth={1.5} />
                </div>

                {/* Step number badge */}
                <div className="absolute left-10 top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-xs font-bold text-[var(--text-secondary)] md:left-auto md:right-[calc(50%-48px)] md:top-0 md:h-7 md:w-7 md:text-sm">
                  {index + 1}
                </div>

                <div className="min-w-0 md:text-center">
                  <h3 className="mb-1 text-base font-semibold text-[var(--text-primary)] md:mb-2 md:text-lg">
                    {step.title}
                  </h3>
                  <p className="max-w-xs text-sm leading-relaxed text-[var(--text-muted)]">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
