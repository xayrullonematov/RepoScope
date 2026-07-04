"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  /** Side to anchor the sheet from at >= md. On <md it is always bottom-anchored. */
  side?: "bottom" | "right";
}

export default function Sheet({
  open,
  onOpenChange,
  title,
  children,
  side = "bottom",
}: SheetProps) {
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    // Defer focus until after the dialog mounts
    queueMicrotask(() => dialogRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onOpenChange]);

  if (typeof window === "undefined") return null;

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onOpenChange(false);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div role="presentation" className="fixed inset-0 z-[80]">
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "Dialog"}
            tabIndex={-1}
            initial={
              side === "right"
                ? { x: "100%" }
                : { y: "100%" }
            }
            animate={
              side === "right"
                ? { x: 0 }
                : { y: 0 }
            }
            exit={
              side === "right"
                ? { x: "100%" }
                : { y: "100%" }
            }
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            drag={side === "bottom" ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={onDragEnd}
            className={
              side === "right"
                ? "absolute right-0 top-0 h-full w-full max-w-md bg-gray-900 border-l border-gray-800 shadow-2xl flex flex-col"
                : "absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl bg-gray-900 border-t border-gray-800 shadow-2xl flex flex-col"
            }
          >
            {side === "bottom" && (
              <div className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
                <div className="h-1 w-10 rounded-full bg-gray-700" />
              </div>
            )}
            {(title || side === "right") && (
              <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-100">{title}</h2>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
