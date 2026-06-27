import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--brand-violet)]/40 bg-[var(--violet-soft-bg)] text-violet-300">
          <Compass size={26} />
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Page not found</h1>
        <p className="mt-3 text-[var(--text-secondary)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-[var(--brand-violet)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--violet-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-glow)]"
          >
            Back to home
          </Link>
          <Link
            href="/sessions"
            className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--text-muted)] hover:bg-[var(--surface-elevated)]"
          >
            View reviews
          </Link>
        </div>
      </div>
    </div>
  );
}
