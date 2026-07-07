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

export interface SpeakOptions {
  /** Track id — picks the persona's ElevenLabs voice server-side. */
  track?: string;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | null;
}

/**
 * Voice I/O for the interview room.
 *
 * TTS: ElevenLabs via /api/tts when configured (played through a shared
 * <audio> element — far more reliable than speechSynthesis), falling back
 * to browser speechSynthesis when the key is missing or a request fails.
 *
 * STT: browser SpeechRecognition. Chrome's recognizer stops itself after a
 * stretch of silence, which would lose everything said before the stop — so
 * on `onend` we bank the finalized text and restart, keeping one continuous
 * transcript until stopListening().
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

  // Each speak()/stopSpeaking() bumps the sequence; async continuations
  // from a superseded speak check it and bail instead of talking over.
  const speakSeqRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  // null = not probed yet, false = server said "no key", true = works
  const remoteTtsRef = useRef<boolean | null>(null);

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

  /**
   * Call from inside a click handler before the first speak. Creating the
   * shared <audio> element and attempting play() during a real user gesture
   * blesses it against Chrome's autoplay policy, so every later
   * programmatic play() (follow-up questions) is allowed.
   */
  const primeAudio = useCallback(() => {
    if (typeof Audio === "undefined") return;
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.play().catch(() => {
      /* no src yet — the attempt itself is what registers the gesture */
    });
  }, []);

  const stopAudioElement = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.onended = null;
      a.onerror = null;
      try {
        a.pause();
      } catch {
        /* not playing */
      }
      a.removeAttribute("src");
      try {
        a.load();
      } catch {
        /* detached */
      }
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  /** ElevenLabs path. Resolves "played" when audio finished, "fallback" to try browser TTS. */
  const playRemote = useCallback(
    async (text: string, track: string | undefined, seq: number): Promise<"played" | "fallback"> => {
      if (remoteTtsRef.current === false) return "fallback";
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, track }),
        });
        if (res.status === 503) {
          // No API key configured — don't pay a failing round-trip per turn.
          remoteTtsRef.current = false;
          return "fallback";
        }
        if (!res.ok) return "fallback";
        const blob = await res.blob();
        if (speakSeqRef.current !== seq) return "played"; // superseded — swallow
        remoteTtsRef.current = true;

        if (!audioRef.current) audioRef.current = new Audio();
        const a = audioRef.current;
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;

        return await new Promise<"played" | "fallback">((resolve) => {
          let started = false;
          const cleanup = () => {
            a.onended = null;
            a.onerror = null;
            if (audioUrlRef.current === url) {
              URL.revokeObjectURL(url);
              audioUrlRef.current = null;
            }
          };
          a.onended = () => {
            cleanup();
            resolve("played");
          };
          a.onerror = () => {
            cleanup();
            // Mid-playback failure: the line was partially heard — ending the
            // turn beats replaying the whole thing in a different voice.
            resolve(started ? "played" : "fallback");
          };
          a.src = url;
          a.play()
            .then(() => {
              started = true;
            })
            .catch(() => {
              cleanup();
              resolve("fallback");
            });
        });
      } catch {
        return "fallback";
      }
    },
    []
  );

  /** Browser speechSynthesis path (fallback). */
  const speakWithSynthesis = useCallback((text: string, onEnd: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onEnd();
      return;
    }
    const synth = window.speechSynthesis;

    const attempt = (useCustomVoice: boolean, retriesLeft: number) => {
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
      // cancel() on an IDLE engine puts Chrome in a state where the next
      // speak() is silently dropped — that's why follow-up questions went
      // mute while the first one worked. Only clear when something is
      // actually queued or speaking.
      if (synth.speaking || synth.pending) synth.cancel();

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

  const speak = useCallback(
    (text: string, onEnd: () => void, opts?: SpeakOptions) => {
      const seq = ++speakSeqRef.current;
      stopAudioElement();
      const guardedEnd = () => {
        if (speakSeqRef.current === seq) onEnd();
      };

      void (async () => {
        const result = await playRemote(text, opts?.track, seq);
        if (speakSeqRef.current !== seq) return;
        if (result === "played") {
          guardedEnd();
        } else {
          speakWithSynthesis(text, guardedEnd);
        }
      })();
    },
    [playRemote, speakWithSynthesis, stopAudioElement]
  );

  const stopSpeaking = useCallback(() => {
    speakSeqRef.current++;
    if (speakTimerRef.current) {
      clearTimeout(speakTimerRef.current);
      speakTimerRef.current = null;
    }
    utterRef.current = null;
    stopAudioElement();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const synth = window.speechSynthesis;
      if (synth.speaking || synth.pending) synth.cancel();
    }
  }, [stopAudioElement]);

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

  return { support, speak, stopSpeaking, startListening, stopListening, primeAudio };
}
