export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startReviewWorker } = await import("@/lib/review-job-queue");
  await startReviewWorker();
}
