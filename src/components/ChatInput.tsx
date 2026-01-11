"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLife } from "@/state/LifeStore";
import { Priority } from "@/types/todo";
import { useNativeAudio } from "@/hooks/useNativeAudio";

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

const MAX_MESSAGES = 50;
const SESSION_STORAGE_KEY = "helpem_chat_history";

// Detect iOS native environment - single source of truth
function isIOSNativeEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as { webkit?: { messageHandlers?: { native?: unknown } } };
  return !!(
    win.webkit &&
    win.webkit.messageHandlers &&
    win.webkit.messageHandlers.native
  );
}

// Strip markdown formatting from AI responses
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function loadSessionMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSessionMessages(messages: Message[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages));
  } catch {}
}

export default function ChatInput() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => loadSessionMessages());
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<Message["action"] | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<Priority>("medium");
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { todos, habits, appointments, addTodo, addHabit, addAppointment, updateTodoPriority } = useLife();
  
  // Native audio hook for iOS app
  const nativeAudio = useNativeAudio();
  const isNativeApp = nativeAudio.isNative;

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
    saveSessionMessages(messages);
  }, [messages]);

  // Speak function - only works in iOS native
  const speak = useCallback((text: string) => {
    if (!isNativeApp) return; // Browser = silent
    
    const plainText = stripMarkdown(text)
      .replace(/<[^>]+>/g, "")
      .replace(/&[^;]+;/g, "")
      .trim();
    
    if (!plainText) return;
    
    const voice = voiceGender === "female" ? "nova" : "onyx";
    nativeAudio.speakText(plainText, voice);
  }, [isNativeApp, voiceGender, nativeAudio]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const updated = [...prev, message];
      return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
    });
  }, []);

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
    
    // Only speak responses if voice input OR in native app
    const shouldSpeak = isVoiceInput && isNativeApp;

    try {
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
        const rawResponse = data.message || data.error || "I'm not sure how to help with that.";
        const responseText = stripMarkdown(rawResponse);
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
  }, [loading, messages, todos, habits, appointments, speak, addMessage, updateTodoPriority, isNativeApp]);

  // Handle native transcription results (iOS native only)
  useEffect(() => {
    if (!isNativeApp) return;
    
    const handleTranscription = (payload: unknown) => {
      const text = (payload as { text?: string })?.text;
      if (text && text.length > 0) {
        setInput(text);
        setIsListening(false);
        setTimeout(() => sendMessageWithText(text, true), 300);
      }
    };
    
    const handleUserTranscript = (payload: unknown) => {
      const data = payload as { text?: string };
      if (data.text && data.text.length > 0) {
        setInput(data.text);
        sendMessageWithText(data.text, true);
      }
    };
    
    window.nativeBridge?.on("TRANSCRIPTION_READY", handleTranscription);
    window.nativeBridge?.on("USER_TRANSCRIPT", handleUserTranscript);
    
    return () => {
      window.nativeBridge?.off("TRANSCRIPTION_READY", handleTranscription);
      window.nativeBridge?.off("USER_TRANSCRIPT", handleUserTranscript);
    };
  }, [isNativeApp, sendMessageWithText]);

  // Native iOS listening controls
  const startListening = useCallback(() => {
    if (!isNativeApp || isListening || loading) return;
    setIsListening(true);
    nativeAudio.startConversation();
  }, [isNativeApp, isListening, loading, nativeAudio]);

  const stopListening = useCallback(() => {
    if (!isNativeApp) return;
    nativeAudio.endConversation();
    setIsListening(false);
  }, [isNativeApp, nativeAudio]);

  const sendMessage = useCallback(() => {
    sendMessageWithText(input, false);
  }, [input, sendMessageWithText]);

  const confirmAction = useCallback(() => {
    if (!pendingAction) return;

    const id = crypto.randomUUID();
    const now = new Date();

    switch (pendingAction.type) {
      case "todo":
        addTodo({ id, title: pendingAction.title, priority: selectedPriority, dueDate: pendingAction.datetime ? new Date(pendingAction.datetime) : undefined, createdAt: now });
        break;
      case "habit":
        addHabit({ id, title: pendingAction.title, frequency: pendingAction.frequency || "daily", createdAt: now, completions: [] });
        break;
      case "appointment":
        addAppointment({ id, title: pendingAction.title, datetime: pendingAction.datetime ? new Date(pendingAction.datetime) : now, createdAt: now });
        break;
    }

    const displayType = pendingAction.type === "habit" ? "routine" : pendingAction.type;
    const confirmText = `Done! Added to your ${displayType}s.`;
    
    addMessage({ id: crypto.randomUUID(), role: "assistant", content: `✓ ${confirmText}` });
    if (isNativeApp) speak(confirmText);
    setPendingAction(null);
  }, [pendingAction, selectedPriority, addTodo, addHabit, addAppointment, addMessage, speak, isNativeApp]);

  const cancelAction = useCallback(() => {
    setPendingAction(null);
    const cancelText = "No problem, cancelled.";
    addMessage({ id: crypto.randomUUID(), role: "assistant", content: cancelText });
    if (isNativeApp) speak(cancelText);
  }, [addMessage, speak, isNativeApp]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[350px] md:h-[500px]">
      <div style={{ display: "none" }} data-build-marker="talk-clean-v1" />
      {/* Header - shows iOS badge if native, or simple title for browser */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {isNativeApp ? (
            <>
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">iOS</span>
              <span className="text-sm font-medium text-brandText">Voice Active</span>
            </>
          ) : (
            <span className="text-sm font-medium text-brandText">💬 Chat with helpem</span>
          )}
        </div>
        
        {/* Voice gender toggle - only in iOS native */}
        {isNativeApp && (
          <button
            onClick={() => setVoiceGender(v => v === "female" ? "male" : "female")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-brandTextLight hover:bg-gray-200 transition-all"
          >
            {voiceGender === "female" ? "👩" : "👨"}
            <span className="hidden sm:inline">{voiceGender === "female" ? "Female" : "Male"}</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-brandTextLight py-6 md:py-8">
            <div className="text-3xl md:text-4xl mb-2 md:mb-3">
              {isNativeApp ? "🎙️" : "💬"}
            </div>
            <p className="text-base md:text-lg font-medium">
              {isNativeApp ? "I'm listening..." : "Chat with helpem"}
            </p>
            <p className="text-xs md:text-sm mt-1 md:mt-2">
              {isNativeApp ? "Speak or type below" : "Type your message below"}
            </p>
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

        <div ref={messagesEndRef} />
      </div>

      {/* Text Input Area - Always visible */}
      <div className="p-3 md:p-4 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 min-w-0 border border-gray-200 p-2.5 md:p-3 rounded-xl text-sm md:text-base text-brandText placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brandBlue/50"
            disabled={loading}
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

      {/* iOS Native: Voice control bar */}
      {isNativeApp && (
        <div 
          onClick={() => {
            if (loading) return;
            if (nativeAudio.isConversationActive) {
              stopListening();
            } else {
              startListening();
            }
          }}
          className={`p-3 border-t border-gray-100 text-center cursor-pointer transition-all ${
            nativeAudio.isConversationActive 
              ? nativeAudio.conversationState === 'speaking' 
                ? "bg-blue-50" 
                : nativeAudio.conversationState === 'thinking' 
                  ? "bg-amber-50" 
                  : "bg-green-50"
              : "bg-brandGreenLight hover:bg-green-100"
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            {nativeAudio.isConversationActive && (
              <div className="flex items-center gap-2">
                {nativeAudio.conversationState === 'listening' && (
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
                {nativeAudio.conversationState === 'thinking' && (
                  <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                )}
                {nativeAudio.conversationState === 'speaking' && (
                  <span className="flex gap-0.5 items-end h-4">
                    <span className="w-1 bg-blue-500 rounded-full animate-pulse" style={{ height: '8px' }} />
                    <span className="w-1 bg-blue-500 rounded-full animate-pulse" style={{ height: '16px', animationDelay: '100ms' }} />
                    <span className="w-1 bg-blue-500 rounded-full animate-pulse" style={{ height: '12px', animationDelay: '200ms' }} />
                    <span className="w-1 bg-blue-500 rounded-full animate-pulse" style={{ height: '16px', animationDelay: '300ms' }} />
                    <span className="w-1 bg-blue-500 rounded-full animate-pulse" style={{ height: '8px', animationDelay: '400ms' }} />
                  </span>
                )}
              </div>
            )}
            
            <span className={`text-sm font-medium ${
              nativeAudio.isConversationActive 
                ? nativeAudio.conversationState === 'speaking' 
                  ? "text-blue-600" 
                  : nativeAudio.conversationState === 'thinking' 
                    ? "text-amber-600" 
                    : "text-green-600"
                : "text-brandGreen"
            }`}>
              {nativeAudio.isConversationActive 
                ? nativeAudio.conversationState === 'speaking'
                  ? "Speaking..."
                  : nativeAudio.conversationState === 'thinking'
                    ? "Thinking..."
                    : "Listening... (tap to stop)"
                : "🎙️ Tap to start voice"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
