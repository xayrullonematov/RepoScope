import cuid from "cuid";
import { prisma } from "@/lib/db";
import { eventStore } from "@/lib/event-store";
import { roundOrchestrator } from "@/lib/round-orchestrator";
import { sessionLock } from "@/lib/session-lock";

const POLL_INTERVAL_MS = 1_000;
const LEASE_MS = 6 * 60 * 1_000;
const HEARTBEAT_MS = 30_000;

let schemaPromise: Promise<void> | null = null;

export type ReviewJobState = {
  id: string;
  status: string;
  kind: string;
  attempts: number;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

export function ensureReviewJobSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ReviewJob" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "sessionId" TEXT NOT NULL,
          "kind" TEXT NOT NULL DEFAULT 'initial',
          "instruction" TEXT,
          "status" TEXT NOT NULL DEFAULT 'queued',
          "activeKey" TEXT,
          "attempts" INTEGER NOT NULL DEFAULT 0,
          "maxAttempts" INTEGER NOT NULL DEFAULT 2,
          "leaseOwner" TEXT,
          "leaseExpiresAt" DATETIME,
          "error" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "startedAt" DATETIME,
          "completedAt" DATETIME,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ReviewJob_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "ReviewJob_activeKey_key" ON "ReviewJob"("activeKey")`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "ReviewJob_status_createdAt_idx" ON "ReviewJob"("status", "createdAt")`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "ReviewJob_sessionId_createdAt_idx" ON "ReviewJob"("sessionId", "createdAt")`,
      );
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export async function enqueueReviewJob(
  sessionId: string,
  options: { kind?: "initial" | "refinement"; instruction?: string } = {},
) {
  await ensureReviewJobSchema();
  const existing = await prisma.reviewJob.findUnique({ where: { activeKey: sessionId } });
  if (existing) return existing;

  try {
    return await prisma.reviewJob.create({
      data: {
        sessionId,
        kind: options.kind ?? "initial",
        instruction: options.instruction,
        activeKey: sessionId,
      },
    });
  } catch (error) {
    const raced = await prisma.reviewJob.findUnique({ where: { activeKey: sessionId } });
    if (raced) return raced;
    throw error;
  }
}

export async function getLatestReviewJob(sessionId: string): Promise<ReviewJobState | null> {
  await ensureReviewJobSchema();
  return prisma.reviewJob.findFirst({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      kind: true,
      attempts: true,
      error: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
    },
  });
}

export async function recoverExpiredJobs() {
  const expired = await prisma.reviewJob.findMany({
    where: { status: "running", leaseExpiresAt: { lt: new Date() } },
  });
  for (const job of expired) {
    await sessionLock.forceRelease(job.sessionId);
    const session = await prisma.session.findUnique({ where: { id: job.sessionId } });
    if (session?.currentRound && session.currentStage && session.currentStage !== "awaiting-intervention") {
      await eventStore.appendEvent({
        sessionId: job.sessionId,
        type: "round-completed",
        round: session.currentRound,
        stage: null,
        content: { round: session.currentRound, partial: true, reason: "worker_restart" },
      });
    }
    if (job.attempts < job.maxAttempts) {
      await prisma.reviewJob.update({
        where: { id: job.id },
        data: { status: "queued", leaseOwner: null, leaseExpiresAt: null, error: "Worker restarted; retrying review." },
      });
    } else {
      await prisma.reviewJob.update({
        where: { id: job.id },
        data: { status: "failed", activeKey: null, leaseOwner: null, leaseExpiresAt: null, completedAt: new Date(), error: "Review interrupted twice. Retry when ready." },
      });
      await prisma.session.update({ where: { id: job.sessionId }, data: { status: "paused" } });
    }
  }
}

async function claimNextJob(workerId: string) {
  const candidate = await prisma.reviewJob.findFirst({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
  });
  if (!candidate) return null;
  const now = new Date();
  const claimed = await prisma.reviewJob.updateMany({
    where: { id: candidate.id, status: "queued" },
    data: {
      status: "running",
      leaseOwner: workerId,
      leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      startedAt: candidate.startedAt ?? now,
      attempts: { increment: 1 },
      error: null,
    },
  });
  if (claimed.count === 0) return null;
  return prisma.reviewJob.findUniqueOrThrow({ where: { id: candidate.id } });
}

async function runJob(workerId: string, job: Awaited<ReturnType<typeof claimNextJob>>) {
  if (!job) return;
  const heartbeat = setInterval(() => {
    const now = new Date();
    void Promise.all([
      prisma.reviewJob.updateMany({
        where: { id: job.id, status: "running", leaseOwner: workerId },
        data: { leaseExpiresAt: new Date(now.getTime() + LEASE_MS) },
      }),
      prisma.session.updateMany({
        where: { id: job.sessionId, lockedBy: { not: null } },
        data: { lockedAt: now },
      }),
    ]);
  }, HEARTBEAT_MS);

  try {
    await prisma.session.update({ where: { id: job.sessionId }, data: { status: "active" } });
    await roundOrchestrator.startRound(job.sessionId);
    await prisma.reviewJob.update({
      where: { id: job.id },
      data: { status: "completed", activeKey: null, leaseOwner: null, leaseExpiresAt: null, completedAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review failed";
    const retry = job.attempts < job.maxAttempts;
    await prisma.reviewJob.update({
      where: { id: job.id },
      data: retry
        ? { status: "queued", leaseOwner: null, leaseExpiresAt: null, error: message }
        : { status: "failed", activeKey: null, leaseOwner: null, leaseExpiresAt: null, completedAt: new Date(), error: message },
    });
    if (!retry) {
      await prisma.session.update({ where: { id: job.sessionId }, data: { status: "paused" } });
    }
  } finally {
    clearInterval(heartbeat);
  }
}

export async function startReviewWorker() {
  await ensureReviewJobSchema();
  await recoverExpiredJobs();
  const globalWorker = globalThis as typeof globalThis & { __reviewWorkerStarted?: boolean };
  if (globalWorker.__reviewWorkerStarted) return;
  globalWorker.__reviewWorkerStarted = true;
  const workerId = `review-worker-${cuid()}`;

  const loop = async () => {
    while (globalWorker.__reviewWorkerStarted) {
      const job = await claimNextJob(workerId).catch((error) => {
        console.error("[review-worker] Claim failed:", error);
        return null;
      });
      if (job) await runJob(workerId, job);
      else await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  };
  void loop();
}
