import { redirect } from "next/navigation";

export default async function SummaryRedirect({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  redirect(`/sessions/${sessionId}`);
}
