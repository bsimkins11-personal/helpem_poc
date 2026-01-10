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

type InputMode = "type" | "talk";

const MAX_MESSAGES = 50;
const SESSION_STORAGE_KEY = "helpem_chat_history";

// Speech recognition timeout - mic stays on until 30s of silence
const SESSION_TIMEOUT = 30000; // 30s of no speech ends session

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
  const [isListening, setIsListening] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("type");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<"prompt" | "granted" | "denied" | "unknown">("unknown");
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { todos, habits, appointments, addTodo, addHabit, addAppointment, updateTodoPriority } = useLife();

  useEffect(() => {
    // Only scroll if there are messages (prevents page jump on load)
    if (messages.length > 0 && messagesContainerRef.current) {
      // Use scrollTop instead of scrollIntoView to prevent page scroll
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
    saveSessionMessages(messages);
  }, [messages]);

  // Check microphone permission status
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) {
      setMicPermission("unknown");
      return;
    }
    
    navigator.permissions.query({ name: "microphone" as PermissionName })
      .then((result) => {
        setMicPermission(result.state as "prompt" | "granted" | "denied");
        result.onchange = () => {
          setMicPermission(result.state as "prompt" | "granted" | "denied");
        };
      })
      .catch(() => {
        setMicPermission("unknown");
      });
  }, []);

  // Load available voices
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Unlock speech synthesis with a silent utterance (required for mobile)
  const unlockSpeech = useCallback(() => {
    if (typeof window === "undefined") return;
    const utterance = new SpeechSynthesisUtterance("");
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined") return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Find the best voice based on gender preference
    // Priority: Enhanced/Premium > Google > Default
    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    
    // High-quality female voices
    const femaleVoices = [
      "Samantha", "Karen", "Moira", "Tessa", "Fiona", // Apple
      "Google US English Female", "Google UK English Female", // Google
      "Microsoft Zira", "Microsoft Jenny", // Microsoft
      "en-US-Standard-C", "en-US-Standard-E", "en-US-Standard-F", // Google Cloud
    ];
    
    // High-quality male voices  
    const maleVoices = [
      "Daniel", "Alex", "Tom", "Oliver", "James", // Apple
      "Google US English Male", "Google UK English Male", // Google
      "Microsoft David", "Microsoft Mark", // Microsoft
      "en-US-Standard-A", "en-US-Standard-B", "en-US-Standard-D", // Google Cloud
    ];
    
    const preferredNames = voiceGender === "female" ? femaleVoices : maleVoices;
    
    // Try to find a matching high-quality voice
    let selectedVoice = voices.find(v => 
      preferredNames.some(name => v.name.includes(name))
    );
    
    // Fallback: try any English voice with the right gender hint in name
    if (!selectedVoice) {
      const genderHint = voiceGender === "female" ? /female|woman|zira|samantha|karen/i : /male|man|david|daniel|james/i;
      selectedVoice = voices.find(v => v.lang.startsWith("en") && genderHint.test(v.name));
    }
    
    // Last fallback: any English voice
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith("en"));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }, [availableVoices, voiceGender]);

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
    
    const shouldSpeak = isVoiceInput || inputMode === "talk";

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
      
      // In talk mode, auto-start listening again after response
      if (inputMode === "talk" && !pendingAction) {
        setTimeout(() => startListening(), 1000);
      }
    }
  }, [loading, messages, todos, habits, appointments, inputMode, speak, addMessage, updateTodoPriority, pendingAction]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      console.log("Speech recognition not supported");
      return;
    }

    // Check if on iOS - has limited support
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      console.log("iOS detected - speech recognition may be limited");
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        // Clear timeout as soon as speech is detected
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        setInput(transcript);
        
        if (result.isFinal) {
          setIsListening(false);
          setSpeechError(null);
          setTimeout(() => sendMessageWithText(transcript, true), 300);
        }
      };

      recognition.onerror = (event) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setIsListening(false);
        const errorType = (event as SpeechRecognitionErrorEvent).error;
        console.log("Speech error:", errorType);
        
        // Don't show error for aborted (intentional stop)
        if (errorType === "aborted") return;
        
        switch (errorType) {
          case "not-allowed":
            setSpeechError("Microphone blocked. Check browser settings.");
            break;
          case "no-speech":
            setSpeechError("No speech heard. Tap to try again.");
            break;
          case "network":
            setSpeechError("Network error. Speech needs internet.");
            break;
          case "audio-capture":
            setSpeechError("No microphone found.");
            break;
          case "service-not-allowed":
            setSpeechError("Speech service not available.");
            break;
          default:
            setSpeechError(`Voice error: ${errorType}`);
        }
      };

      recognition.onend = () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        console.log("Speech recognition ended");
        setIsListening(false);
      };
      
      recognition.onaudiostart = () => {
        console.log("Audio capture started");
        setSpeechError(null);
      };

      recognitionRef.current = recognition;
      console.log("Speech recognition initialized");

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        recognition.abort();
        recognitionRef.current = null;
      };
    } catch (e) {
      console.error("Failed to initialize speech recognition:", e);
      setSpeechSupported(false);
    }
  }, [sendMessageWithText]);

  // Request microphone permission
  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed to trigger the permission
      stream.getTracks().forEach(track => track.stop());
      setMicPermission("granted");
      setSpeechError(null);
      return true;
    } catch (err) {
      console.log("Mic permission error:", err);
      setMicPermission("denied");
      setSpeechError("Microphone access needed. Tap the lock icon in your browser's address bar to allow.");
      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current || isListening || loading) return;
    
    // Check if we need to request permission first
    if (micPermission !== "granted") {
      const granted = await requestMicPermission();
      if (!granted) return;
    }
    
    setSpeechError(null);
    setIsListening(true);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set 30s timeout - mic stays on until 30s of silence
    timeoutRef.current = setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
        setSpeechError("Session ended. Tap to start again.");
      }
    }, SESSION_TIMEOUT);
    
    try {
      recognitionRef.current.start();
    } catch {
      setIsListening(false);
      setSpeechError("Voice busy. Try again.");
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [isListening, loading, micPermission, requestMicPermission]);

  const stopListening = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const handleModeChange = useCallback(async (mode: InputMode) => {
    setInputMode(mode);
    setSpeechError(null);
    
    if (mode === "talk") {
      // Unlock speech synthesis on user gesture (required for mobile)
      unlockSpeech();
      // Start listening immediately when switching to talk mode
      await startListening();
    } else {
      stopListening();
      window.speechSynthesis?.cancel();
    }
  }, [startListening, stopListening, unlockSpeech]);

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
    
    if (inputMode === "talk") speak(confirmText);
    setPendingAction(null);
    
    // Resume listening in talk mode
    if (inputMode === "talk") {
      setTimeout(() => startListening(), 1000);
    }
  }, [pendingAction, selectedPriority, addTodo, addHabit, addAppointment, addMessage, speak, inputMode, startListening]);

  const cancelAction = useCallback(() => {
    setPendingAction(null);
    const cancelText = "No problem, cancelled.";
    addMessage({ id: crypto.randomUUID(), role: "assistant", content: cancelText });
    if (inputMode === "talk") speak(cancelText);
    
    if (inputMode === "talk") {
      setTimeout(() => startListening(), 1000);
    }
  }, [addMessage, speak, inputMode, startListening]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[350px] md:h-[500px]">
      {/* Mode Toggle Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleModeChange("type")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              inputMode === "type"
                ? "bg-brandBlue text-white"
                : "bg-gray-100 text-brandTextLight hover:bg-gray-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Type
          </button>
          
          {speechSupported && (
            <button
              onClick={() => handleModeChange("talk")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                inputMode === "talk"
                  ? "bg-brandGreen text-white"
                  : "bg-gray-100 text-brandTextLight hover:bg-gray-200"
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
              Talk
            </button>
          )}
        </div>
        
        {/* Voice gender toggle - only visible in talk mode */}
        {inputMode === "talk" && (
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
              {inputMode === "talk" ? "🎙️" : "💬"}
            </div>
            <p className="text-base md:text-lg font-medium">
              {inputMode === "talk" ? "I'm listening..." : "Chat with helpem"}
            </p>
            <p className="text-xs md:text-sm mt-1 md:mt-2">
              {inputMode === "talk" ? "Speak now" : "Type your message below"}
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

        {speechError && (
          <div className={`p-3 rounded-xl text-sm text-center ${
            micPermission === "denied" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-600"
          }`}>
            <p>{speechError}</p>
            {micPermission === "denied" && (
              <p className="mt-2 text-xs opacity-75">
                On mobile: Settings → Safari/Chrome → Microphone → Allow
              </p>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Only shown in Type mode */}
      {inputMode === "type" && (
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
      )}

      {/* Talk mode status bar */}
      {inputMode === "talk" && (
        <div 
          onClick={() => !loading && !isListening && startListening()}
          className={`p-4 border-t border-gray-100 text-center cursor-pointer transition-all ${
            isListening ? "bg-red-50" : loading ? "bg-gray-50" : micPermission === "denied" ? "bg-amber-50" : "bg-brandGreenLight hover:bg-green-100"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {isListening && (
              <span className="flex gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-75" />
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-150" />
              </span>
            )}
            <span className={`text-sm font-medium ${
              isListening ? "text-red-600" : 
              loading ? "text-brandTextLight" : 
              micPermission === "denied" ? "text-amber-700" : 
              "text-brandGreen"
            }`}>
              {isListening ? "Listening..." : 
               loading ? "Processing..." : 
               micPermission === "denied" ? "🔒 Mic blocked - tap to retry" :
               "Tap here to speak"}
            </span>
          </div>
          {input && isListening && (
            <p className="text-sm text-brandText mt-2 italic">&ldquo;{input}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  );
}
