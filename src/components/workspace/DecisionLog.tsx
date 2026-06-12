"use client";

import type { ArtifactState } from "@/types/domain";

interface DecisionLogProps {
  decisions: ArtifactState[];
}

export default function DecisionLog({ decisions }: DecisionLogProps) {
  return (
    <div>
      <h3 className="text-xs font-medium text-green-400 mb-2">Decisions ({decisions.length})</h3>
      <div className="space-y-2">
        {decisions.map((d) => (
          <div
            key={d.id}
            className="p-3 border border-green-800/50 rounded-lg bg-green-900/10"
          >
            <h4 className="text-sm font-medium text-gray-200">{d.title}</h4>
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{d.content}</p>
            {d.contributors.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Contributors: {d.contributors.join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
