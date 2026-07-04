"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings for the Web Speech API (not in lib.dom for all targets) */
interface SpeechRecognitionResultItem {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionResultItem;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface VoiceSupport {
  stt: boolean;
  tts: boolean;
}

export interface ListenCallbacks {
  /** Called on every update with the accumulated final text and current interim text. */
  onUpdate: (finalText: string, interimText: string) => void;
  /** Fatal errors only (e.g. mic permission denied). */
  onError: (error: string) => void;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | null;
}

/**
 * Wraps browser SpeechRecognition (STT) + SpeechSynthesis (TTS).
 *
 * Chrome's recognizer stops itself after a stretch of silence, which would
 * lose everything said before the stop — so on `onend` we bank the finalized
 * text and restart, keeping one continuous transcript until stopListening().
 */
export function useVoiceEngine() {
  const [support, setSupport] = useState<VoiceSupport>({ stt: false, tts: false });
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeRef = useRef(false);
  const bankedRef = useRef(""); // finals from previous recognizer instances
  const currentFinalRef = useRef(""); // finals from the live instance
  const callbacksRef = useRef<ListenCallbacks | null>(null);
  // Chrome GC bug: if the utterance isn't referenced somewhere, it can be
  // collected mid-speech and onend never fires. Keep the live one pinned.
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    setSupport({
      stt: getRecognitionCtor() !== null,
      tts: typeof window !== "undefined" && "speechSynthesis" in window,
    });
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const pickVoice = () => {
      const en = window.speechSynthesis
        .getVoices()
        .filter((v) => v.lang?.toLowerCase().startsWith("en"));
      // Edge's neural "Natural" voices sound far more human — take one if
      // present. Otherwise prefer LOCAL voices: Chrome's remote ones (e.g.
      // "Google US English") can silently produce no audio at all.
      voiceRef.current =
        en.find((v) => /natural/i.test(v.name)) ||
        en.find((v) => v.localService && v.lang.toLowerCase().startsWith("en-us")) ||
        en.find((v) => v.localService) ||
        en[0] ||
        null;
    };
    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, []);

  const speak = useCallback((text: string, onEnd: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onEnd();
      return;
    }
    const synth = window.speechSynthesis;

    const attempt = (useCustomVoice: boolean, retriesLeft: number) => {
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
      synth.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.97;
      if (useCustomVoice && voiceRef.current) utter.voice = voiceRef.current;
      utterRef.current = utter;

      let started = false;
      let done = false;
      let watchdog: ReturnType<typeof setInterval> | null = null;
      const finish = () => {
        if (done) return;
        done = true;
        if (watchdog) clearInterval(watchdog);
        const wasCurrent = utterRef.current === utter;
        if (wasCurrent) utterRef.current = null;
        // If audio never actually started (a broken/remote voice can fail
        // silently), retry once on the system default voice. Skipped when
        // stopSpeaking() cancelled us — utterRef was already cleared then.
        if (wasCurrent && !started && retriesLeft > 0) {
          attempt(false, retriesLeft - 1);
        } else {
          onEnd();
        }
      };
      utter.onstart = () => {
        started = true;
      };
      utter.onend = finish;
      utter.onerror = finish;

      // Chrome silently drops a speak() issued synchronously after cancel().
      // Give the engine a beat.
      speakTimerRef.current = setTimeout(() => {
        synth.resume(); // un-stick engines left paused
        synth.speak(utter);
      }, 100);

      // Two more failure modes need a net: environments with no voices never
      // fire onend, and Chrome stalls long utterances unless nudged with resume().
      let graceTicks = 4; // cancel→speak delay + engine spin-up
      watchdog = setInterval(() => {
        if (synth.speaking) {
          graceTicks = 0;
          synth.resume();
        } else if (!synth.pending && graceTicks-- <= 0) {
          finish();
        }
      }, 700);
    };

    attempt(true, 1);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (speakTimerRef.current) {
      clearTimeout(speakTimerRef.current);
      speakTimerRef.current = null;
    }
    utterRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const startInstance = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || !activeRef.current) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      currentFinalRef.current = final;
      callbacksRef.current?.onUpdate(bankedRef.current + final, interim);
    };

    recognition.onerror = (e) => {
      // "no-speech" / "aborted" are routine; only surface real failures.
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        activeRef.current = false;
        callbacksRef.current?.onError(e.error);
      }
    };

    recognition.onend = () => {
      bankedRef.current += currentFinalRef.current;
      currentFinalRef.current = "";
      if (activeRef.current) {
        try {
          startInstance();
        } catch {
          /* restart can race a stop; safe to ignore */
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      /* start() throws if called while already started */
    }
  }, []);

  const startListening = useCallback(
    (callbacks: ListenCallbacks) => {
      callbacksRef.current = callbacks;
      activeRef.current = true;
      bankedRef.current = "";
      currentFinalRef.current = "";
      startInstance();
    },
    [startInstance]
  );

  /** Stops recognition and returns the full transcript captured so far. */
  const stopListening = useCallback((): string => {
    activeRef.current = false;
    const full = (bankedRef.current + currentFinalRef.current).trim();
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    }
    return full;
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
    };
  }, [stopListening, stopSpeaking]);

  return { support, speak, stopSpeaking, startListening, stopListening };
}
