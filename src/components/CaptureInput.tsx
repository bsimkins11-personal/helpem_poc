"use client";

import { useState } from "react";

export default function CaptureInput() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const organize = async () => {
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: text }),
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <input
        className="w-full border p-2 rounded"
        placeholder="Tell helpem what you need to do…"
        value={text}
        onChange={e => setText(e.target.value)}
      />

      <button
        className="mt-2 bg-brandGreen text-white px-4 py-2 rounded"
        onClick={organize}
        disabled={loading}
      >
        {loading ? "helpem is thinking…" : "Organize"}
      </button>

      {result && (
        <div className="mt-4 text-sm">
          <p>
            <strong>Type:</strong> {result.type}
          </p>
          <p>
            <strong>Title:</strong> {result.title}
          </p>
          {result.frequency && (
            <p>
              <strong>Frequency:</strong> {result.frequency}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
