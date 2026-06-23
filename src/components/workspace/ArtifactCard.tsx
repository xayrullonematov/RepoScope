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

const statusColors: Record<ArtifactStatus, string> = {
  draft: "bg-yellow-900/50 text-yellow-400 border-yellow-700",
  accepted: "bg-green-900/50 text-green-400 border-green-700",
  rejected: "bg-red-900/50 text-red-400 border-red-700",
};

const agentDotColors: Record<AgentType, string> = {
  "senior-engineer": "bg-blue-500",
  "security-engineer": "bg-red-500",
  "performance-engineer": "bg-amber-500",
  "product-engineer": "bg-violet-500",
};

export default function ArtifactCard({ artifact, sessionId, onStatusChange }: ArtifactCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  // Optimistic local override — falls back to server-provided status on next refresh.
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
        throw new Error(body.error ?? `Server returned ${res.status}`);
      }
      onStatusChange?.();
      // Server is now the source of truth — drop the override on next render cycle.
      setOptimisticStatus(null);
    } catch (err) {
      setOptimisticStatus(previous);
      toast.error({
        message: `Couldn't ${status === "accepted" ? "accept" : status === "rejected" ? "reject" : "update"} artifact`,
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
          group relative border-l-4 rounded-xl bg-gray-900/50 border border-gray-700
          hover:-translate-y-px hover:shadow-lg hover:shadow-black/20
          transition-all duration-200 cursor-pointer
          ${typeBorderColors[artifact.type]}
        `}
        onClick={() => setExpanded(true)}
      >
        <div className="p-4">
          {/* Header: Icon + Title */}
          <div className="flex items-start gap-3">
            <div className={`shrink-0 mt-0.5 ${typeIconColors[artifact.type]}`}>
              <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-100 line-clamp-2 leading-snug">
                {artifact.title}
              </h3>
            </div>
          </div>

          {/* Status and type */}
          <div className="mt-3 flex flex-wrap items-center gap-2 pr-12">
            <span
              className={`px-2 py-1 text-sm rounded-md border ${statusColors[effectiveStatus]} ${
                optimisticStatus ? "opacity-80" : ""
              }`}
              title={optimisticStatus ? "Saving…" : undefined}
            >
              {effectiveStatus}
            </span>
            <span className="px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300">
              {artifact.type}
            </span>
          </div>

          {/* Content Preview */}
          {artifact.content && (
            <p className="mt-3 text-sm text-gray-300 line-clamp-2 leading-relaxed">
              {artifact.content}
            </p>
          )}

          {/* Meta: Contributors + Version */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {artifact.contributors.map((contributor) => (
                <div
                  key={contributor}
                  className={`w-2.5 h-2.5 rounded-full ${agentDotColors[contributor] || "bg-gray-500"}`}
                  title={contributor}
                />
              ))}
            </div>
            {artifact.version > 1 && (
              <span className="text-[10px] text-gray-500 font-mono">
                v{artifact.version}
              </span>
            )}
          </div>
        </div>

        {/* Status Change Dropdown - always visible for draft artifacts */}
        {effectiveStatus === "draft" && (
          <div
            className="absolute right-2 top-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              disabled={isUpdating}
              className="flex min-h-10 min-w-10 items-center justify-center rounded-lg bg-gray-800 border border-gray-600 text-gray-200 transition-colors hover:bg-gray-700 disabled:opacity-60"
              aria-label="Change artifact status"
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
