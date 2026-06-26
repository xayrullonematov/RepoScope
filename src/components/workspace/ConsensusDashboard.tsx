"use client";

import type { ConsensusOutput } from "@/types/domain";

interface ConsensusDashboardProps {
  consensus: ConsensusOutput | null;
}

export default function ConsensusDashboard({ consensus }: ConsensusDashboardProps) {
  if (!consensus) {
    return (
      <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/30">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
          Agent Agreement
        </h2>
        <p className="text-sm text-gray-500">
          Agent agreement not yet generated. Complete a review pass to see results.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
        Agent Agreement
      </h2>

      {/* Agreements */}
      {consensus.agreements.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-green-400 mb-2">
            Agreements ({consensus.agreements.length})
          </h3>
          <div className="space-y-2">
            {consensus.agreements.map((a, i) => (
              <div
                key={i}
                className="p-3 border-2 border-green-800/50 rounded-lg bg-green-900/10"
              >
                <p className="text-sm text-gray-200">{a.point}</p>
                <p className="text-xs text-gray-400 mt-1">{a.reasoning}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Supported by: {a.supportingAgents.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disagreements */}
      {consensus.disagreements.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-red-400 mb-2">
            Disagreements ({consensus.disagreements.length})
          </h3>
          <div className="space-y-2">
            {consensus.disagreements.map((d, i) => (
              <div
                key={i}
                className="p-3 border-2 border-red-800/50 rounded-lg bg-red-900/10"
              >
                <p className="text-sm text-gray-200">{d.point}</p>
                <div className="mt-2 space-y-1">
                  {d.positions.map((p, j) => (
                    <p key={j} className="text-xs text-gray-400">
                      <span className="text-gray-300 font-medium">{p.agentId}:</span>{" "}
                      {p.stance} — {p.reasoning}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Decisions */}
      {consensus.recommendedDecisions.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-blue-400 mb-2">
            Recommended Fixes
          </h3>
          <ol className="space-y-2 list-decimal list-inside">
            {consensus.recommendedDecisions.map((d, i) => (
              <li key={i} className="text-sm text-gray-200">
                <span className="font-medium">{d.title}</span>
                <span className="text-gray-400"> — {d.description}</span>
                <span className="text-xs text-gray-500 ml-1">
                  ({Math.round(d.confidence * 100)}% confidence)
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
