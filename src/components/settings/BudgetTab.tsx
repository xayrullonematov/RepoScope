"use client";

import { useState } from "react";
import { useConfig, type AppConfig } from "@/hooks/useConfig";
import { toast } from "@/hooks/useToast";
import FormShell, { Field, inputClass } from "./FormShell";
import SettingsLoadingState from "./LoadingState";

function formatNumber(value: number | null): string {
  if (value === null) return "";
  return String(value);
}

export default function BudgetTab() {
  const { config, isLoading, error, update } = useConfig();

  if (isLoading || !config) return <SettingsLoadingState />;
  if (error) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
        Failed to load configuration: {error.message}
      </div>
    );
  }

  return <BudgetForm initial={config} update={update} />;
}

interface BudgetFormProps {
  initial: AppConfig;
  update: (patch: Partial<AppConfig>) => Promise<AppConfig>;
}

function BudgetForm({ initial, update }: BudgetFormProps) {
  const [temperature, setTemperature] = useState(initial.temperature);
  const [maxTokens, setMaxTokens] = useState(initial.maxTokens);
  const [defaultBudget, setDefaultBudget] = useState<string>(formatNumber(initial.defaultTokenBudget));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  return (
    <FormShell
      title="Budget & sampling"
      description="These apply to new reviews and most AI calls. Per-review overrides can still be set when starting a review."
      saving={saving}
      error={saveError}
      footer="Lower temperature → more deterministic. Lower max tokens → cheaper but truncated responses."
      onSubmit={async (e) => {
        e.preventDefault();
        setSaveError(null);

        if (Number.isNaN(temperature) || temperature < 0 || temperature > 2) {
          setSaveError("Temperature must be between 0 and 2.");
          return;
        }
        if (!Number.isFinite(maxTokens) || maxTokens < 1 || maxTokens > 128000) {
          setSaveError("Max tokens must be between 1 and 128,000.");
          return;
        }

        let budgetValue: number | null = null;
        const trimmed = defaultBudget.trim();
        if (trimmed === "") {
          budgetValue = null;
        } else {
          const parsed = Number(trimmed);
          if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
            setSaveError("Default usage limit must be a positive integer or left blank.");
            return;
          }
          budgetValue = parsed;
        }

        setSaving(true);
        try {
          await update({
            temperature,
            maxTokens,
            defaultTokenBudget: budgetValue,
          });
          toast.success({ message: "Budget updated" });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Save failed";
          setSaveError(message);
          toast.error({ message: "Could not save budget", description: message });
        } finally {
          setSaving(false);
        }
      }}
    >
      <Field label="Temperature" htmlFor="budget-temperature" hint={`Currently ${temperature.toFixed(2)} — typical range 0.3–0.9.`}>
        <div className="flex items-center gap-3">
          <input
            id="budget-temperature"
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="flex-1 accent-blue-500"
          />
          <input
            type="number"
            min={0}
            max={2}
            step={0.05}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className={inputClass("w-20 text-right")}
          />
        </div>
      </Field>

      <Field label="Max tokens per response" htmlFor="budget-max-tokens" hint="Upper bound for any single LLM completion.">
        <input
          id="budget-max-tokens"
          type="number"
          min={1}
          max={128000}
          step={64}
          value={maxTokens}
          onChange={(e) => setMaxTokens(Number(e.target.value))}
          className={inputClass()}
        />
      </Field>

      <Field
        label="Default usage limit per review"
        htmlFor="budget-default"
        hint="Blank means no limit. New reviews get this when no explicit limit is provided."
      >
        <input
          id="budget-default"
          type="number"
          min={1}
          step={1000}
          inputMode="numeric"
          value={defaultBudget}
          onChange={(e) => setDefaultBudget(e.target.value)}
          placeholder="Unlimited"
          className={inputClass()}
        />
      </Field>
    </FormShell>
  );
}
