"use client";

import { useState } from "react";
import {
  FileCheck,
  AlertTriangle,
  Lightbulb,
  Scale,
  HelpCircle,
  ThumbsUp,
  ChevronDown,
} from "lucide-react";
import type { ArtifactState, ArtifactType, ArtifactStatus, AgentType } from "@/types/domain";
import ArtifactDetail from "./ArtifactDetail";
import { toast } from "@/hooks/useToast";

interface ArtifactCardProps {
  artifact: ArtifactState;
  sessionId: string;
  onStatusChange?: () => void;
}

// ---------------------------------------------------------------------------
// Visual mapping helpers
// ---------------------------------------------------------------------------

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

/**
 * Severity is derived from artifact type since the ArtifactState schema
 * does not carry an explicit severity field.
 * - risk -> high
 * - decision, recommendation -> medium
 * - assumption, tradeoff, open-question -> low
 */
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

// Severity-driven colors for the badge / left border
const severityBorderColors: Record<SeverityLevel, string> = {
  high: "border-l-red-500",
  medium: "border-l-amber-500",
  low: "border-l-emerald-500",
};

const severityBadgeBg: Record<SeverityLevel, string> = {
  high: "bg-red-500/15 text-red-400",
  medium: "bg-amber-500/15 text-amber-400",
  low: "bg-emerald-500/15 text-emerald-400",
};

const severityIconColor: Record<SeverityLevel, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-emerald-400",
};

const statusTextColors: Record<ArtifactStatus, string> = {
  draft: "text-amber-300",
  accepted: "text-green-300",
  rejected: "text-red-300",
};

const statusLabels: Record<ArtifactStatus, string> = {
  draft: "Draft",
  accepted: "Accepted",
  rejected: "Rejected",
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

export default function ArtifactCard({ artifact, sessionId, onStatusChange }: ArtifactCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<ArtifactStatus | null>(null);

  const severity = getSeverity(artifact.type);
  const Icon = typeIcons[artifact.type] || FileCheck;
  const effectiveStatus: ArtifactStatus = optimisticStatus ?? artifact.status;

  const handleStatusChange = async (status: ArtifactStatus) => {
    const previous = optimisticStatus;
    setOptimisticStatus(status);
    setIsUpdating(true);
    setShowStatusDropdown(false);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/artifacts/${artifact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to update finding. Please try again.");
      }
      onStatusChange?.();
      setOptimisticStatus(null);
    } catch (err) {
      setOptimisticStatus(previous);
      toast.error({
        message: `Couldn't ${status === "accepted" ? "accept" : status === "rejected" ? "reject" : "update"} finding`,
        description: err instanceof Error ? err.message : "Network error — please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div
        className={`
          group relative rounded-lg border border-l-4 border-gray-700 bg-gray-900/50
          hover:-translate-y-px hover:shadow-lg hover:shadow-black/20
          transition-all duration-200 cursor-pointer
          ${severityBorderColors[severity]}
        `}
        onClick={() => setExpanded(true)}
      >
        <div className="p-3 sm:p-4">
          {/* Row 1: Severity badge + Type label */}
          <div className="flex items-center gap-2 pr-11 sm:pr-12">
            <span
              className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide font-mono ${severityBadgeBg[severity]}`}
            >
              <Icon size={12} className={severityIconColor[severity]} />
              {severityLabels[severity]}
            </span>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {typeLabels[artifact.type]}
            </span>
          </div>

          {/* Row 2: Title (primary scan target) */}
          <h3 className="mt-2 text-sm font-medium text-gray-100 line-clamp-2 leading-snug">
            {artifact.title || <span className="italic text-gray-500">Untitled finding</span>}
          </h3>

          {/* Row 3: Content preview (what is wrong / why it matters) */}
          {artifact.content && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-400 sm:text-sm sm:line-clamp-2">
              {artifact.content}
            </p>
          )}

          {/* Row 4: Status + Agent attribution (de-emphasized) */}
          <div className="mt-2.5 flex items-center gap-x-3 text-xs text-gray-500">
            <span
              className={`font-medium ${statusTextColors[effectiveStatus]} ${
                optimisticStatus ? "opacity-80" : ""
              }`}
              title={optimisticStatus ? "Saving..." : undefined}
            >
              {statusLabels[effectiveStatus]}
            </span>

            {artifact.version > 1 && (
              <span className="font-mono text-gray-600">v{artifact.version}</span>
            )}

            {artifact.contributors.length > 0 && (
              <span className="ml-auto truncate text-gray-600">
                {artifact.contributors
                  .map((c) => agentLabels[c] ?? c)
                  .join(", ")}
              </span>
            )}
          </div>
        </div>

        {/* Status Change Dropdown - secondary, always visible for draft */}
        {effectiveStatus === "draft" && (
          <div
            className="absolute right-2 top-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              disabled={isUpdating}
              className="flex min-h-9 min-w-9 items-center justify-center rounded-md bg-gray-800/80 border border-gray-700 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200 disabled:opacity-60 sm:min-h-10 sm:min-w-10"
              aria-label="Change finding status"
            >
              <ChevronDown size={14} />
            </button>

            {showStatusDropdown && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden z-10">
                <button
                  onClick={() => handleStatusChange("accepted")}
                  className="min-h-10 w-full px-3 py-2 text-left text-sm text-green-300 hover:bg-green-900/30 transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleStatusChange("rejected")}
                  className="min-h-10 w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-red-900/30 transition-colors"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <ArtifactDetail
          artifact={artifact}
          sessionId={sessionId}
          onClose={() => setExpanded(false)}
          onStatusChange={onStatusChange}
        />
      )}
    </>
  );
}
