import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { enqueueReviewJob, ensureReviewJobSchema, getLatestReviewJob, recoverExpiredJobs } from "@/lib/review-job-queue";
import { eventStore } from "@/lib/event-store";

async function createSession(id: string) {
  await prisma.session.create({
    data: { id, problemDescription: "Review this repository", status: "active" },
  });
}

describe("review job queue", () => {
  it("deduplicates active jobs per session", async () => {
    await ensureReviewJobSchema();
    await createSession("queue-dedupe");

    const [first, second] = await Promise.all([
      enqueueReviewJob("queue-dedupe"),
      enqueueReviewJob("queue-dedupe"),
    ]);

    expect(first.id).toBe(second.id);
    expect(await prisma.reviewJob.count({ where: { sessionId: "queue-dedupe" } })).toBe(1);
    expect((await getLatestReviewJob("queue-dedupe"))?.status).toBe("queued");
  });

  it("requeues an expired running job and records the interrupted round", async () => {
    await ensureReviewJobSchema();
    await createSession("queue-recover");
    const job = await enqueueReviewJob("queue-recover");
    await prisma.session.update({
      where: { id: "queue-recover" },
      data: { currentRound: 1, currentStage: "critique", lockedBy: "dead-worker", lockedAt: new Date(0) },
    });
    await prisma.reviewJob.update({
      where: { id: job.id },
      data: { status: "running", attempts: 1, leaseOwner: "dead-worker", leaseExpiresAt: new Date(0) },
    });

    await recoverExpiredJobs();

    const recovered = await prisma.reviewJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(recovered.status).toBe("queued");
    expect(recovered.leaseOwner).toBeNull();
    const session = await prisma.session.findUniqueOrThrow({ where: { id: "queue-recover" } });
    expect(session.lockedBy).toBeNull();
    const events = await eventStore.getSessionEvents("queue-recover");
    expect(events.some((event) => event.type === "round-completed" && event.content.includes("worker_restart"))).toBe(true);
  });

  it("fails an expired job after its retry allowance is exhausted", async () => {
    await ensureReviewJobSchema();
    await createSession("queue-failed");
    const job = await enqueueReviewJob("queue-failed");
    await prisma.reviewJob.update({
      where: { id: job.id },
      data: { status: "running", attempts: 2, leaseOwner: "dead-worker", leaseExpiresAt: new Date(0) },
    });

    await recoverExpiredJobs();

    const failed = await prisma.reviewJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(failed.status).toBe("failed");
    expect(failed.activeKey).toBeNull();
    expect((await prisma.session.findUniqueOrThrow({ where: { id: "queue-failed" } })).status).toBe("paused");
  });
});
