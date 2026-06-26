"use client";

import AgentAvatar from "@/components/workspace/AgentAvatar";
import type { AgentType } from "@/types/domain";

interface AgentCard {
  agent: AgentType;
  name: string;
  focus: string;
  example: string;
  accentColor: string;
}

const agentCards: AgentCard[] = [
  {
    agent: "security-engineer",
    name: "Security reviewer",
    focus: "Auth, secrets, injection, access control",
    example: "Found unvalidated OAuth state param in auth/callback.ts",
    accentColor: "border-t-red-500",
  },
  {
    agent: "senior-engineer",
    name: "Architecture reviewer",
    focus: "Boundaries, coupling, error handling",
    example: "Circular import between routes/ and services/",
    accentColor: "border-t-violet-500",
  },
  {
    agent: "performance-engineer",
    name: "Performance reviewer",
    focus: "N+1 queries, memory leaks, bundle size",
    example: "Unbounded .findMany() without pagination in /api/users",
    accentColor: "border-t-amber-500",
  },
  {
    agent: "product-engineer",
    name: "Bug reviewer",
    focus: "Edge cases, type mismatches, missing validation",
    example: "req.body.email used without null check on PATCH route",
    accentColor: "border-t-cyan-500",
  },
];

export default function AgentShowcase() {
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-24">
      <div className="max-w-5xl mx-auto">
        <h2 className="mb-3 text-center text-2xl font-bold text-[var(--text-primary)] sm:mb-4 sm:text-3xl">
          Four review lenses
        </h2>
        <p className="mx-auto mb-7 max-w-2xl text-center text-sm text-[var(--text-muted)] sm:mb-12 sm:text-base">
          Each agent reviews your repo from a different angle. You get one combined report.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {agentCards.map((card) => (
            <div
              key={card.agent}
              className={`rounded-lg border border-[var(--border)] border-t-2 bg-[var(--surface)] ${card.accentColor} p-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 sm:rounded-xl sm:p-6`}
            >
              <div className="mb-3 flex justify-center sm:mb-4">
                <AgentAvatar agent={card.agent} size="lg" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] text-center">
                {card.name}
              </h3>
              <p className="text-xs text-[var(--text-muted)] text-center mt-1 mb-3">
                {card.focus}
              </p>
              <p className="font-mono text-xs text-center leading-relaxed text-[var(--text-secondary)]">
                &ldquo;{card.example}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
