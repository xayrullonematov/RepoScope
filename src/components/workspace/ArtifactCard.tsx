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

const typeIcons: Record<ArtifactType, typeof FileCheck> = {
  decision: FileCheck,
  risk: AlertTriangle,
  assumption: Lightbulb,
  tradeoff: Scale,
  "open-question": HelpCircle,
  recommendation: ThumbsUp,
};

const typeBorderColors: Record<ArtifactType, string> = {
  decision: "border-l-green-500",
  risk: "border-l-red-500",
  assumption: "border-l-amber-500",
  tradeoff: "border-l-violet-500",
  "open-question": "border-l-cyan-500",
  recommendation: "border-l-blue-500",
};

const typeIconColors: Record<ArtifactType, string> = {
  decision: "text-green-400",
  risk: "text-red-400",
  assumption: "text-amber-400",
  tradeoff: "text-violet-400",
  "open-question": "text-cyan-400",
  recommendation: "text-blue-400",
};

const typeLabels: Record<ArtifactType, string> = {
  decision: "Finding",
  risk: "Risk",
  assumption: "Assumption",
  tradeoff: "Tradeoff",
  "open-question": "Question",
  recommendation: "Fix",
};

const statusTextColors: Record<ArtifactStatus, string> = {
  draft: "text-amber-400",
  accepted: "text-green-400",
  rejected: "text-red-400",
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

export default function ArtifactCard({ artifact, sessionId, onStatusChange }: ArtifactCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<ArtifactStatus | null>(null);

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
          group relative rounded-lg border border-l-4 border-[var(--border)] bg-[var(--surface)]
          hover:bg-[var(--surface-elevated)] hover:-translate-y-px hover:shadow-lg hover:shadow-black/20
          transition-all duration-200 cursor-pointer
          ${typeBorderColors[artifact.type]}
        `}
        onClick={() => setExpanded(true)}
      >
        <div className="p-3 sm:p-4">
          {/* Header */}
          <div className="flex items-start gap-2 pr-11 sm:gap-3 sm:pr-12">
            <div className={`shrink-0 mt-0.5 ${typeIconColors[artifact.type]}`}>
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-snug">
                {artifact.title}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                <span className={`font-medium ${statusTextColors[effectiveStatus]}`}>
                  {statusLabels[effectiveStatus]}
                </span>
                <span aria-hidden="true" className="text-[var(--border)]">/</span>
                <span className="text-[var(--text-muted)]">{typeLabels[artifact.type]}</span>
                {artifact.version > 1 && (
                  <>
                    <span aria-hidden="true" className="text-[var(--border)]">/</span>
                    <span className="font-mono text-[var(--text-muted)]">v{artifact.version}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Content Preview */}
          {artifact.content && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              {artifact.content}
            </p>
          )}

          {/* Contributors */}
          {artifact.contributors.length > 0 && (
            <p className="mt-2 truncate text-xs text-[var(--text-muted)]">
              {artifact.contributors.map((c) => agentLabels[c] ?? c).join(", ")}
            </p>
          )}
        </div>

        {/* Status dropdown for draft */}
        {effectiveStatus === "draft" && (
          <div className="absolute right-2 top-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              disabled={isUpdating}
              className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface)] disabled:opacity-60"
              aria-label="Change finding status"
            >
              <ChevronDown size={14} />
            </button>

            {showStatusDropdown && (
              <div className="absolute right-0 top-full mt-1 w-32 border border-[var(--border)] bg-[var(--surface-elevated)] rounded-lg shadow-xl overflow-hidden z-10">
                <button
                  onClick={() => handleStatusChange("accepted")}
                  className="min-h-10 w-full px-3 py-2 text-left text-sm text-green-400 hover:bg-green-500/10 transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleStatusChange("rejected")}
                  className="min-h-10 w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
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
