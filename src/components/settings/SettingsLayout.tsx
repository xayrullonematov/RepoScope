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
  { id: "models", label: "Models", icon: Cpu, description: "Default model and per-stage overrides" },
  { id: "providers", label: "Providers", icon: Server, description: "LLM endpoint and API credentials" },
  { id: "budget", label: "Budget", icon: Coins, description: "Token budgets, temperature, response size" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Theme and density" },
  { id: "advanced", label: "Advanced", icon: Settings2, description: "Internal toggles and diagnostics" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function SettingsLayout() {
  const params = useSearchParams();
  const requested = params?.get("tab") ?? "models";
  const active: TabId = useMemo(() => {
    return (tabs.find((t) => t.id === requested)?.id ?? "models") as TabId;
  }, [requested]);

  const activeMeta = tabs.find((t) => t.id === active)!;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
      <header>
        <h1 className="text-2xl font-semibold text-gray-50">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Configure the LLM provider, models, budgets, and appearance for this workspace.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 gap-1 overflow-x-auto rounded-lg border border-gray-800 bg-gray-900/40 p-1 lg:w-56 lg:flex-col lg:overflow-visible lg:p-2"
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
                    ? "bg-blue-500/15 text-blue-200"
                    : "text-gray-300 hover:bg-gray-800/70 hover:text-white"
                }`}
              >
                <Icon size={16} className={isActive ? "text-blue-300" : "text-gray-400"} />
                <span className="font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        <section className="flex-1 min-w-0">
          <div className="rounded-xl border border-gray-800 bg-gray-900/40">
            <header className="border-b border-gray-800 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-100">{activeMeta.label}</h2>
              <p className="mt-0.5 text-xs text-gray-400">{activeMeta.description}</p>
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
