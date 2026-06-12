"use client";

import { useState } from "react";

interface ConstraintItem {
  text: string;
  category: string;
}

interface ConstraintInputProps {
  constraints: ConstraintItem[];
  onAdd: (constraint: ConstraintItem) => void;
  onRemove: (index: number) => void;
}

const CATEGORIES = ["technical", "business", "timeline", "resource"] as const;

export default function ConstraintInput({ constraints, onAdd, onRemove }: ConstraintInputProps) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<string>("technical");

  const handleAdd = () => {
    if (!text.trim()) return;
    onAdd({ text: text.trim(), category });
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        Constraints (optional)
      </label>

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a constraint..."
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!text.trim()}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-100 rounded-lg text-sm transition-colors"
        >
          Add
        </button>
      </div>

      {constraints.length > 0 && (
        <ul className="space-y-1.5">
          {constraints.map((c, i) => (
            <li
              key={i}
              className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <CategoryBadge category={c.category} />
                <span className="text-sm text-gray-200">{c.text}</span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-gray-500 hover:text-red-400 text-sm transition-colors"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    technical: "bg-blue-900/50 text-blue-400 border-blue-700",
    business: "bg-purple-900/50 text-purple-400 border-purple-700",
    timeline: "bg-yellow-900/50 text-yellow-400 border-yellow-700",
    resource: "bg-green-900/50 text-green-400 border-green-700",
  };

  return (
    <span className={`px-1.5 py-0.5 text-xs rounded border ${colors[category] || "bg-gray-700 text-gray-400 border-gray-600"}`}>
      {category}
    </span>
  );
}
