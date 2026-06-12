"use client";

import type { ArtifactState } from "@/types/domain";
import DecisionLog from "./DecisionLog";
import RiskRegister from "./RiskRegister";
import OpenQuestions from "./OpenQuestions";

interface EngineeringOutcomesPanelProps {
  artifacts: ArtifactState[];
}

export default function EngineeringOutcomesPanel({ artifacts }: EngineeringOutcomesPanelProps) {
  const decisions = artifacts.filter((a) => a.type === "decision" && a.status === "accepted");
  const risks = artifacts.filter((a) => a.type === "risk");
  const openQuestions = artifacts.filter((a) => a.type === "open-question");

  if (decisions.length === 0 && risks.length === 0 && openQuestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
        Engineering Outcomes
      </h2>
      {decisions.length > 0 && <DecisionLog decisions={decisions} />}
      {risks.length > 0 && <RiskRegister risks={risks} />}
      {openQuestions.length > 0 && <OpenQuestions questions={openQuestions} />}
    </div>
  );
}
