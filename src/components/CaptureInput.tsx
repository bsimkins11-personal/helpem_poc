"use client";

import { useState } from "react";
import { useLife } from "@/state/LifeStore";

type ClassifyResult = {
  type: "todo" | "habit" | "appointment";
  title: string;
  confidence: number;
  datetime?: string;
  frequency?: "daily" | "weekly";
  notes?: string;
};

export default function CaptureInput() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

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
    <div className="bg-white p-4 rounded-xl shadow">
      <input
        className="w-full border border-gray-300 p-3 rounded-lg text-gray-800 placeholder-gray-400"
        placeholder="Tell helpem what you need to do…"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === "Enter" && !loading && organize()}
      />

      <button
        className="mt-3 bg-brandGreen text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
        onClick={organize}
        disabled={loading || !text.trim()}
      >
        {loading ? "helpem is thinking…" : "Organize"}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">Type:</span>
              <span className="ml-2 font-medium text-brandGreen">{result.type}</span>
            </div>
            <span className="text-xs text-gray-400">
              {Math.round(result.confidence * 100)}% confident
            </span>
          </div>
          
          <p className="mt-2 font-medium text-gray-800">{result.title}</p>
          
          {result.datetime && (
            <p className="mt-1 text-sm text-gray-600">
              📅 {new Date(result.datetime).toLocaleString()}
            </p>
          )}
          
          {result.frequency && (
            <p className="mt-1 text-sm text-gray-600">
              🔄 {result.frequency}
            </p>
          )}

          <button
            className={`mt-3 w-full py-2 rounded-lg font-medium transition-colors ${
              saved
                ? "bg-green-500 text-white"
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
