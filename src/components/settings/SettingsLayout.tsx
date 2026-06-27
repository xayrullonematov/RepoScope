"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Cpu, Server, Coins, Palette, Settings2 } from "lucide-react";
import { useMemo } from "react";
import ModelsTab from "./ModelsTab";
import ProvidersTab from "./ProvidersTab";
import BudgetTab from "./BudgetTab";
import AppearanceTab from "./AppearanceTab";
import AdvancedTab from "./AdvancedTab";

const tabs = [
  { id: "providers", label: "Providers", icon: Server, description: "LLM endpoint and API credentials" },
  { id: "budget", label: "Usage limits", icon: Coins, description: "Usage limits, temperature, response size" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Theme and display preferences" },
  { id: "models", label: "Models", icon: Cpu, description: "Default model and per-step overrides" },
  { id: "advanced", label: "Advanced", icon: Settings2, description: "Internal toggles and diagnostics" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function SettingsLayout() {
  const params = useSearchParams();
  const requested = params?.get("tab") ?? "providers";
  const active: TabId = useMemo(() => {
    return (tabs.find((t) => t.id === requested)?.id ?? "providers") as TabId;
  }, [requested]);

  const activeMeta = tabs.find((t) => t.id === active)!;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
      <header>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Configure the AI provider, models, usage limits, and appearance.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 gap-1 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 lg:w-56 lg:flex-col lg:overflow-visible lg:p-2"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/settings?tab=${tab.id}`}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-[var(--violet-soft-bg)] text-violet-200"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon size={16} className={isActive ? "text-violet-400" : "text-[var(--text-muted)]"} />
                <span className="font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        <section className="flex-1 min-w-0">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <header className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">{activeMeta.label}</h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">{activeMeta.description}</p>
            </header>
            <div className="px-5 py-5">
              {active === "models" && <ModelsTab />}
              {active === "providers" && <ProvidersTab />}
              {active === "budget" && <BudgetTab />}
              {active === "appearance" && <AppearanceTab />}
              {active === "advanced" && <AdvancedTab />}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
