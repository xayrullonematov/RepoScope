"use client";

import { useState } from "react";

interface InterventionPanelProps {
  sessionId: string;
}

const CATEGORIES = ["technical", "business", "timeline", "resource"] as const;

export default function InterventionPanel({ sessionId }: InterventionPanelProps) {
  const [constraintText, setConstraintText] = useState("");
  const [category, setCategory] = useState<string>("technical");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddAndContinue = async () => {
    if (!constraintText.trim()) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/sessions/${sessionId}/intervene`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: constraintText.trim(), category }),
      });
      await fetch(`/api/sessions/${sessionId}/advance`, { method: "POST" });
      setConstraintText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await fetch(`/api/sessions/${sessionId}/advance`, { method: "POST" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 border-2 border-yellow-700/50 rounded-lg bg-yellow-900/10">
      <h3 className="text-sm font-semibold text-yellow-400 mb-2">
        Intervention Point
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        The debate is paused. You can add a new constraint before continuing.
      </p>

      <div className="space-y-2">
        <textarea
          value={constraintText}
          onChange={(e) => setConstraintText(e.target.value)}
          placeholder="Add a new constraint or guidance..."
          className="w-full h-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={handleAddAndContinue}
            disabled={isSubmitting || !constraintText.trim()}
            className="flex-1 px-3 py-2 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            Add Constraint & Continue
          </button>
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-sm rounded-lg transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
