"use client";

import { useState } from "react";
import { useLife } from "@/state/LifeStore";
import { Priority } from "@/types/todo";

type ClassifyResult = {
  type: "todo" | "habit" | "appointment";
  title: string;
  confidence: number;
  datetime?: string;
  frequency?: "daily" | "weekly";
  priority?: Priority;
  notes?: string;
};

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: "high", label: "High", color: "bg-red-500 hover:bg-red-600" },
  { value: "medium", label: "Medium", color: "bg-amber-500 hover:bg-amber-600" },
  { value: "low", label: "Low", color: "bg-green-500 hover:bg-green-600" },
];

export default function CaptureInput() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<Priority>("medium");

  const { addTodo, addHabit, addAppointment } = useLife();

  const organize = async () => {
    setLoading(true);
    setResult(null);
    setSaved(false);

    const res = await fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: text }),
    });

    const data = await res.json();
    setResult(data);
    setSelectedPriority(data.priority || "medium");
    setLoading(false);
  };

  const saveItem = () => {
    if (!result) return;

    const id = crypto.randomUUID();
    const now = new Date();

    switch (result.type) {
      case "todo":
        addTodo({
          id,
          title: result.title,
          priority: selectedPriority,
          dueDate: result.datetime ? new Date(result.datetime) : undefined,
          createdAt: now,
        });
        break;

      case "habit":
        addHabit({
          id,
          title: result.title,
          frequency: result.frequency || "daily",
          createdAt: now,
          completions: [],
        });
        break;

      case "appointment":
        addAppointment({
          id,
          title: result.title,
          datetime: result.datetime ? new Date(result.datetime) : now,
          createdAt: now,
        });
        break;
    }

    setSaved(true);
    setText("");
    setTimeout(() => {
      setResult(null);
      setSaved(false);
    }, 2000);
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <input
        className="w-full border border-gray-200 p-3 rounded-xl text-brandText placeholder-gray-400 
                   focus:outline-none focus:ring-2 focus:ring-brandBlue/50 focus:border-brandBlue"
        placeholder="Tell helpem what you need to do…"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === "Enter" && !loading && organize()}
      />

      <button
        className="mt-3 bg-gradient-to-r from-brandBlue to-brandGreen text-white px-5 py-2.5 rounded-xl 
                   font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        onClick={organize}
        disabled={loading || !text.trim()}
      >
        {loading ? "helpem is thinking…" : "Organize"}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm
                ${result.type === 'todo' ? 'bg-brandBlue' : 
                  result.type === 'habit' ? 'bg-brandGreen' : 'bg-violet-500'}`}>
                {result.type === 'todo' ? '✓' : result.type === 'habit' ? '↻' : '◷'}
              </span>
              <span className="font-medium text-brandText capitalize">{result.type}</span>
            </div>
            <span className="text-xs text-brandTextLight">
              {Math.round(result.confidence * 100)}% confident
            </span>
          </div>
          
          <p className="mt-3 font-medium text-brandText">{result.title}</p>
          
          {/* Priority selector for todos */}
          {result.type === "todo" && (
            <div className="mt-4">
              <p className="text-sm text-brandTextLight mb-2">Set priority:</p>
              <div className="flex gap-2">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedPriority(option.value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
                      ${selectedPriority === option.value 
                        ? `${option.color} text-white` 
                        : 'bg-gray-100 text-brandTextLight hover:bg-gray-200'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {result.datetime && (
            <p className="mt-3 text-sm text-brandTextLight flex items-center gap-2">
              <span>📅</span>
              {new Date(result.datetime).toLocaleString()}
            </p>
          )}
          
          {result.frequency && (
            <p className="mt-2 text-sm text-brandTextLight flex items-center gap-2">
              <span>🔄</span>
              {result.frequency}
            </p>
          )}

          <button
            className={`mt-4 w-full py-2.5 rounded-xl font-medium transition-colors ${
              saved
                ? "bg-brandGreen text-white"
                : "bg-brandBlue text-white hover:bg-blue-600"
            }`}
            onClick={saveItem}
            disabled={saved}
          >
            {saved ? "✓ Saved!" : `Add to ${result.type}s`}
          </button>
        </div>
      )}
    </div>
  );
}
