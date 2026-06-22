"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from "lucide-react";
import type { PersistedEvent, SessionState } from "@/types/domain";

interface ReplayResponse {
  events: PersistedEvent[];
  totalSteps: number;
  currentState?: SessionState;
}

interface ReplayScrubberProps {
  sessionId: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const eventLabel: Record<string, string> = {
  "session-created": "Session created",
  "round-started": "Round started",
  "round-completed": "Round completed",
  proposal: "Proposal",
  critique: "Critique",
  revision: "Revision",
  consensus: "Consensus",
  "consensus-update": "Consensus update",
  "user-intervention": "User intervention",
  "clarification-request": "Clarification request",
  "artifact-created": "Artifact created",
  "artifact-updated": "Artifact updated",
  "artifact-status-changed": "Artifact status changed",
  "stage-progress": "Stage progress",
};

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return ts;
  }
}

export default function ReplayScrubber({ sessionId }: ReplayScrubberProps) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const { data, isLoading, error } = useSWR<ReplayResponse>(
    `/api/sessions/${sessionId}/replay?step=${step}`,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  const totalSteps = data?.totalSteps ?? 0;
  const events = useMemo(() => data?.events ?? [], [data]);
  const state = data?.currentState;

  // Clamp at read time — `step` is the user's intent, `effectiveStep` is what we
  // render. This avoids the "setState in effect" lint rule and keeps clamp
  // logic local to the read path.
  const effectiveStep = Math.min(step, totalSteps);

  // Playback ticker — guards "stop at end" inside the interval callback so we
  // never need a synchronous setState in an effect body.
  useEffect(() => {
    if (!playing || totalSteps === 0) return;
    const id = window.setInterval(() => {
      setStep((s) => {
        const next = s + 1;
        if (next >= totalSteps) {
          setPlaying(false);
          return totalSteps;
        }
        return next;
      });
    }, 600);
    return () => window.clearInterval(id);
  }, [playing, totalSteps]);

  const currentEvent = effectiveStep > 0 ? events[effectiveStep - 1] : null;

  if (error) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
        Couldn&apos;t load replay data.
      </div>
    );
  }

  if (isLoading && !data) {
    return <div className="text-xs text-gray-400">Loading replay…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
        <div className="mb-3 flex items-center justify-between gap-3 text-xs">
          <span className="text-gray-400">
            Step <span className="font-mono text-gray-200">{effectiveStep}</span> / {totalSteps}
          </span>
          {currentEvent && (
            <span className="text-gray-500">
              {eventLabel[currentEvent.type] ?? currentEvent.type} · {formatTimestamp(currentEvent.timestamp)}
            </span>
          )}
        </div>

        <input
          type="range"
          min={0}
          max={totalSteps}
          step={1}
          value={effectiveStep}
          onChange={(e) => {
            setPlaying(false);
            setStep(Number(e.target.value));
          }}
          className="w-full accent-blue-500"
          aria-label="Replay scrubber"
        />

        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => { setPlaying(false); setStep(0); }}
            disabled={effectiveStep === 0}
            className="rounded-md border border-gray-700 p-1.5 text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-40"
            aria-label="Start"
          >
            <SkipBack size={14} />
          </button>
          <button
            type="button"
            onClick={() => { setPlaying(false); setStep((s) => Math.max(0, Math.min(s, totalSteps) - 1)); }}
            disabled={effectiveStep === 0}
            className="rounded-md border border-gray-700 p-1.5 text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-40"
            aria-label="Previous step"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            disabled={totalSteps === 0 || effectiveStep >= totalSteps}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
          >
            {playing ? <Pause size={12} /> : <Play size={12} />}
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => { setPlaying(false); setStep((s) => Math.min(totalSteps, s + 1)); }}
            disabled={effectiveStep >= totalSteps}
            className="rounded-md border border-gray-700 p-1.5 text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-40"
            aria-label="Next step"
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            onClick={() => { setPlaying(false); setStep(totalSteps); }}
            disabled={effectiveStep >= totalSteps}
            className="rounded-md border border-gray-700 p-1.5 text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-40"
            aria-label="End"
          >
            <SkipForward size={14} />
          </button>
        </div>
      </div>

      {state && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Round" value={state.currentRound} />
          <Stat label="Stage" value={state.currentStage ?? "—"} />
          <Stat label="Artifacts" value={state.artifacts.length} />
        </div>
      )}

      {currentEvent && (
        <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-500">Current event</p>
          <pre className="mt-1 max-h-64 overflow-auto text-[11px] leading-relaxed text-gray-300">
{tryFormat(currentEvent.content)}
          </pre>
        </div>
      )}
    </div>
  );
}

function tryFormat(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-gray-800 bg-gray-950/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-100">{String(value)}</p>
    </div>
  );
}
