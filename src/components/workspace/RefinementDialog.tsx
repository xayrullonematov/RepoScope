"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import type { BudgetStatus, CostEstimate } from "@/types/domain";

interface RefinementDialogProps {
  open: boolean;
  sessionId: string;
  onClose: () => void;
  onQueued: () => void;
}

export default function RefinementDialog({ open, sessionId, onClose, onQueued }: RefinementDialogProps) {
  const [instruction, setInstruction] = useState("");
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/sessions/${sessionId}/rounds`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not estimate this refinement.");
        return res.json() as Promise<{ costEstimate: CostEstimate; budgetStatus: BudgetStatus }>;
      })
      .then((data) => {
        setEstimate(data.costEstimate);
        setBudget(data.budgetStatus);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load estimate."));
    queueMicrotask(() => textareaRef.current?.focus());
  }, [open, sessionId]);

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = instruction.trim();
    if (!text) {
      setError("Describe what the next round should investigate or improve.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: text }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not queue refinement.");
      setInstruction("");
      onQueued();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not queue refinement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="refinement-title">
      <form onSubmit={submit} className="w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <header className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 id="refinement-title" className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
              <Sparkles size={17} className="text-violet-400" /> Refine this review
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">The agents will run one focused debate using your instructions.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close refinement dialog" className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]">
            <X size={17} />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5">
          <div>
            <label htmlFor="refinement-instruction" className="text-sm font-medium text-[var(--text-secondary)]">What should the agents investigate next?</label>
            <textarea
              ref={textareaRef}
              id="refinement-instruction"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              rows={5}
              placeholder="Example: Verify the authentication findings against the middleware and propose the smallest safe patch."
              className="mt-2 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-violet)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-glow)]"
            />
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-xs text-[var(--text-muted)]">
            {estimate ? (
              <div className="flex flex-wrap justify-between gap-2">
                <span>Estimated {Math.round(estimate.estimatedInputTokens + estimate.estimatedOutputTokens).toLocaleString()} tokens</span>
                <span className="font-mono text-[var(--text-secondary)]">~${estimate.estimatedCostUsd.toFixed(3)}</span>
              </div>
            ) : (
              <span>Calculating estimated usage…</span>
            )}
            {budget?.warningThreshold && <p className="mt-2 text-amber-300">This refinement will run close to the session budget.</p>}
          </div>

          {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]">Cancel</button>
          <button type="submit" disabled={submitting || !instruction.trim() || budget?.isOverBudget} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--brand-violet)] px-5 text-sm font-semibold text-white hover:bg-[var(--violet-hover)] disabled:opacity-50">
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {submitting ? "Queueing…" : "Run refinement"}
          </button>
        </footer>
      </form>
    </div>
  );
}
