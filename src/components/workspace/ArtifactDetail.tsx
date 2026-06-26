"use client";

import { useState } from "react";
import {
  FileCheck,
  AlertTriangle,
  Lightbulb,
  Scale,
  HelpCircle,
  ThumbsUp,
} from "lucide-react";
import type { AgentType, ArtifactState, ArtifactType, ArtifactVersion } from "@/types/domain";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";

interface ArtifactDetailProps {
  artifact: ArtifactState;
  sessionId: string;
  onClose: () => void;
  onStatusChange?: () => void;
}

// ---------------------------------------------------------------------------
// Visual mapping helpers (mirrors ArtifactCard severity logic)
// ---------------------------------------------------------------------------

type SeverityLevel = "high" | "medium" | "low";

function getSeverity(type: ArtifactType): SeverityLevel {
  switch (type) {
    case "risk":
      return "high";
    case "decision":
    case "recommendation":
      return "medium";
    default:
      return "low";
  }
}

const severityLabels: Record<SeverityLevel, string> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

const severityBadgeBg: Record<SeverityLevel, string> = {
  high: "bg-red-500/15 text-red-400",
  medium: "bg-amber-500/15 text-amber-400",
  low: "bg-emerald-500/15 text-emerald-400",
};

const typeIcons: Record<ArtifactType, typeof FileCheck> = {
  decision: FileCheck,
  risk: AlertTriangle,
  assumption: Lightbulb,
  tradeoff: Scale,
  "open-question": HelpCircle,
  recommendation: ThumbsUp,
};

const typeLabels: Record<ArtifactType, string> = {
  decision: "Finding",
  risk: "Risk",
  assumption: "Assumption",
  tradeoff: "Tradeoff",
  "open-question": "Question",
  recommendation: "Fix",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  accepted: "Accepted",
  rejected: "Rejected",
};

const statusTextColors: Record<string, string> = {
  draft: "text-amber-300",
  accepted: "text-green-300",
  rejected: "text-red-300",
};

const agentLabels: Record<AgentType, string> = {
  "senior-engineer": "Senior",
  "security-engineer": "Security",
  "performance-engineer": "Performance",
  "product-engineer": "Product",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ArtifactDetail({ artifact, sessionId, onClose, onStatusChange }: ArtifactDetailProps) {
  const [versions, setVersions] = useState<ArtifactVersion[] | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  const severity = getSeverity(artifact.type);
  const Icon = typeIcons[artifact.type] || FileCheck;

  const loadVersions = async () => {
    if (versions) {
      setShowVersions(!showVersions);
      return;
    }
    try {
      const res = await fetch(`/api/sessions/${sessionId}/artifacts/${artifact.id}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions);
        setShowVersions(true);
      }
    } catch {
      // silently fail
    }
  };

  const handleStatusChange = async (status: "accepted" | "rejected") => {
    setIsUpdating(true);
    try {
      await fetch(`/api/sessions/${sessionId}/artifacts/${artifact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onStatusChange?.();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[80vh] bg-gray-900 border border-gray-700 rounded-xl overflow-hidden flex flex-col">
        {/* Header: Title first, metadata second */}
        <div className="border-b border-gray-700 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {/* Title (primary element) */}
              <h3 className="text-base font-semibold text-gray-100 line-clamp-3 leading-snug">
                {artifact.title || <span className="italic text-gray-500">Untitled finding</span>}
              </h3>

              {/* Metadata row: severity, type, status */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide font-mono ${severityBadgeBg[severity]}`}
                >
                  <Icon size={11} />
                  {severityLabels[severity]}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  {typeLabels[artifact.type]}
                </span>
                <span className="text-gray-700">|</span>
                <span className={`text-xs font-medium ${statusTextColors[artifact.status]}`}>
                  {statusLabels[artifact.status]}
                </span>
                {artifact.version > 1 && (
                  <span className="text-xs text-gray-600 font-mono">v{artifact.version}</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
              aria-label="Close detail view"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content (the main substance) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {artifact.content ? (
            <MarkdownRenderer content={artifact.content} />
          ) : (
            <p className="text-sm text-gray-500 italic">No content available.</p>
          )}

          {/* Agent attribution (de-emphasized, after content) */}
          {artifact.contributors.length > 0 && (
            <div className="border-t border-gray-700/60 pt-3">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Found by</p>
              <p className="mt-0.5 text-sm text-gray-400">
                {artifact.contributors.map((c) => agentLabels[c] ?? c).join(", ")}
              </p>
            </div>
          )}

          {/* Version History */}
          <div className="pt-3 border-t border-gray-700/60">
            <button
              onClick={loadVersions}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              {showVersions ? "Hide" : "Show"} version history (v{artifact.version})
            </button>
            {showVersions && versions && (
              <div className="mt-2 space-y-2">
                {versions.map((v) => (
                  <div key={v.id} className="p-2 bg-gray-800/50 border border-gray-700 rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-300 font-medium">
                        v{v.version} by {v.agentId || "system"}
                      </span>
                      <span className="text-gray-500">
                        {new Date(v.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {v.reasoning && (
                      <p className="text-gray-400 italic">{v.reasoning}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Status control (secondary, functional) */}
        <div className="px-5 py-3 border-t border-gray-700 flex items-center gap-3">
          <button
            onClick={() => handleStatusChange("accepted")}
            disabled={isUpdating || artifact.status === "accepted"}
            className="px-3 py-1.5 bg-green-700/80 hover:bg-green-600 disabled:opacity-50 text-white text-xs rounded-md transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => handleStatusChange("rejected")}
            disabled={isUpdating || artifact.status === "rejected"}
            className="px-3 py-1.5 bg-red-700/80 hover:bg-red-600 disabled:opacity-50 text-white text-xs rounded-md transition-colors"
          >
            Reject
          </button>
          <span className={`ml-auto text-xs ${statusTextColors[artifact.status]}`}>
            {statusLabels[artifact.status]}
          </span>
        </div>
      </div>
    </div>
  );
}
