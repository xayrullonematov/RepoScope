"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, GitBranch, BookOpen, MessageCircleQuestion } from "lucide-react";
import ConstraintInput from "./ConstraintInput";
import PriorSessionPicker from "./PriorSessionPicker";

interface ConstraintItem {
  text: string;
  category: string;
}

type ClarificationPolicy = "allow" | "suppress" | "limit-1" | "limit-3";

function policyToValue(p: ClarificationPolicy): "allow" | "suppress" | number {
  if (p === "limit-1") return 1;
  if (p === "limit-3") return 3;
  return p;
}

export default function NewSessionForm() {
  const router = useRouter();
  const [problemDescription, setProblemDescription] = useState("");
  const [tokenBudget, setTokenBudget] = useState<string>("");
  const [constraints, setConstraints] = useState<ConstraintItem[]>([]);
  const [githubRepo, setGithubRepo] = useState("");
  const [priorSessionSummary, setPriorSessionSummary] = useState("");
  const [clarificationPolicy, setClarificationPolicy] = useState<ClarificationPolicy>("allow");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDescription.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        problemDescription: problemDescription.trim(),
        tokenBudget: tokenBudget ? parseInt(tokenBudget, 10) : undefined,
        constraints,
      };
      if (githubRepo.trim()) payload.githubRepo = githubRepo.trim();
      if (priorSessionSummary.trim()) payload.priorSessionSummary = priorSessionSummary.trim();
      if (clarificationPolicy !== "allow") {
        payload.config = { clarificationPolicy: policyToValue(clarificationPolicy) };
      }

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create session");
      }

      const data = await res.json();
      router.push(`/sessions/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addConstraint = (constraint: ConstraintItem) => {
    setConstraints((prev) => [...prev, constraint]);
  };

  const removeConstraint = (index: number) => {
    setConstraints((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Problem Description */}
        <div>
          <label htmlFor="problem" className="block text-sm font-medium text-gray-300 mb-2">
            What engineering problem should the agents debate?
          </label>
          <textarea
            id="problem"
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder="Should we migrate our monolith to microservices? We have 50 engineers, 3M daily requests, and need to ship faster. Current deploy takes 45 minutes..."
            className="w-full h-44 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none text-base leading-relaxed"
            required
          />
          <p className="text-xs text-gray-500 mt-2">
            {problemDescription.length}/2000 &mdash; Be specific: include context, constraints, and what a good outcome looks like.
          </p>
        </div>

        {/* GitHub repo grounding (top-level, since it's high-impact) */}
        <div>
          <label htmlFor="github-repo" className="flex items-center gap-1.5 text-sm font-medium text-gray-300 mb-2">
            <GitBranch size={14} className="text-gray-400" />
            Ground in a GitHub repo <span className="text-xs font-normal text-gray-500">(optional)</span>
          </label>
          <input
            id="github-repo"
            type="text"
            value={githubRepo}
            onChange={(e) => setGithubRepo(e.target.value)}
            placeholder="vercel/next.js, owner/repo@branch, or full GitHub URL"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-gray-500 mt-1">
            Agents can read files from the repo during the Proposal stage to ground their thinking in real code.
          </p>
        </div>

        {/* Advanced Options Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Advanced options
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-5 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
              {/* Token Budget */}
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-300 mb-1">
                  Token Budget
                </label>
                <input
                  id="budget"
                  type="number"
                  value={tokenBudget}
                  onChange={(e) => setTokenBudget(e.target.value)}
                  placeholder="e.g., 100000"
                  min="1000"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum tokens the debate can consume. Leave empty for unlimited.
                </p>
              </div>

              {/* Clarification policy */}
              <div>
                <label htmlFor="clarification-policy" className="flex items-center gap-1.5 text-sm font-medium text-gray-300 mb-1">
                  <MessageCircleQuestion size={14} className="text-gray-400" />
                  Clarification policy
                </label>
                <select
                  id="clarification-policy"
                  value={clarificationPolicy}
                  onChange={(e) => setClarificationPolicy(e.target.value as ClarificationPolicy)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                >
                  <option value="allow">Allow — pause the round whenever agents need clarification</option>
                  <option value="limit-1">Limit to 1 question per stage</option>
                  <option value="limit-3">Limit to 3 questions per stage</option>
                  <option value="suppress">Suppress — never pause for clarifications</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Controls whether agents can ask you questions mid-round. Suppress for fully autonomous runs.
                </p>
              </div>

              {/* Prior session summary */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="prior-session" className="flex items-center gap-1.5 text-sm font-medium text-gray-300">
                    <BookOpen size={14} className="text-gray-400" />
                    Prior session context
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    className="text-xs text-blue-400 transition-colors hover:text-blue-300"
                  >
                    Import from session…
                  </button>
                </div>
                <textarea
                  id="prior-session"
                  value={priorSessionSummary}
                  onChange={(e) => setPriorSessionSummary(e.target.value)}
                  placeholder="Paste or import a prior debate's summary so agents continue from where you left off."
                  className="w-full h-28 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none text-sm leading-relaxed"
                />
              </div>

              {/* Constraints */}
              <ConstraintInput
                constraints={constraints}
                onAdd={addConstraint}
                onRemove={removeConstraint}
              />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !problemDescription.trim()}
          className="w-full py-3.5 px-6 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:shadow-none text-base"
        >
          {isSubmitting ? "Creating Session..." : "Start Debate"}
        </button>
      </form>

      {showPicker && (
        <PriorSessionPicker
          onClose={() => setShowPicker(false)}
          onPick={(summary) => {
            setPriorSessionSummary(summary);
            setShowAdvanced(true);
            setShowPicker(false);
          }}
        />
      )}
    </>
  );
}
