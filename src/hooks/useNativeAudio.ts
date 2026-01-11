// useNativeAudio.ts
// Hook for using native audio when running in iOS shell
// Supports both single-turn recording and continuous conversation mode

import { useEffect, useState, useCallback, useRef } from 'react';

// Conversation states from native
type ConversationState = 'idle' | 'listening' | 'thinking' | 'speaking';

// Extend Window interface for native bridge
declare global {
  interface Window {
    nativeBridge?: {
      isNative: boolean;
      send: (type: string, payload?: Record<string, unknown>) => void;
      on: (type: string, callback: (payload: unknown) => void) => void;
      off: (type: string, callback: (payload: unknown) => void) => void;
      // Single-turn methods (existing)
      startRecording: () => void;
      stopRecording: () => void;
      cancelRecording: () => void;
      playAudio: (url: string) => void;
      speakText: (text: string, voice?: string) => void;
      // Conversation mode methods (new)
      startConversation: () => void;
      endConversation: () => void;
      interruptSpeaking: () => void;
    };
  }
}

type NativeAudioState = {
  isNative: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  lastTranscription: string | null;
  error: string | null;
  // Conversation mode state
  isConversationActive: boolean;
  conversationId: string | null;
  conversationState: ConversationState;
};

type NativeAudioActions = {
  // Single-turn methods (existing)
  startRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
  playAudio: (url: string) => void;
  speakText: (text: string, voice?: string) => void;
  // Conversation mode methods (new)
  startConversation: () => void;
  endConversation: () => void;
  interruptSpeaking: () => void;
};

export function useNativeAudio(): NativeAudioState & NativeAudioActions {
  const [isNative, setIsNative] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastTranscription, setLastTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Conversation mode state
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  
  // Callbacks for external handlers
  const onTranscriptionRef = useRef<((text: string) => void) | null>(null);
  const onPlaybackCompleteRef = useRef<(() => void) | null>(null);
  const onUserTranscriptRef = useRef<((text: string, conversationId: string) => void) | null>(null);

  useEffect(() => {
    // Check if running in native app
    const checkNative = () => {
      const native = window.nativeBridge?.isNative === true;
      setIsNative(native);
      if (native) {
        console.log('[useNativeAudio] Running in native iOS app');
      }
    };

    // Check immediately and also after bridge is injected
    checkNative();
    window.addEventListener('nativeBridgeInjected', checkNative);

    // Set up message listeners
    const handleBridgeReady = () => {
      console.log('[useNativeAudio] Bridge ready');
    };

    const handleRecordingComplete = (payload: unknown) => {
      setIsRecording(false);
      console.log('[useNativeAudio] Recording complete', payload);
    };

    const handleTranscriptionReady = (payload: unknown) => {
      const text = (payload as { text?: string })?.text;
      if (text) {
        setLastTranscription(text);
        onTranscriptionRef.current?.(text);
      }
    };

    const handlePlaybackComplete = () => {
      setIsPlaying(false);
      onPlaybackCompleteRef.current?.();
    };

    const handleError = (payload: unknown) => {
      const message = (payload as { message?: string })?.message || 'Unknown error';
      setError(message);
      setIsRecording(false);
      setIsPlaying(false);
    };

    // Conversation mode handlers
    const handleConversationStarted = (payload: unknown) => {
      const data = payload as { conversationId?: string };
      console.log('[useNativeAudio] Conversation started:', data.conversationId);
      setIsConversationActive(true);
      setConversationId(data.conversationId || null);
      setConversationState('listening');
    };

    const handleConversationEnded = () => {
      console.log('[useNativeAudio] Conversation ended');
      setIsConversationActive(false);
      setConversationId(null);
      setConversationState('idle');
    };

    const handleConversationStateUpdate = (payload: unknown) => {
      const data = payload as { state?: ConversationState; conversationId?: string };
      console.log('[useNativeAudio] State update:', data.state);
      if (data.state) {
        setConversationState(data.state);
      }
      // Update playing/recording flags based on conversation state
      if (data.state === 'listening') {
        setIsRecording(true);
        setIsPlaying(false);
      } else if (data.state === 'speaking') {
        setIsRecording(false);
        setIsPlaying(true);
      } else if (data.state === 'thinking') {
        setIsRecording(false);
        setIsPlaying(false);
      }
    };

    const handleUserTranscript = (payload: unknown) => {
      const data = payload as { text?: string; conversationId?: string };
      if (data.text) {
        console.log('[useNativeAudio] User transcript:', data.text);
        setLastTranscription(data.text);
        onUserTranscriptRef.current?.(data.text, data.conversationId || '');
      }
    };

    // Register listeners when bridge is available
    const registerListeners = () => {
      if (window.nativeBridge) {
        // Single-turn events
        window.nativeBridge.on('BRIDGE_READY', handleBridgeReady);
        window.nativeBridge.on('RECORDING_COMPLETE', handleRecordingComplete);
        window.nativeBridge.on('TRANSCRIPTION_READY', handleTranscriptionReady);
        window.nativeBridge.on('PLAYBACK_COMPLETE', handlePlaybackComplete);
        window.nativeBridge.on('ERROR', handleError);
        // Conversation mode events
        window.nativeBridge.on('CONVERSATION_STARTED', handleConversationStarted);
        window.nativeBridge.on('CONVERSATION_ENDED', handleConversationEnded);
        window.nativeBridge.on('CONVERSATION_STATE_UPDATE', handleConversationStateUpdate);
        window.nativeBridge.on('USER_TRANSCRIPT', handleUserTranscript);
      }
    };

    registerListeners();
    window.addEventListener('nativeBridgeInjected', registerListeners);

    return () => {
      window.removeEventListener('nativeBridgeInjected', checkNative);
      window.removeEventListener('nativeBridgeInjected', registerListeners);
      
      if (window.nativeBridge) {
        window.nativeBridge.off('BRIDGE_READY', handleBridgeReady);
        window.nativeBridge.off('RECORDING_COMPLETE', handleRecordingComplete);
        window.nativeBridge.off('TRANSCRIPTION_READY', handleTranscriptionReady);
        window.nativeBridge.off('PLAYBACK_COMPLETE', handlePlaybackComplete);
        window.nativeBridge.off('ERROR', handleError);
        window.nativeBridge.off('CONVERSATION_STARTED', handleConversationStarted);
        window.nativeBridge.off('CONVERSATION_ENDED', handleConversationEnded);
        window.nativeBridge.off('CONVERSATION_STATE_UPDATE', handleConversationStateUpdate);
        window.nativeBridge.off('USER_TRANSCRIPT', handleUserTranscript);
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!window.nativeBridge) return;
    setError(null);
    setIsRecording(true);
    window.nativeBridge.startRecording();
  }, []);

  const stopRecording = useCallback(() => {
    if (!window.nativeBridge) return;
    window.nativeBridge.stopRecording();
    // isRecording will be set to false when RECORDING_COMPLETE is received
  }, []);

  const cancelRecording = useCallback(() => {
    if (!window.nativeBridge) return;
    setIsRecording(false);
    window.nativeBridge.cancelRecording();
  }, []);

  const playAudio = useCallback((url: string) => {
    if (!window.nativeBridge) return;
    setIsPlaying(true);
    window.nativeBridge.playAudio(url);
  }, []);

  const speakText = useCallback((text: string, voice?: string) => {
    if (!window.nativeBridge) return;
    setIsPlaying(true);
    window.nativeBridge.speakText(text, voice);
  }, []);

  // Conversation mode actions
  const startConversation = useCallback(() => {
    if (!window.nativeBridge) return;
    setError(null);
    window.nativeBridge.startConversation();
  }, []);

  const endConversation = useCallback(() => {
    if (!window.nativeBridge) return;
    window.nativeBridge.endConversation();
    setIsConversationActive(false);
    setConversationId(null);
    setConversationState('idle');
  }, []);

  const interruptSpeaking = useCallback(() => {
    if (!window.nativeBridge) return;
    window.nativeBridge.interruptSpeaking();
  }, []);

  return {
    // State
    isNative,
    isRecording,
    isPlaying,
    lastTranscription,
    error,
    // Conversation mode state
    isConversationActive,
    conversationId,
    conversationState,
    // Single-turn actions
    startRecording,
    stopRecording,
    cancelRecording,
    playAudio,
    speakText,
    // Conversation mode actions
    startConversation,
    endConversation,
    interruptSpeaking,
  };
}

// Helper to check if native audio should be used
export function shouldUseNativeAudio(): boolean {
  return window.nativeBridge?.isNative === true;
}
