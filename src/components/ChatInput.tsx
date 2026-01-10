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
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const { todos, habits, appointments, addTodo, addHabit, addAppointment } = useLife();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
          // Auto-send after voice input
          setTimeout(() => {
            sendMessageWithText(transcript);
          }, 300);
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const speak = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined") return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Try to use a natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes("Samantha") || 
      v.name.includes("Google") || 
      v.name.includes("Natural")
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const sendMessageWithText = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
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
          message: text,
          userData: { todos, habits, appointments },
        }),
      });

      const data = await res.json();

      if (data.action === "add") {
        const responseText = `I'll add this ${data.type}: "${data.title}"`;
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: responseText,
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
        speak(responseText + ". Would you like me to confirm?");
      } else {
        const responseText = data.message || data.error || "I'm not sure how to help with that.";
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: responseText,
        };
        setMessages(prev => [...prev, assistantMessage]);
        speak(responseText);
      }
    } catch {
      const errorText = "Sorry, something went wrong. Please try again.";
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: errorText,
      }]);
      speak(errorText);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => sendMessageWithText(input);

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

    const confirmText = `Done! Added to your ${pendingAction.type}s.`;
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `✓ ${confirmText}`,
    }]);
    speak(confirmText);
    setPendingAction(null);
  };

  const cancelAction = () => {
    setPendingAction(null);
    const cancelText = "No problem, cancelled.";
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: "assistant",
      content: cancelText,
    }]);
    speak(cancelText);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
      {/* Header with voice toggle */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <span className="text-sm font-medium text-brandText">Chat with helpem</span>
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${
            voiceEnabled 
              ? "bg-brandGreenLight text-brandGreen" 
              : "bg-gray-100 text-brandTextLight"
          }`}
        >
          {voiceEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-brandTextLight py-8">
            <div className="text-4xl mb-3">🎙️</div>
            <p className="text-lg font-medium">Talk to helpem</p>
            <p className="text-sm mt-2">
              Tap the mic or type your message
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
          {/* Microphone button */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={loading}
            className={`p-3 rounded-xl transition-all ${
              isListening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-gray-100 text-brandTextLight hover:bg-gray-200"
            }`}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={isListening ? "Listening..." : "Type or speak..."}
            className="flex-1 border border-gray-200 p-3 rounded-xl text-brandText placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-brandBlue/50"
            disabled={loading || isListening}
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
