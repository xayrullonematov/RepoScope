import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { POST } from "./route";

describe("POST /api/analyze", () => {
  it("queues a review and returns polling URLs without blocking", async () => {
    const response = await POST(new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl: "https://github.com/vercel/next.js", reviewType: "full" }),
    }));
    const body = await response.json() as {
      sessionId: string;
      jobId: string;
      status: string;
      statusUrl: string;
      reportUrl: string;
    };

    expect(response.status).toBe(202);
    expect(body.status).toBe("queued");
    expect(body.statusUrl).toBe(`/api/sessions/${body.sessionId}`);
    expect(body.reportUrl).toBe(`/sessions/${body.sessionId}`);
    const job = await prisma.reviewJob.findUnique({ where: { id: body.jobId } });
    expect(job?.sessionId).toBe(body.sessionId);
    expect(job?.activeKey).toBe(body.sessionId);
  });
});
