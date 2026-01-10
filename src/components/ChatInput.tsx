"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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

// Limit message history to prevent memory bloat
const MAX_MESSAGES = 50;
const SESSION_STORAGE_KEY = "helpem_chat_history";

// Load messages from session storage
function loadSessionMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save messages to session storage
function saveSessionMessages(messages: Message[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Storage full or unavailable - silently fail
  }
}

export default function ChatInput() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => loadSessionMessages());
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<Message["action"] | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<Priority>("medium");
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastInputWasVoice, setLastInputWasVoice] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const { todos, habits, appointments, addTodo, addHabit, addAppointment, updateTodoPriority } = useLife();

  // Scroll to bottom and save to session when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    saveSessionMessages(messages);
  }, [messages]);

  // Memoized speak function
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === "undefined") return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes("Samantha") || 
      v.name.includes("Google") || 
      v.name.includes("Natural")
    );
    if (preferredVoice) utterance.voice = preferredVoice;
    
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  // Add message with history limit
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const updated = [...prev, message];
      return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
    });
  }, []);

  // Memoized send function
  const sendMessageWithText = useCallback(async (text: string, isVoiceInput: boolean = false) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    addMessage(userMessage);
    setInput("");
    setLoading(true);
    setPendingAction(null);
    setLastInputWasVoice(isVoiceInput);
    
    const shouldSpeak = isVoiceInput && voiceEnabled;

    try {
      // Build conversation history for context (last 10 messages)
      const recentMessages = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: recentMessages,
          userData: { todos, habits, appointments },
          currentDateTime: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("API request failed");

      const data = await res.json();

      if (data.action === "add") {
        const displayType = data.type === "habit" ? "routine" : data.type;
        const internalType = data.type === "routine" ? "habit" : data.type;
        const responseText = `I'll add this ${displayType}: "${data.title}"`;
        
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: responseText,
          action: {
            type: internalType as "todo" | "habit" | "appointment",
            title: data.title,
            priority: data.priority,
            datetime: data.datetime,
            frequency: data.frequency,
          },
        };
        
        addMessage(assistantMessage);
        setPendingAction(assistantMessage.action);
        setSelectedPriority(data.priority || "medium");
        if (shouldSpeak) speak(responseText + ". Would you like me to confirm?");
        
      } else if (data.action === "update_priority") {
        const todoToUpdate = todos.find(t => 
          t.title.toLowerCase() === data.todoTitle?.toLowerCase()
        );
        
        if (todoToUpdate) {
          updateTodoPriority(todoToUpdate.id, data.newPriority);
          const responseText = `Updated "${data.todoTitle}" to ${data.newPriority} priority.`;
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: `✓ ${responseText}`,
          });
          if (shouldSpeak) speak(responseText);
        } else {
          const responseText = `I couldn't find a todo called "${data.todoTitle}".`;
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: responseText,
          });
          if (shouldSpeak) speak(responseText);
        }
        
      } else {
        const responseText = data.message || data.error || "I'm not sure how to help with that.";
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: responseText,
        });
        if (shouldSpeak) speak(responseText);
      }
    } catch {
      const errorText = "Sorry, something went wrong. Please try again.";
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: errorText,
      });
      if (shouldSpeak) speak(errorText);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, todos, habits, appointments, voiceEnabled, speak, addMessage, updateTodoPriority]);

  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Initialize speech recognition with cleanup
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true; // Show interim results on mobile
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      setInput(transcript);
      
      // Only send when final result
      if (result.isFinal) {
        setIsListening(false);
        setSpeechError(null);
        setTimeout(() => sendMessageWithText(transcript, true), 300);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      const errorType = (event as SpeechRecognitionErrorEvent).error;
      
      switch (errorType) {
        case "not-allowed":
          setSpeechError("Microphone access denied. Please allow in browser settings.");
          break;
        case "no-speech":
          setSpeechError("No speech detected. Tap mic and try again.");
          break;
        case "network":
          setSpeechError("Network error. Check your connection.");
          break;
        default:
          setSpeechError("Voice input failed. Try typing instead.");
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onaudiostart = () => setSpeechError(null);

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [sendMessageWithText]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setSpeechError(null);
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Handle case where recognition is already started
        setIsListening(false);
        setSpeechError("Voice input busy. Please try again.");
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const sendMessage = useCallback(() => {
    sendMessageWithText(input, false);
  }, [input, sendMessageWithText]);

  const confirmAction = useCallback(() => {
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

    const displayType = pendingAction.type === "habit" ? "routine" : pendingAction.type;
    const confirmText = `Done! Added to your ${displayType}s.`;
    
    addMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content: `✓ ${confirmText}`,
    });
    
    if (lastInputWasVoice && voiceEnabled) speak(confirmText);
    setPendingAction(null);
    setLastInputWasVoice(false);
  }, [pendingAction, selectedPriority, addTodo, addHabit, addAppointment, addMessage, lastInputWasVoice, voiceEnabled, speak]);

  const cancelAction = useCallback(() => {
    setPendingAction(null);
    const cancelText = "No problem, cancelled.";
    addMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content: cancelText,
    });
    if (lastInputWasVoice && voiceEnabled) speak(cancelText);
    setLastInputWasVoice(false);
  }, [addMessage, lastInputWasVoice, voiceEnabled, speak]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[350px] md:h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <span className="text-xs md:text-sm font-medium text-brandText">Voice Assistant</span>
        <button
          onClick={() => setVoiceEnabled(v => !v)}
          className={`text-xs px-2 md:px-3 py-1 rounded-full transition-colors ${
            voiceEnabled ? "bg-brandGreenLight text-brandGreen" : "bg-gray-100 text-brandTextLight"
          }`}
        >
          {voiceEnabled ? "🔊 On" : "🔇 Off"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-brandTextLight py-6 md:py-8">
            <div className="text-3xl md:text-4xl mb-2 md:mb-3">🎙️</div>
            <p className="text-base md:text-lg font-medium">Talk to helpem</p>
            <p className="text-xs md:text-sm mt-1 md:mt-2">Tap the mic or type</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] md:max-w-[80%] p-2.5 md:p-3 rounded-2xl ${
              msg.role === "user"
                ? "bg-brandBlue text-white rounded-br-md"
                : "bg-gray-100 text-brandText rounded-bl-md"
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Priority selector for todos */}
        {pendingAction?.type === "todo" && (
          <div className="bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-200">
            <p className="text-xs md:text-sm text-brandTextLight mb-2">Set priority:</p>
            <div className="flex gap-1.5 md:gap-2 mb-2 md:mb-3">
              {(["high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPriority(p)}
                  className={`flex-1 py-1.5 md:py-2 px-2 md:px-3 rounded-lg text-xs md:text-sm font-medium transition-all capitalize
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
              <button onClick={confirmAction} className="flex-1 py-2 bg-brandGreen text-white rounded-lg text-sm font-medium hover:bg-green-600">
                Confirm
              </button>
              <button onClick={cancelAction} className="py-2 px-3 md:px-4 bg-gray-200 text-brandTextLight rounded-lg text-sm hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Confirm for habits and appointments */}
        {pendingAction && pendingAction.type !== "todo" && (
          <div className="flex gap-2">
            <button onClick={confirmAction} className="flex-1 py-2 bg-brandGreen text-white rounded-lg text-sm font-medium hover:bg-green-600">
              Confirm
            </button>
            <button onClick={cancelAction} className="py-2 px-3 md:px-4 bg-gray-200 text-brandTextLight rounded-lg text-sm hover:bg-gray-300">
              Cancel
            </button>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-brandTextLight p-2.5 md:p-3 rounded-2xl rounded-bl-md">
              <span className="animate-pulse text-sm">helpem is thinking...</span>
            </div>
          </div>
        )}

        {speechError && (
          <div className="bg-red-50 text-red-600 p-2.5 rounded-xl text-sm text-center">
            {speechError}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 md:p-4 border-t border-gray-100">
        <div className="flex gap-2">
          {speechSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={loading}
              className={`p-2.5 md:p-3 rounded-xl transition-all flex-shrink-0 ${
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-gray-100 text-brandTextLight hover:bg-gray-200 active:bg-gray-300"
              }`}
              aria-label={isListening ? "Stop listening" : "Start voice input"}
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
          )}

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Type or speak..."}
            className="flex-1 min-w-0 border border-gray-200 p-2.5 md:p-3 rounded-xl text-sm md:text-base text-brandText placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brandBlue/50"
            disabled={loading || isListening}
          />
          
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 md:px-5 py-2.5 md:py-3 bg-gradient-to-r from-brandBlue to-brandGreen text-white rounded-xl text-sm md:text-base font-medium disabled:opacity-50 hover:opacity-90 transition-all flex-shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
