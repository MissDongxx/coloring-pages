"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface SoundContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playSound: (sound: "fill" | "click" | "success" | "undo" | "clear") => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

// Simple sound generators using Web Audio API
const generateTone = (frequency: number, duration: number, type: OscillatorType = "sine") => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

export function SoundProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const playSound = useCallback((sound: "fill" | "click" | "success" | "undo" | "clear") => {
    if (isMuted) return;

    switch (sound) {
      case "fill":
        // Pleasant pop sound for color fill
        generateTone(600, 0.1, "sine");
        setTimeout(() => generateTone(800, 0.1, "sine"), 50);
        break;
      case "click":
        // Subtle click sound
        generateTone(400, 0.05, "sine");
        break;
      case "success":
        // Happy ascending tones
        generateTone(523, 0.1, "sine"); // C5
        setTimeout(() => generateTone(659, 0.1, "sine"), 100); // E5
        setTimeout(() => generateTone(784, 0.15, "sine"), 200); // G5
        break;
      case "undo":
        // Lower descending tone
        generateTone(400, 0.1, "sine");
        setTimeout(() => generateTone(300, 0.15, "sine"), 50);
        break;
      case "clear":
        // Whoosh sound
        generateTone(300, 0.2, "triangle");
        setTimeout(() => generateTone(200, 0.2, "triangle"), 100);
        break;
    }
  }, [isMuted]);

  return (
    <SoundContext.Provider value={{ isMuted, toggleMute, playSound }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
}
