"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { tracks, isTrackId } from "@/lib/tracks";
import type { ChatTurn, InterviewPrefs, TrackId } from "@/lib/types";
import { saveSession } from "@/lib/sessions";
import { useVoiceEngine } from "@/components/VoiceEngine";
import Avatar2D, { type AvatarState } from "@/components/Avatar/Avatar2D";

const Avatar3D = dynamic(() => import("@/components/Avatar/Avatar3D"), { ssr: false });

type Status = "idle" | "thinking" | "speaking" | "listening" | "awaiting-answer" | "error";

/** How long a pause (after something has been said) counts as "done answering". */
const SILENCE_SUBMIT_MS = 2400;

const RESUME_KEY = "interviewme.resume.v1";

export default function InterviewPage({
  params,
}: {
  params: Promise<{ track: string }>;
}) {
  const { track: trackId } = use(params);

  if (!isTrackId(trackId)) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted">This interview room doesn&apos;t exist.</p>
        <Link href="/" className="text-accent underline underline-offset-4">
          Back to the lobby
        </Link>
      </main>
    );
  }

  return <InterviewRoom trackId={trackId} />;
}

function InterviewRoom({ trackId }: { trackId: TrackId }) {
  const track = tracks[trackId];
  const router = useRouter();
  const { support, speak, stopSpeaking, startListening, stopListening } = useVoiceEngine();

  const [stage, setStage] = useState<"setup" | "live" | "ending">("setup");
  const [resumeText, setResumeText] = useState("");
  const [prefs, setPrefs] = useState<InterviewPrefs>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [caption, setCaption] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [micBlocked, setMicBlocked] = useState(false);
  const [use3D, setUse3D] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [camError, setCamError] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;
  const statusRef = useRef(status);
  statusRef.current = status;
  const historyRef = useRef(history);
  historyRef.current = history;
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionIdRef = useRef("");
  const startedAtRef = useRef("");

  const questionCount = history.filter((t) => t.role === "interviewer").length;
  const voiceActive = voiceOn && support.stt && support.tts && !micBlocked;

  const avatarState: AvatarState =
    status === "speaking"
      ? "speaking"
      : status === "listening"
        ? "listening"
        : status === "thinking"
          ? "thinking"
          : "idle";

  // Restore resume + 3D preference from previous visits.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(RESUME_KEY);
      if (saved) setResumeText(saved);
      setUse3D(window.localStorage.getItem("interviewme.avatar3d") === "1");
    } catch {
      /* private mode */
    }
  }, []);

  // Autosave the running transcript so a crash or closed tab loses nothing.
  useEffect(() => {
    if (stage !== "live" || history.length === 0 || !sessionIdRef.current) return;
    saveSession({
      id: sessionIdRef.current,
      track: trackId,
      startedAt: startedAtRef.current,
      resumeSnapshot: resumeText || undefined,
      prefs,
      transcript: history,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, stage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [history, status, caption]);

  useEffect(() => {
    if (status === "awaiting-answer") inputRef.current?.focus();
  }, [status]);

  // your camera tile — video only, the mic belongs to speech recognition
  useEffect(() => {
    if (stage !== "live" || !camOn) return;
    let cancelled = false;
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) {
      setCamError(true);
      return;
    }
    md.getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamError(false);
      })
      .catch(() => {
        if (!cancelled) setCamError(true);
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [stage, camOn]);

  // call timer
  useEffect(() => {
    if (stage !== "live") return;
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAtRef.current).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [stage]);

  // when voice isn't available the typed input lives in the transcript panel — open it
  useEffect(() => {
    if (status === "awaiting-answer" && (!voiceOn || micBlocked || !support.stt)) {
      setShowTranscript(true);
    }
  }, [status, voiceOn, micBlocked, support.stt]);

  // These functions form the turn-taking loop and get captured by timers,
  // TTS callbacks, and STT callbacks that outlive the render they were made
  // in. Memoizing them (useCallback) froze the first render's view — where
  // `support` was still {stt:false, tts:false} — which is why only the very
  // first question ever spoke. Plain functions + refs always see live state.
  const supportRef = useRef(support);
  supportRef.current = support;

  function clearSilenceTimer() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }

  function submitAnswer(text: string) {
    const trimmed = text.trim();
    if (!trimmed || statusRef.current === "thinking") return;
    clearSilenceTimer();
    setCaption("");
    setDraft("");
    const next: ChatTurn[] = [...historyRef.current, { role: "candidate", text: trimmed }];
    setHistory(next);
    fetchNextLine(next);
  }

  function finishAnswer() {
    const transcript = stopListening();
    if (transcript) {
      submitAnswer(transcript);
    } else if (statusRef.current === "listening") {
      beginListening();
    }
  }
  const finishAnswerRef = useRef(finishAnswer);
  finishAnswerRef.current = finishAnswer;

  function beginListening() {
    if (!voiceOnRef.current || !supportRef.current.stt) {
      setStatus("awaiting-answer");
      return;
    }
    setCaption("");
    setStatus("listening");
    startListening({
      onUpdate: (finalText, interimText) => {
        setCaption((finalText + interimText).trim());
        clearSilenceTimer();
        if (finalText.trim()) {
          silenceTimerRef.current = setTimeout(
            () => finishAnswerRef.current(),
            SILENCE_SUBMIT_MS
          );
        }
      },
      onError: () => {
        setMicBlocked(true);
        setStatus("awaiting-answer");
      },
    });
  }
  const beginListeningRef = useRef(beginListening);
  beginListeningRef.current = beginListening;

  function deliverLine(line: string) {
    if (voiceOnRef.current && supportRef.current.tts) {
      setStatus("speaking");
      speak(line, () => {
        if (statusRef.current === "speaking") beginListeningRef.current();
      });
    } else {
      setStatus("awaiting-answer");
    }
  }

  async function fetchNextLine(currentHistory: ChatTurn[]) {
    setStatus("thinking");
    setError(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track: trackId,
          history: currentHistory,
          resumeText: resumeText || undefined,
          prefs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setHistory([...currentHistory, { role: "interviewer", text: data.reply }]);
      deliverLine(data.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setHistory(currentHistory);
      setStatus("error");
    }
  }

  function beginInterview() {
    sessionIdRef.current = crypto.randomUUID();
    startedAtRef.current = new Date().toISOString();
    try {
      window.localStorage.setItem(RESUME_KEY, resumeText);
    } catch {
      /* private mode */
    }
    setStage("live");
    fetchNextLine([]);
  }

  function endInterview() {
    // Flip status before stopping audio: cancelling TTS fires its onEnd,
    // which would otherwise see "speaking" and reopen the microphone.
    statusRef.current = "idle";
    setStatus("idle");
    stopListening();
    stopSpeaking();
    clearSilenceTimer();
    setStage("ending");
    const id = sessionIdRef.current;
    saveSession({
      id,
      track: trackId,
      startedAt: startedAtRef.current,
      endedAt: new Date().toISOString(),
      resumeSnapshot: resumeText || undefined,
      prefs,
      transcript: historyRef.current,
    });
    router.push(`/results/${id}`);
  }

  async function handlePdfUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/resume", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setResumeText(data.text);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function toggleVoice() {
    if (voiceOn) {
      const partial = stopListening();
      stopSpeaking();
      clearSilenceTimer();
      setVoiceOn(false);
      if (partial) setDraft(partial);
      setCaption("");
      if (statusRef.current === "speaking" || statusRef.current === "listening") {
        setStatus("awaiting-answer");
      }
    } else {
      setVoiceOn(true);
      if (statusRef.current === "awaiting-answer") beginListening();
    }
  }

  function toggle3D() {
    setUse3D((v) => {
      try {
        window.localStorage.setItem("interviewme.avatar3d", v ? "0" : "1");
      } catch {
        /* private mode */
      }
      return !v;
    });
  }

  const statusLabel: Record<Status, { text: string; cls: string }> = {
    idle: { text: "ready", cls: "text-muted" },
    thinking: { text: "thinking", cls: "text-accent" },
    speaking: { text: `${track.persona.name} speaking`, cls: "text-accent" },
    listening: { text: "listening", cls: "text-sage" },
    "awaiting-answer": { text: "your turn", cls: "text-sage" },
    error: { text: "error", cls: "text-danger" },
  };

  /* ---------- setup stage ---------- */
  if (stage === "setup") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-widest text-muted hover:text-accent"
          >
            ← lobby
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{track.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {track.persona.name} · {track.persona.title}
          </p>

          <div className="mt-8 rounded-xl border border-line bg-surface p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-accent">
              before you walk in
            </p>
            <p className="mt-2 text-sm text-muted">
              Everything here is optional — but a resume makes the interview
              personal: {track.persona.name} will dig into your actual projects.
            </p>

            <label className="mt-5 block font-mono text-xs uppercase tracking-widest text-muted">
              resume
            </label>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={6}
              placeholder="Paste your resume as plain text…"
              className="mt-2 w-full resize-y rounded-lg border border-line bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:border-accent/60 focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-3">
              <label className="cursor-pointer rounded-md border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:border-accent/50 hover:text-accent">
                {uploading ? "parsing…" : "or upload pdf"}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePdfUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {resumeText && (
                <span className="font-mono text-xs text-sage">
                  {resumeText.length.toLocaleString()} chars loaded
                </span>
              )}
            </div>
            {uploadError && <p className="mt-2 text-sm text-danger">{uploadError}</p>}

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-mono text-xs uppercase tracking-widest text-muted">
                  target company
                </label>
                <input
                  value={prefs.company ?? ""}
                  onChange={(e) => setPrefs({ ...prefs, company: e.target.value })}
                  placeholder="e.g. Cisco"
                  className="mt-2 w-full rounded-lg border border-line bg-background px-4 py-2.5 text-sm focus:border-accent/60 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase tracking-widest text-muted">
                  seniority
                </label>
                <select
                  value={prefs.seniority ?? ""}
                  onChange={(e) => setPrefs({ ...prefs, seniority: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-line bg-background px-4 py-2.5 text-sm focus:border-accent/60 focus:outline-none"
                >
                  <option value="">— pick one —</option>
                  <option>Internship</option>
                  <option>New grad / campus hire</option>
                  <option>Junior (0–2 years)</option>
                  <option>Mid-level (2–5 years)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block font-mono text-xs uppercase tracking-widest text-muted">
                  weak areas to drill
                </label>
                <input
                  value={prefs.weakAreas ?? ""}
                  onChange={(e) => setPrefs({ ...prefs, weakAreas: e.target.value })}
                  placeholder="e.g. dynamic programming, subnetting, explaining trade-offs"
                  className="mt-2 w-full rounded-lg border border-line bg-background px-4 py-2.5 text-sm focus:border-accent/60 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={beginInterview}
              className="mt-8 w-full rounded-lg bg-accent px-8 py-3.5 font-medium text-background transition-opacity hover:opacity-90"
            >
              Walk into the room
            </button>
            <p className="mt-3 text-center text-xs text-muted/70">
              {support.stt
                ? "Your browser will ask for microphone access — allow it for the spoken interview."
                : "Speech recognition isn't supported in this browser — you'll type instead. Chrome or Edge gives you the full voice experience."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ---------- live stage: the meeting room ---------- */
  const lastInterviewerLine =
    [...history].reverse().find((t) => t.role === "interviewer")?.text ?? "";

  const captionPill = "pointer-events-auto w-full max-w-2xl rounded-xl border bg-background/85 px-4 py-3 shadow-xl backdrop-blur-md";

  return (
    <main className="flex h-screen flex-col">
      {/* meeting top bar */}
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-danger">
            <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
            rec
          </span>
          <div>
            <h1 className="text-sm font-medium leading-tight">
              {track.name} — Mock Interview
            </h1>
            <p className="text-xs text-muted">
              {track.persona.name} · {track.persona.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5 font-mono text-xs text-muted">
          <span>{formatClock(elapsed)}</span>
          <span>
            Q <span className="text-accent">{String(questionCount).padStart(2, "0")}</span> / ~
            {track.turnBudget}
          </span>
          <span className={`uppercase tracking-widest ${statusLabel[status].cls}`}>
            {statusLabel[status].text}
          </span>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {/* stage: two video tiles */}
        <div className="relative flex flex-1 flex-col">
          <div className="grid flex-1 grid-cols-1 content-center gap-4 p-4 pb-24 md:grid-cols-2 md:gap-6 md:p-6 md:pb-28">
            {/* interviewer tile */}
            <div className="mx-auto aspect-video w-full max-w-2xl">
              {use3D ? (
                <Avatar3D state={avatarState} name={track.persona.name} />
              ) : (
                <Avatar2D state={avatarState} name={track.persona.name} />
              )}
            </div>

            {/* your tile */}
            <div
              className={`relative mx-auto aspect-video w-full max-w-2xl overflow-hidden rounded-xl border bg-surface-raised transition-colors ${
                status === "listening" ? "border-sage/60" : "border-line"
              }`}
            >
              {status === "listening" && (
                <>
                  <span className="pulse-ring" />
                  <span className="pulse-ring" />
                </>
              )}
              {camOn && !camError ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover [transform:scaleX(-1)]"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
                    <span className="text-2xl font-medium text-accent">Y</span>
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    {camError ? "camera unavailable" : "camera off"}
                  </p>
                </div>
              )}
              <div className="absolute bottom-3 left-3 rounded-md bg-background/70 px-2.5 py-1 font-mono text-xs tracking-wider text-foreground/90 backdrop-blur-sm">
                You
              </div>
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md bg-background/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest backdrop-blur-sm">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    status === "listening"
                      ? "bg-sage"
                      : voiceActive
                        ? "bg-muted/60"
                        : "bg-danger/70"
                  }`}
                />
                <span className="text-muted">
                  {status === "listening" ? "mic live" : voiceActive ? "mic ready" : "mic off"}
                </span>
              </div>
            </div>
          </div>

          {/* captions + turn controls, floating like meeting CC */}
          <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center px-4">
            {status === "speaking" && (
              <div className={`${captionPill} border-accent/30`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
                      cc · {track.persona.name}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">{lastInterviewerLine}</p>
                  </div>
                  <button
                    onClick={() => {
                      stopSpeaking();
                      beginListening();
                    }}
                    className="shrink-0 font-mono text-xs uppercase tracking-widest text-muted hover:text-accent"
                  >
                    skip →
                  </button>
                </div>
              </div>
            )}
            {status === "listening" && (
              <div className={`${captionPill} border-sage/40`}>
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-sage">
                      ● you — live transcript
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                      {caption || <span className="text-muted/50">say something…</span>}
                    </p>
                  </div>
                  <button
                    onClick={finishAnswer}
                    className="shrink-0 rounded-lg bg-sage px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
            {status === "thinking" && (
              <div className={`${captionPill} border-line`}>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent" />
                    <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent" />
                    <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  <p className="text-sm text-muted">{track.persona.name} is thinking…</p>
                </div>
              </div>
            )}
            {status === "awaiting-answer" && (
              <div className={`${captionPill} border-line`}>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted">
                    {voiceActive
                      ? "Your turn — speak when ready, or type in the transcript panel."
                      : "Your turn — type your answer in the transcript panel."}
                  </p>
                  {voiceActive ? (
                    <button
                      onClick={beginListening}
                      className="shrink-0 font-mono text-xs uppercase tracking-widest text-sage hover:underline"
                    >
                      ● resume listening
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowTranscript(true)}
                      className="shrink-0 font-mono text-xs uppercase tracking-widest text-accent hover:underline"
                    >
                      open panel →
                    </button>
                  )}
                </div>
              </div>
            )}
            {status === "error" && error && (
              <div className={`${captionPill} border-danger/40`}>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-danger">{error}</p>
                  <button
                    onClick={() => fetchNextLine(history)}
                    className="shrink-0 font-mono text-xs uppercase tracking-widest text-accent hover:underline"
                  >
                    retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* transcript side panel */}
        {showTranscript && (
          <aside className="absolute inset-y-0 right-0 z-20 flex w-80 max-w-[85vw] flex-col border-l border-line bg-background md:static md:z-auto">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-mono text-xs uppercase tracking-widest text-muted">
                transcript · {history.length}
              </p>
              <button
                onClick={() => setShowTranscript(false)}
                className="text-muted transition-colors hover:text-accent"
                aria-label="Close transcript"
              >
                ✕
              </button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
              <div className="flex flex-col gap-4">
                {history.map((turn, i) =>
                  turn.role === "interviewer" ? (
                    <div key={i}>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-accent/80">
                        {track.persona.name}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed">{turn.text}</p>
                    </div>
                  ) : (
                    <div key={i} className="text-right">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                        you
                      </p>
                      <p className="mt-0.5 rounded-lg bg-surface px-3 py-2 text-left text-sm leading-relaxed text-foreground/90">
                        {turn.text}
                      </p>
                    </div>
                  )
                )}
                {micBlocked && (
                  <p className="rounded-lg border border-line bg-surface p-3 text-xs text-muted">
                    Mic access is blocked — typing works. Allow the microphone in
                    site settings and reload for voice.
                  </p>
                )}
              </div>
            </div>
            <div className="border-t border-line p-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitAnswer(draft);
                    }
                  }}
                  rows={2}
                  placeholder={
                    status === "thinking"
                      ? `${track.persona.name} is thinking…`
                      : "Type your answer…"
                  }
                  disabled={status === "thinking" || stage === "ending"}
                  className="flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-accent/60 focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={() => submitAnswer(draft)}
                  disabled={status === "thinking" || !draft.trim() || stage === "ending"}
                  className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* control bar */}
      <footer className="flex items-center justify-center gap-3 border-t border-line bg-surface/50 px-4 py-3">
        <button
          onClick={toggleVoice}
          title={voiceOn ? "Turn voice off" : "Turn voice on"}
          className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
            voiceOn
              ? "border-line bg-surface text-foreground hover:border-accent/50"
              : "border-danger/50 bg-danger/20 text-danger"
          }`}
        >
          {voiceOn ? <MicIcon /> : <MicOffIcon />}
        </button>
        <button
          onClick={() => {
            if (camError) {
              setCamError(false);
              setCamOn(true);
            } else {
              setCamOn((v) => !v);
            }
          }}
          title={camOn ? "Turn camera off" : "Turn camera on"}
          className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
            camOn && !camError
              ? "border-line bg-surface text-foreground hover:border-accent/50"
              : "border-danger/50 bg-danger/20 text-danger"
          }`}
        >
          {camOn && !camError ? <CamIcon /> : <CamOffIcon />}
        </button>
        <button
          onClick={() => setShowTranscript((v) => !v)}
          title="Transcript"
          className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
            showTranscript
              ? "border-accent/50 bg-accent-soft text-accent"
              : "border-line bg-surface text-foreground hover:border-accent/50"
          }`}
        >
          <ChatIcon />
        </button>
        <button
          onClick={toggle3D}
          title="Toggle 3D avatar"
          className={`flex h-11 w-11 items-center justify-center rounded-full border font-mono text-xs transition-colors ${
            use3D
              ? "border-accent/50 bg-accent-soft text-accent"
              : "border-line bg-surface text-muted hover:border-accent/50 hover:text-accent"
          }`}
        >
          3D
        </button>
        <div className="mx-2 h-8 w-px bg-line" />
        <button
          onClick={endInterview}
          disabled={stage === "ending" || history.length < 2}
          className="flex items-center gap-2 rounded-full bg-danger px-5 py-2.5 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <PhoneIcon />
          {stage === "ending" ? "Wrapping up…" : "Leave & get report"}
        </button>
      </footer>
    </main>
  );
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ---------- control bar icons ---------- */

const iconProps = {
  className: "h-5 w-5",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function MicIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 5a3 3 0 0 1 6 0v6" />
      <path d="M19 11a7 7 0 0 1-.64 2.95M15.54 15.54A7 7 0 0 1 5 11" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4" y1="4" x2="20" y2="20" />
    </svg>
  );
}

function CamIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2" y="6" width="13" height="12" rx="2" />
      <path d="m15 10 6-3v10l-6-3" />
    </svg>
  );
}

function CamOffIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2" y="6" width="13" height="12" rx="2" />
      <path d="m15 10 6-3v10l-6-3" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...iconProps} className="h-4 w-4">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
