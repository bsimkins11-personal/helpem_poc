// useNativeAudio.ts
// Hook for using native audio when running in iOS shell

import { useEffect, useState, useCallback, useRef } from 'react';

// Extend Window interface for native bridge
declare global {
  interface Window {
    nativeBridge?: {
      isNative: boolean;
      send: (type: string, payload?: Record<string, unknown>) => void;
      on: (type: string, callback: (payload: unknown) => void) => void;
      off: (type: string, callback: (payload: unknown) => void) => void;
      startRecording: () => void;
      stopRecording: () => void;
      cancelRecording: () => void;
      playAudio: (url: string) => void;
    };
  }
}

type NativeAudioState = {
  isNative: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  lastTranscription: string | null;
  error: string | null;
};

type NativeAudioActions = {
  startRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
  playAudio: (url: string) => void;
};

export function useNativeAudio(): NativeAudioState & NativeAudioActions {
  const [isNative, setIsNative] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastTranscription, setLastTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Callbacks for external handlers
  const onTranscriptionRef = useRef<((text: string) => void) | null>(null);
  const onPlaybackCompleteRef = useRef<(() => void) | null>(null);

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

    // Register listeners when bridge is available
    const registerListeners = () => {
      if (window.nativeBridge) {
        window.nativeBridge.on('BRIDGE_READY', handleBridgeReady);
        window.nativeBridge.on('RECORDING_COMPLETE', handleRecordingComplete);
        window.nativeBridge.on('TRANSCRIPTION_READY', handleTranscriptionReady);
        window.nativeBridge.on('PLAYBACK_COMPLETE', handlePlaybackComplete);
        window.nativeBridge.on('ERROR', handleError);
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

  return {
    isNative,
    isRecording,
    isPlaying,
    lastTranscription,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    playAudio,
  };
}

// Helper to check if native audio should be used
export function shouldUseNativeAudio(): boolean {
  return window.nativeBridge?.isNative === true;
}
