"use client";

import type { ReactNode } from "react";

interface SectionCardProps {
  children: ReactNode;
  className?: string;
}

export default function SectionCard({ children, className = "" }: SectionCardProps) {
  return (
    <div className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}
