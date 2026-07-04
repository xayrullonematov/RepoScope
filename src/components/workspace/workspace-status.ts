import type { SessionState } from "@/types/domain";

type SessionRoundState = Pick<SessionState, "status" | "currentStage">;

/** A persisted stage is only live while the session itself is active. */
export function isRoundActive(session: SessionRoundState): boolean {
  return (
    session.status === "active" &&
    session.currentStage !== null &&
    session.currentStage !== "awaiting-intervention"
  );
}
