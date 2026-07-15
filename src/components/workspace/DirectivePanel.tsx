"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Target, Plus, Check } from "lucide-react";

interface DirectivePanelProps {
  sessionId: string;
  onDirectiveAdded?: () => void;
}

const MAX_CHARS = 500;

export default function DirectivePanel({
  sessionId,
  onDirectiveAdded,
}: DirectivePanelProps) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedText = text.trim();
  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isWhitespaceOnly = text.length > 0 && trimmedText.length === 0;
  const isDisabled =
    isSubmitting || charCount === 0 || isOverLimit || isWhitespaceOnly;

  const handleSubmit = useCallback(async () => {
    if (isDisabled) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/directives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmedText }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? "Failed to add directive. Please try again.");
        return;
      }

      setText("");
      setShowSuccess(true);
      onDirectiveAdded?.();
      setTimeout(() => setShowSuccess(false), 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isDisabled, sessionId, trimmedText, onDirectiveAdded]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/15">
          <Target size={14} className="text-violet-400" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Add Team Directive
        </h3>
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        placeholder='e.g., "Deployment must stay below $50/month. Do not recommend Kubernetes."'
        className="w-full h-20 px-3 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none text-sm transition-all"
      />

      {/* Footer: char counter, validation, submit */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs ${
              isOverLimit
                ? "text-red-400"
                : charCount > MAX_CHARS * 0.9
                  ? "text-amber-400"
                  : "text-[var(--text-muted)]"
            }`}
          >
            {charCount}/{MAX_CHARS}
          </span>
          {isWhitespaceOnly && (
            <span className="text-xs text-red-400">
              Directive cannot be empty
            </span>
          )}
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {showSuccess ? (
            <>
              <Check size={12} />
              Added
            </>
          ) : (
            <>
              <Plus size={12} />
              Add Directive
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
