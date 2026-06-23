"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, type ReactNode } from "react";

interface FormShellProps {
  title?: string;
  description?: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
  saving?: boolean;
  disabled?: boolean;
  saveLabel?: string;
  error?: string | null;
  footer?: ReactNode;
  children: ReactNode;
}

export default function FormShell({
  title,
  description,
  onSubmit,
  saving = false,
  disabled = false,
  saveLabel = "Save changes",
  error,
  footer,
  children,
}: FormShellProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-sm font-semibold text-gray-100">{title}</h3>}
          {description && <p className="text-sm text-gray-300">{description}</p>}
        </div>
      )}

      <div className="space-y-4">{children}</div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200"
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-gray-800 pt-4">
        <div className="text-xs text-gray-500">{footer}</div>
        <button
          type="submit"
          disabled={saving || disabled}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving…" : saveLabel}
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-200">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-gray-400">{hint}</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}

export function inputClass(extra = ""): string {
  return `w-full rounded-md border border-gray-700 bg-gray-950/60 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-400 min-h-11 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${extra}`;
}
