"use client";

import { useState, useRef, useEffect } from "react";
import { useLife } from "@/state/LifeStore";
import { Priority } from "@/types/todo";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: {
    type: "todo" | "habit" | "appointment";
    title: string;
    priority?: Priority;
    datetime?: string;
    frequency?: "daily" | "weekly";
  };
};

export default function ChatInput() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<Message["action"] | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<Priority>("medium");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { todos, habits, appointments, addTodo, addHabit, addAppointment } = useLife();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setPendingAction(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          userData: { todos, habits, appointments },
        }),
      });

      const data = await res.json();

      if (data.action === "add") {
        // Show confirmation for adding items
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I'll add this ${data.type}: "${data.title}"`,
          action: {
            type: data.type,
            title: data.title,
            priority: data.priority,
            datetime: data.datetime,
            frequency: data.frequency,
          },
        };
        setMessages(prev => [...prev, assistantMessage]);
        setPendingAction(assistantMessage.action);
        setSelectedPriority(data.priority || "medium");
      } else {
        // Regular response
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message || data.error || "I'm not sure how to help with that.",
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = () => {
    if (!pendingAction) return;

    const id = crypto.randomUUID();
    const now = new Date();

    switch (pendingAction.type) {
      case "todo":
        addTodo({
          id,
          title: pendingAction.title,
          priority: selectedPriority,
          dueDate: pendingAction.datetime ? new Date(pendingAction.datetime) : undefined,
          createdAt: now,
        });
        break;
      case "habit":
        addHabit({
          id,
          title: pendingAction.title,
          frequency: pendingAction.frequency || "daily",
          createdAt: now,
          completions: [],
        });
        break;
      case "appointment":
        addAppointment({
          id,
          title: pendingAction.title,
          datetime: pendingAction.datetime ? new Date(pendingAction.datetime) : now,
          createdAt: now,
        });
        break;
    }

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `✓ Added to your ${pendingAction.type}s!`,
    }]);
    setPendingAction(null);
  };

  const cancelAction = () => {
    setPendingAction(null);
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "No problem, cancelled.",
    }]);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-brandTextLight py-8">
            <p className="text-lg font-medium">Ask helpem anything</p>
            <p className="text-sm mt-2">
              "What do I have tomorrow?" • "Add a dentist appointment" • "Did I work out this week?"
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl ${
                msg.role === "user"
                  ? "bg-brandBlue text-white rounded-br-md"
                  : "bg-gray-100 text-brandText rounded-bl-md"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Priority selector for todo actions */}
        {pendingAction?.type === "todo" && (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-brandTextLight mb-2">Set priority:</p>
            <div className="flex gap-2 mb-3">
              {(["high", "medium", "low"] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPriority(p)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all capitalize
                    ${selectedPriority === p
                      ? p === "high" ? "bg-red-500 text-white" 
                        : p === "medium" ? "bg-amber-500 text-white" 
                        : "bg-green-500 text-white"
                      : "bg-gray-200 text-brandTextLight hover:bg-gray-300"}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmAction}
                className="flex-1 py-2 bg-brandGreen text-white rounded-lg font-medium hover:bg-green-600"
              >
                Confirm
              </button>
              <button
                onClick={cancelAction}
                className="py-2 px-4 bg-gray-200 text-brandTextLight rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Confirm for habits and appointments */}
        {pendingAction && pendingAction.type !== "todo" && (
          <div className="flex gap-2">
            <button
              onClick={confirmAction}
              className="flex-1 py-2 bg-brandGreen text-white rounded-lg font-medium hover:bg-green-600"
            >
              Confirm
            </button>
            <button
              onClick={cancelAction}
              className="py-2 px-4 bg-gray-200 text-brandTextLight rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-brandTextLight p-3 rounded-2xl rounded-bl-md">
              <span className="animate-pulse">helpem is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask or tell helpem anything..."
            className="flex-1 border border-gray-200 p-3 rounded-xl text-brandText placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-brandBlue/50"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-5 py-3 bg-gradient-to-r from-brandBlue to-brandGreen text-white rounded-xl
                       font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
