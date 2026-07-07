"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  AudioWaveform,
  Brain,
  ChevronDown,
  ClipboardCheck,
  Code2,
  Cpu,
  Database,
  FileText,
  Mic,
  Network,
  Sparkles,
  Timer,
  Volume2,
} from "lucide-react";
import { tracks } from "@/lib/tracks";
import { listSessions } from "@/lib/sessions";
import type { StoredSession, TrackId } from "@/lib/types";

const roomMeta: Record<TrackId, { room: string; icon: React.ReactNode; blurb: string }> = {
  cisco_ideathon: {
    room: "Room 02",
    icon: <Network className="h-5 w-5" />,
    blurb:
      "The full multi-round gauntlet: fundamentals rapid-fire, idea pitch, resume grilling, CS deep-dive, then a managerial curveball.",
  },
  sde: {
    room: "Room 01",
    icon: <Code2 className="h-5 w-5" />,
    blurb: "DSA out loud, entry-level system design, and a deep dive on your strongest project.",
  },
  ai_engineer: {
    room: "Room 03",
    icon: <Brain className="h-5 w-5" />,
    blurb: "LLM architecture reasoning, prompt trade-offs, evals and guardrails thinking.",
  },
  ml_engineer: {
    room: "Room 04",
    icon: <Cpu className="h-5 w-5" />,
    blurb: "Classical ML fundamentals, a live modeling case, deployment and monitoring.",
  },
  data_engineer: {
    room: "Room 05",
    icon: <Database className="h-5 w-5" />,
    blurb: "Pipeline design, SQL depth, data modeling trade-offs, scaling scenarios.",
  },
};

const sideRooms: TrackId[] = ["sde", "ai_engineer", "ml_engineer", "data_engineer"];

export default function Home() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);

  // localStorage only exists client-side; read after mount to avoid hydration mismatch
  useEffect(() => {
    setSessions(listSessions());
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      {/* ---------- nav ---------- */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-background/75 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-background">
              <AudioWaveform className="h-4.5 w-4.5" />
            </span>
            <span className="text-[17px] font-semibold tracking-tight">
              Interview<span className="text-accent">Me</span>
            </span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-muted md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#rooms" className="transition-colors hover:text-foreground">
              Interview rooms
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </div>
          <a
            href="#rooms"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Start practicing
          </a>
        </nav>
      </header>

      <main className="flex-1">
        {/* ---------- hero ---------- */}
        <section className="hero-grid relative overflow-hidden px-6 pb-20 pt-36 md:pt-44">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
            <div className="fade-up inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-4 py-1.5 text-xs font-medium text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Now with ElevenLabs neural voices for every interviewer
            </div>

            <h1
              className="fade-up mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl"
              style={{ animationDelay: "0.08s" }}
            >
              The mock interview that <span className="text-gradient">actually talks back</span>
            </h1>

            <p
              className="fade-up mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg"
              style={{ animationDelay: "0.16s" }}
            >
              A live, spoken conversation with an AI interviewer who listens, pushes back with
              real follow-ups, digs into your resume — and hands you a brutally honest report
              when you leave the room.
            </p>

            <div
              className="fade-up mt-9 flex flex-col items-center gap-3 sm:flex-row"
              style={{ animationDelay: "0.24s" }}
            >
              <a
                href="#rooms"
                className="group inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-3.5 font-medium text-background transition-all hover:opacity-90"
              >
                Start a free mock interview
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-7 py-3.5 font-medium text-foreground transition-colors hover:border-accent/50"
              >
                See how it works
              </a>
            </div>

            <p
              className="fade-up mt-6 font-mono text-[11px] uppercase tracking-[0.25em] text-muted/70"
              style={{ animationDelay: "0.3s" }}
            >
              No sign-up · Runs in your browser · Voice-first
            </p>

            {/* ---------- product mockup ---------- */}
            <div
              className="fade-up mt-16 w-full max-w-4xl"
              style={{ animationDelay: "0.38s" }}
            >
              <div className="glow-panel overflow-hidden rounded-2xl border border-line bg-surface">
                {/* window chrome */}
                <div className="flex items-center justify-between border-b border-line bg-surface-raised/60 px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-accent/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-sage/60" />
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
                    rec · cisco ideathon · 12:04
                  </div>
                  <span className="font-mono text-[10px] text-muted/60">Q 07 / ~16</span>
                </div>
                {/* two tiles */}
                <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4">
                  <div className="relative flex aspect-video flex-col items-center justify-center rounded-xl border border-accent/30 bg-background/60">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-xl font-semibold text-accent sm:h-16 sm:w-16">
                      V
                    </div>
                    <div className="mt-3 flex h-5 items-end justify-center gap-[3px]">
                      {[0, 0.15, 0.3, 0.1, 0.25, 0.05, 0.2].map((d, i) => (
                        <span key={i} className="eq-bar" style={{ animationDelay: `${d}s` }} />
                      ))}
                    </div>
                    <span className="absolute bottom-2.5 left-3 rounded bg-background/70 px-2 py-0.5 font-mono text-[10px] tracking-wider text-foreground/80">
                      Vikram · Interviewer
                    </span>
                    <span className="absolute bottom-2.5 right-3 font-mono text-[9px] uppercase tracking-widest text-accent">
                      speaking
                    </span>
                  </div>
                  <div className="relative flex aspect-video flex-col items-center justify-center rounded-xl border border-line bg-background/60">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-raised text-xl font-semibold text-muted sm:h-16 sm:w-16">
                      Y
                    </div>
                    <span className="absolute bottom-2.5 left-3 rounded bg-background/70 px-2 py-0.5 font-mono text-[10px] tracking-wider text-foreground/80">
                      You
                    </span>
                    <span className="absolute bottom-2.5 right-3 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-sage">
                      <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                      mic ready
                    </span>
                  </div>
                </div>
                {/* caption bar */}
                <div className="mx-3 mb-3 rounded-lg border border-accent/20 bg-background/70 px-4 py-3 text-left sm:mx-4 sm:mb-4">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-accent">
                    cc · vikram
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/85 sm:text-sm">
                    &ldquo;You said the bottleneck was the database — walk me through how you
                    actually measured that before deciding to add a cache.&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* ---------- stats ---------- */}
            <div className="mt-16 grid w-full max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
              {[
                ["5", "specialized interview tracks"],
                ["6", "rounds in the Cisco Ideathon room"],
                ["100%", "voice-driven — no typing needed"],
                ["1", "honest report after every session"],
              ].map(([n, label]) => (
                <div key={label} className="bg-surface px-6 py-6 text-center">
                  <p className="text-3xl font-semibold text-accent">{n}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- features ---------- */}
        <section id="features" className="scroll-mt-24 px-6 py-24">
          <div className="mx-auto w-full max-w-6xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">features</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything a real interview throws at you
            </h2>
            <p className="mt-4 max-w-xl text-muted">
              Not a question bank. A conversation partner that adapts to what you say, the way a
              real interviewer does.
            </p>

            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: <Volume2 className="h-5 w-5" />,
                  title: "Studio-grade voices",
                  body: "Each interviewer speaks with their own ElevenLabs neural voice — Vikram sounds like a 15-year Cisco veteran, not a robot. Falls back to your browser voice automatically.",
                },
                {
                  icon: <Mic className="h-5 w-5" />,
                  title: "A fully spoken loop",
                  body: "You answer out loud. It transcribes live, detects when you've finished, and responds — no buttons, no typing, exactly like a real call.",
                },
                {
                  icon: <Brain className="h-5 w-5" />,
                  title: "Follow-ups that follow",
                  body: "Say something vague and it digs in. Mention a project and it cross-questions your choices. Every next question is built from your last answer.",
                },
                {
                  icon: <FileText className="h-5 w-5" />,
                  title: "Resume-aware grilling",
                  body: "Upload your PDF resume and the interviewer reads it before you walk in — then asks why you chose that stack, that library, that trade-off.",
                },
                {
                  icon: <ClipboardCheck className="h-5 w-5" />,
                  title: "A brutally honest report",
                  body: "Per-question verdicts, the patterns you keep repeating, and a directional readiness score. Praise where earned, specifics where not.",
                },
                {
                  icon: <Timer className="h-5 w-5" />,
                  title: "Real pressure",
                  body: "A live timer, a REC light, a question budget, and an interviewer who doesn't wait around. Practice under the conditions you'll face.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-accent/40"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    {f.icon}
                  </div>
                  <h3 className="mt-4 font-medium">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- how it works ---------- */}
        <section id="how" className="scroll-mt-24 border-y border-line bg-surface/40 px-6 py-24">
          <div className="mx-auto w-full max-w-6xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
              how it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              In the room in under a minute
            </h2>

            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Pick your room",
                  body: "Five tracks, each with its own interviewer persona and interview arc — from SDE rounds to the full Cisco Ideathon shape.",
                },
                {
                  step: "02",
                  title: "Hand over your resume",
                  body: "Paste it or upload the PDF, set your target company and seniority, flag the weak areas you want drilled. All optional.",
                },
                {
                  step: "03",
                  title: "Talk. Then face the report.",
                  body: "Allow the mic and just speak. When you leave, you get a scorecard on every answer and the patterns holding you back.",
                },
              ].map((s) => (
                <div key={s.step} className="relative">
                  <p className="font-mono text-5xl font-semibold text-accent/20">{s.step}</p>
                  <h3 className="mt-3 text-lg font-medium">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- rooms ---------- */}
        <section id="rooms" className="scroll-mt-24 px-6 py-24">
          <div className="mx-auto w-full max-w-6xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
              interview rooms
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Pick a door. Your interviewer is waiting.
            </h2>

            {/* featured: cisco ideathon */}
            <Link
              href="/interview/cisco_ideathon"
              className="group relative mt-12 block overflow-hidden rounded-2xl border border-accent/40 bg-surface p-8 transition-colors hover:border-accent/70 md:p-10"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  background:
                    "radial-gradient(ellipse 60% 90% at 85% 20%, rgba(213,162,78,0.12), transparent 60%)",
                }}
              />
              <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-accent px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-widest text-background">
                      flagship · multi-round
                    </span>
                    <span className="font-mono text-xs uppercase tracking-widest text-muted">
                      {roomMeta.cisco_ideathon.room}
                    </span>
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                    {tracks.cisco_ideathon.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    with {tracks.cisco_ideathon.persona.name} —{" "}
                    {tracks.cisco_ideathon.persona.title}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {roomMeta.cisco_ideathon.blurb}
                  </p>
                </div>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/40 text-accent transition-transform group-hover:translate-x-1">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </div>
            </Link>

            {/* the other four */}
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {sideRooms.map((id) => {
                const track = tracks[id];
                const meta = roomMeta[id];
                return (
                  <Link
                    key={id}
                    href={`/interview/${id}`}
                    className="group rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-accent/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                        {meta.icon}
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                        {meta.room} · open
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-medium">{track.name}</h3>
                    <p className="mt-1 text-sm text-muted">
                      with {track.persona.name} — {track.persona.title}
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-muted/80">{meta.blurb}</p>
                    <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                      Walk in
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </Link>
                );
              })}
            </div>

            {/* past sessions */}
            {sessions.length > 0 && (
              <div className="mt-16">
                <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
                  your past sessions
                </h3>
                <div className="mt-4 flex flex-col gap-2">
                  {sessions.map((s) => {
                    const track = tracks[s.track];
                    const date = new Date(s.startedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });
                    return (
                      <Link
                        key={s.id}
                        href={`/results/${s.id}`}
                        className="flex items-center justify-between rounded-xl border border-line bg-surface px-5 py-3.5 transition-colors hover:border-accent/50"
                      >
                        <div>
                          <p className="text-sm">{track?.name ?? s.track}</p>
                          <p className="font-mono text-xs text-muted">
                            {date} · {s.transcript.length} turns
                          </p>
                        </div>
                        <span className="font-mono text-sm">
                          {s.report ? (
                            <span className="text-accent">{s.report.readiness}/10</span>
                          ) : (
                            <span className="text-muted/60">no report</span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ---------- faq ---------- */}
        <section id="faq" className="scroll-mt-24 border-t border-line px-6 py-24">
          <div className="mx-auto w-full max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">faq</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Before you walk in
            </h2>

            <div className="mt-10 flex flex-col gap-3">
              {[
                {
                  q: "Do I need an account or a credit card?",
                  a: "No. Everything runs in your browser and your sessions are stored locally on your machine. Open a room and start talking.",
                },
                {
                  q: "What happens to my voice and resume?",
                  a: "Your speech is transcribed by your browser's built-in speech recognition. Your resume text is sent only to the AI model to personalize questions — nothing is stored on a server.",
                },
                {
                  q: "What powers the interviewer voices?",
                  a: "With an ElevenLabs API key configured, each persona gets a distinct neural voice. Without one, it automatically uses your browser's best built-in voice.",
                },
                {
                  q: "Which browser should I use?",
                  a: "Chrome or Edge gives you the full voice experience (speech recognition + audio). In other browsers you can still run interviews by typing.",
                },
                {
                  q: "Is the report actually honest?",
                  a: "Yes — it's instructed to be specific and critical, with per-question verdicts and recurring weak patterns, not participation-trophy feedback.",
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="faq-item group rounded-xl border border-line bg-surface px-5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium">
                    {item.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-5 text-sm leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="px-6 pb-24">
          <div className="glow-panel mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-accent/30 bg-surface px-8 py-16 text-center md:py-20">
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              The best time to bomb an interview is{" "}
              <span className="text-gradient">before the real one</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted">
              Five rooms, five interviewers, zero judgment that follows you out of the room.
            </p>
            <a
              href="#rooms"
              className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-4 font-medium text-background transition-opacity hover:opacity-90"
            >
              Walk into a room
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </section>
      </main>

      {/* ---------- footer ---------- */}
      <footer className="border-t border-line px-6 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-background">
              <AudioWaveform className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">
              Interview<span className="text-accent">Me</span>
            </span>
          </div>
          <p className="text-center text-xs text-muted">
            Built for the Cisco Ideathon and every interview after it.
          </p>
          <div className="flex items-center gap-6 text-xs text-muted">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#rooms" className="transition-colors hover:text-foreground">
              Rooms
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
