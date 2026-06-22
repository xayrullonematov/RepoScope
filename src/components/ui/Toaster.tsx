"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { useToasts, toast as toastApi, type Toast } from "@/hooks/useToast";

const typeConfig: Record<Toast["type"], {
  icon: typeof Info;
  bg: string;
  border: string;
  text: string;
  iconColor: string;
}> = {
  info: {
    icon: Info,
    bg: "bg-blue-950/90",
    border: "border-blue-700/60",
    text: "text-blue-100",
    iconColor: "text-blue-400",
  },
  success: {
    icon: CheckCircle,
    bg: "bg-emerald-950/90",
    border: "border-emerald-700/60",
    text: "text-emerald-100",
    iconColor: "text-emerald-400",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-yellow-950/90",
    border: "border-yellow-700/60",
    text: "text-yellow-100",
    iconColor: "text-yellow-400",
  },
  error: {
    icon: XCircle,
    bg: "bg-red-950/90",
    border: "border-red-700/60",
    text: "text-red-100",
    iconColor: "text-red-400",
  },
};

export default function Toaster() {
  const toasts = useToasts();

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const config = typeConfig[t.type];
          const Icon = config.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 32, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur ${config.bg} ${config.border} ${config.text}`}
              role={t.type === "error" || t.type === "warning" ? "alert" : "status"}
            >
              <Icon size={18} className={`mt-0.5 flex-shrink-0 ${config.iconColor}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-snug">{t.message}</div>
                {t.description && (
                  <div className="mt-0.5 text-xs opacity-80 leading-snug">{t.description}</div>
                )}
              </div>
              {t.action && (
                <button
                  onClick={() => {
                    t.action?.onClick();
                    toastApi.dismiss(t.id);
                  }}
                  className="flex-shrink-0 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => toastApi.dismiss(t.id)}
                className="flex-shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
