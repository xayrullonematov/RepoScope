"use client";

import type { ArtifactState } from "@/types/domain";

interface OpenQuestionsProps {
  questions: ArtifactState[];
}

export default function OpenQuestions({ questions }: OpenQuestionsProps) {
  return (
    <div>
      <h3 className="text-xs font-medium text-purple-400 mb-2">Open Questions ({questions.length})</h3>
      <div className="space-y-2">
        {questions.map((q) => (
          <div
            key={q.id}
            className="p-3 border border-purple-800/50 rounded-lg bg-purple-900/10"
          >
            <h4 className="text-sm font-medium text-gray-200">{q.title}</h4>
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{q.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
