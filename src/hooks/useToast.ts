"use client";

import { useSyncExternalStore } from "react";

export type ToastType = "info" | "success" | "warning" | "error";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration: number;
  action?: { label: string; onClick: () => void };
}

type Listener = () => void;

const DEFAULT_DURATION = 4500;

class ToastStore {
  private toasts: Toast[] = [];
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.toasts;

  private emit() {
    for (const listener of this.listeners) listener();
  }

  push(input: Omit<Toast, "id" | "duration"> & { duration?: number }): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toast: Toast = {
      id,
      duration: input.duration ?? DEFAULT_DURATION,
      ...input,
    };
    this.toasts = [...this.toasts, toast];
    this.emit();
    if (toast.duration > 0) {
      setTimeout(() => this.dismiss(id), toast.duration);
    }
    return id;
  }

  dismiss(id: string) {
    const next = this.toasts.filter((t) => t.id !== id);
    if (next.length === this.toasts.length) return;
    this.toasts = next;
    this.emit();
  }

  clear() {
    if (this.toasts.length === 0) return;
    this.toasts = [];
    this.emit();
  }
}

const store = new ToastStore();
const emptySnapshot: Toast[] = [];

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => emptySnapshot,
  );
}

type ToastInput = string | (Omit<Toast, "id" | "duration" | "type"> & { duration?: number });

function normalize(input: ToastInput, type: ToastType): Omit<Toast, "id" | "duration"> & { duration?: number } {
  if (typeof input === "string") return { type, message: input };
  return { type, ...input };
}

export const toast = {
  info: (input: ToastInput) => store.push(normalize(input, "info")),
  success: (input: ToastInput) => store.push(normalize(input, "success")),
  warning: (input: ToastInput) => store.push(normalize(input, "warning")),
  error: (input: ToastInput) => store.push(normalize(input, "error")),
  dismiss: (id: string) => store.dismiss(id),
  clear: () => store.clear(),
};

export function useToast() {
  return toast;
}
