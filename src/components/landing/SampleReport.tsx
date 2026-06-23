import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
  ShieldCheck,
} from "lucide-react";

const sampleRisks = [
  "Data consistency during order writes",
  "Release sequencing across checkout and payments",
  "Operational ownership for the new boundary",
];

const sampleSteps = [
  "Extract checkout orchestration behind an internal API",
  "Run dual-write verification for two release cycles",
  "Gate migration on p95 latency and rollback drills",
];

export default function SampleReport() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div className="space-y-4">
          <div className="inline-flex min-h-9 items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 text-sm font-medium text-blue-200">
            <ClipboardCheck size={16} />
            Example decision report
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-gray-50 md:text-4xl">
            See the output before you start.
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-gray-300">
            The debate turns agent arguments into a decision report: the recommendation,
            confidence, risks, tradeoffs, and next steps your team can review.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl shadow-black/30">
          <div className="border-b border-gray-700 bg-gray-950/80 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Decision report
                </p>
                <h3 className="mt-1 text-xl font-semibold text-gray-50">
                  Migrate checkout with a service boundary first
                </h3>
              </div>
              <span className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-green-600/60 bg-green-500/15 px-2.5 text-sm font-medium text-green-200">
                <CheckCircle2 size={15} />
                82% confidence
              </span>
            </div>
          </div>

          <div className="grid gap-0 md:grid-cols-3">
            <div className="border-b border-gray-800 p-5 md:border-b-0 md:border-r">
              <div className="mb-3 flex items-center gap-2 text-green-200">
                <ShieldCheck size={18} />
                <h4 className="text-sm font-semibold">Recommendation</h4>
              </div>
              <p className="text-sm leading-relaxed text-gray-300">
                Create an internal checkout API, move orchestration first, and defer
                independent deployment until rollback and observability are proven.
              </p>
            </div>

            <div className="border-b border-gray-800 p-5 md:border-b-0 md:border-r">
              <div className="mb-3 flex items-center gap-2 text-amber-200">
                <AlertTriangle size={18} />
                <h4 className="text-sm font-semibold">Top risks</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-300">
                {sampleRisks.map((risk) => (
                  <li key={risk} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5">
              <div className="mb-3 flex items-center gap-2 text-blue-200">
                <ListChecks size={18} />
                <h4 className="text-sm font-semibold">Next steps</h4>
              </div>
              <ol className="space-y-2 text-sm text-gray-300">
                {sampleSteps.map((step, index) => (
                  <li key={step} className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-500/50 text-xs text-blue-200">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
