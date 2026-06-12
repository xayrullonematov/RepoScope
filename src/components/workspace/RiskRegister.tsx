"use client";

import type { ArtifactState } from "@/types/domain";

interface RiskRegisterProps {
  risks: ArtifactState[];
}

export default function RiskRegister({ risks }: RiskRegisterProps) {
  return (
    <div>
      <h3 className="text-xs font-medium text-yellow-400 mb-2">Risks ({risks.length})</h3>
      <div className="space-y-2">
        {risks.map((r) => (
          <div
            key={r.id}
            className="p-3 border border-yellow-800/50 rounded-lg bg-yellow-900/10"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-200">{r.title}</h4>
              <span className={`px-1.5 py-0.5 text-xs rounded border ${
                r.status === "accepted"
                  ? "bg-green-900/50 text-green-400 border-green-700"
                  : r.status === "rejected"
                  ? "bg-red-900/50 text-red-400 border-red-700"
                  : "bg-yellow-900/50 text-yellow-400 border-yellow-700"
              }`}>
                {r.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{r.content}</p>
            {r.contributors.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Raised by: {r.contributors.join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
