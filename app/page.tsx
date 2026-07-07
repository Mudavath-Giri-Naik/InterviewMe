"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
  Timer,
  Volume2,
} from "lucide-react";
import { tracks } from "@/lib/tracks";
import { listSessions } from "@/lib/sessions";
import type { StoredSession, TrackId } from "@/lib/types";

/* ---------------------------------- data ---------------------------------- */

const ink = "#17140F";

const personas: {
  id: TrackId;
  room: string;
  color: string; // saturated
  soft: string; // pastel card bg
  rotate: number;
  icon: React.ReactNode;
  blurb: string;
}[] = [
  {
    id: "sde",
    room: "01",
    color: "#E8A200",
    soft: "#FFF3C4",
    rotate: -7,
    icon: <Code2 className="h-5 w-5" />,
    blurb: "DSA out loud, entry-level system design, and a deep dive on your best project.",
  },
  {
    id: "cisco_ideathon",
    room: "02",
    color: "#3E9B4F",
    soft: "#DFF5D8",
    rotate: 5,
    icon: <Network className="h-5 w-5" />,
    blurb:
      "The full multi-round gauntlet — fundamentals rapid-fire, idea pitch, resume grilling, CS deep-dive, managerial curveball.",
  },
  {
    id: "ai_engineer",
    room: "03",
    color: "#3B72E8",
    soft: "#DFEAFF",
    rotate: -3,
    icon: <Brain className="h-5 w-5" />,
    blurb: "LLM architecture reasoning, prompt trade-offs, evals and guardrails thinking.",
  },
  {
    id: "ml_engineer",
    room: "04",
    color: "#F4407E",
    soft: "#FFE1EA",
    rotate: 6,
    icon: <Cpu className="h-5 w-5" />,
    blurb: "ML fundamentals, a live modeling case, deployment and monitoring awareness.",
  },
  {
    id: "data_engineer",
    room: "05",
    color: "#7A52E0",
    soft: "#EAE1FF",
    rotate: -5,
    icon: <Database className="h-5 w-5" />,
    blurb: "Pipeline design, SQL depth, data modeling trade-offs, scaling scenarios.",
  },
];

const cursors = [
  { name: "Priya", color: "#E8A200", cls: "left-[3%] top-[24%]", dur: 4.2 },
  { name: "Vikram", color: "#3E9B4F", cls: "right-[4%] top-[16%]", dur: 5.1 },
  { name: "Rohan", color: "#3B72E8", cls: "left-[9%] bottom-[10%]", dur: 4.7 },
  { name: "Ananya", color: "#F4407E", cls: "right-[8%] bottom-[18%]", dur: 5.6 },
  { name: "Karthik", color: "#7A52E0", cls: "right-[22%] top-[52%]", dur: 4.4 },
];

const marqueeItems = [
  "real follow-ups",
  "elevenlabs voices",
  "resume grilling",
  "brutally honest reports",
  "no sign-up",
  "voice-first",
  "5 interview rooms",
];

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

/* bento grid: tiles stagger in, then their inner mockup rows cascade */
const bentoGrid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
const bentoTile = {
  hidden: { opacity: 0, y: 34 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: "easeOut" as const,
      staggerChildren: 0.07,
      delayChildren: 0.18,
    },
  },
};
const bentoItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

/* ------------------------------- tiny pieces ------------------------------ */

function Pin({ color }: { color: string }) {
  return (
    <svg
      width="26"
      height="30"
      viewBox="0 0 26 30"
      className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 drop-shadow-[0_4px_3px_rgba(0,0,0,0.18)]"
      aria-hidden
    >
      <rect x="12" y="13" width="2.4" height="13" rx="1.2" fill="#8f969e" />
      <circle cx="13" cy="9" r="8.2" fill={color} />
      <circle cx="10" cy="6.2" r="2.8" fill="white" opacity="0.55" />
    </svg>
  );
}

function CursorTag({ name, color }: { name: string; color: string }) {
  return (
    <div className="flex items-start">
      <svg width="19" height="19" viewBox="0 0 20 20" aria-hidden>
        <path fill={color} stroke="white" strokeWidth="1.2" d="M2.5 1.5 17.2 8.6l-6.8 1.7-3.9 6z" />
      </svg>
      <span
        className="-ml-0.5 mt-2.5 whitespace-nowrap rounded-full rounded-tl-sm px-3 py-1 text-xs font-semibold text-white shadow-md"
        style={{ background: color }}
      >
        {name}
      </span>
    </div>
  );
}

function Squiggle() {
  return (
    <svg
      viewBox="0 0 230 14"
      className="absolute -bottom-2 left-0 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M4 10 C 60 3, 120 2, 226 7"
        stroke="#FF7EB0"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function Home() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);

  // localStorage only exists client-side; read after mount to avoid hydration mismatch
  useEffect(() => {
    setSessions(listSessions());
  }, []);

  return (
    <div
      className="min-h-screen w-full overflow-x-clip bg-[#F6F3EC] text-[#17140F] selection:bg-[#FFD84D] selection:text-[#17140F]"
      style={{ color: ink }}
    >
      {/* ---------- floating pill nav ---------- */}
      <header className="fixed inset-x-0 top-4 z-50 px-4">
        <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between rounded-full border border-black/10 bg-white/85 px-3 pl-5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#17140F] text-white">
              <AudioWaveform className="h-4 w-4" />
            </span>
            <span className="text-[16px] font-bold tracking-tight">
              Interview<span className="text-[#F4407E]">Me</span>
            </span>
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-black/60 md:flex">
            <a href="#interviewers" className="transition-colors hover:text-black">
              Interviewers
            </a>
            <a href="#features" className="transition-colors hover:text-black">
              Features
            </a>
            <a href="#how" className="transition-colors hover:text-black">
              How it works
            </a>
            <a href="#faq" className="transition-colors hover:text-black">
              FAQ
            </a>
          </div>
          <a
            href="#interviewers"
            className="rounded-full bg-[#17140F] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
          >
            Start free
          </a>
        </nav>
      </header>

      <main>
        {/* ---------- hero ---------- */}
        <section className="relative px-6 pb-16 pt-36 md:pt-44">
          {/* dotted notebook backdrop — separate layer so its fade mask
              doesn't swallow the content */}
          <div className="paper-grid pointer-events-none absolute inset-0" aria-hidden />
          {/* floating interviewer cursors */}
          <div className="pointer-events-none absolute inset-0 hidden lg:block">
            {cursors.map((c, i) => (
              <motion.div
                key={c.name}
                className={`absolute ${c.cls}`}
                animate={{ y: [0, -12, 0], x: [0, i % 2 ? 8 : -8, 0] }}
                transition={{ duration: c.dur, repeat: Infinity, ease: "easeInOut" }}
              >
                <CursorTag name={c.name} color={c.color} />
              </motion.div>
            ))}
          </div>

          <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
            <motion.div
              {...reveal}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-semibold shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3E9B4F] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3E9B4F]" />
              </span>
              5 AI interviewers online now
            </motion.div>

            <motion.h1
              {...reveal}
              transition={{ ...reveal.transition, delay: 0.06 }}
              className="mt-7 text-balance text-5xl font-bold leading-[1.04] tracking-tight sm:text-7xl"
            >
              The interview{" "}
              <span className="relative inline-block">
                <span className="font-serif-accent italic">before</span>
                <Squiggle />
              </span>{" "}
              the interview.
            </motion.h1>

            <motion.p
              {...reveal}
              transition={{ ...reveal.transition, delay: 0.12 }}
              className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-black/60 sm:text-lg"
            >
              Talk out loud to an AI interviewer with a real voice and real follow-up
              questions — then get a report that doesn&apos;t sugar-coat anything. Free, in
              your browser.
            </motion.p>

            <motion.div
              {...reveal}
              transition={{ ...reveal.transition, delay: 0.18 }}
              className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
            >
              <a
                href="#interviewers"
                className="group inline-flex items-center gap-2.5 rounded-full bg-[#17140F] px-7 py-4 font-semibold text-white shadow-[0_16px_40px_-12px_rgba(0,0,0,0.4)] transition-transform hover:scale-[1.03]"
              >
                <Mic className="h-4.5 w-4.5 text-[#FFD84D]" />
                Start talking — it&apos;s free
              </a>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-7 py-4 font-semibold transition-colors hover:border-black/40"
              >
                How it works
                <ChevronDown className="h-4 w-4" />
              </a>
            </motion.div>

            <motion.p
              {...reveal}
              transition={{ ...reveal.transition, delay: 0.24 }}
              className="mt-6 text-xs font-medium uppercase tracking-[0.22em] text-black/40"
            >
              no sign-up · no credit card · just your voice
            </motion.p>
          </div>

          {/* ---------- fanned interviewer cards ---------- */}
          <div id="interviewers" className="relative mx-auto mt-20 max-w-6xl scroll-mt-32">
            <motion.div {...reveal} className="flex flex-wrap items-end justify-center md:-space-x-5">
              {personas.map((p) => {
                const track = tracks[p.id];
                return (
                  <Link key={p.id} href={`/interview/${p.id}`} className="relative m-2 md:m-0">
                    <motion.div
                      initial={{ rotate: p.rotate, y: Math.abs(p.rotate) * 2.2 }}
                      whileHover={{ rotate: 0, y: -16, scale: 1.05, zIndex: 20 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18 }}
                      className="relative w-44 rounded-2xl border border-black/10 bg-white p-4 pb-5 shadow-[0_18px_44px_-16px_rgba(0,0,0,0.25)] sm:w-48"
                      style={{ transformOrigin: "50% 100%" }}
                    >
                      <Pin color={p.color} />
                      {p.id === "cisco_ideathon" && (
                        <span className="absolute -right-2.5 -top-3 rotate-12 text-2xl">👑</span>
                      )}
                      <div
                        className="mt-2 flex h-24 items-center justify-center rounded-xl text-4xl font-bold"
                        style={{ background: p.soft, color: p.color }}
                      >
                        {track.persona.name[0]}
                      </div>
                      <p className="mt-3 text-base font-bold">{track.persona.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-black/50">
                        {track.persona.title}
                      </p>
                      <p
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold"
                        style={{ color: p.color }}
                      >
                        Room {p.room} · walk in
                        <ArrowRight className="h-3 w-3" />
                      </p>
                    </motion.div>
                  </Link>
                );
              })}
            </motion.div>

            {/* floating speech pills */}
            <motion.div
              className="absolute -top-8 left-[6%] hidden xl:block"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="rounded-full rounded-bl-sm border border-black/10 bg-white px-4 py-2 text-xs font-medium shadow-md">
                💬 &ldquo;why both IP <span className="font-bold">and</span> MAC addresses?&rdquo;
              </span>
            </motion.div>
            <motion.div
              className="absolute -top-10 right-[5%] hidden xl:block"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
              <span className="rounded-full rounded-br-sm border border-black/10 bg-white px-4 py-2 text-xs font-medium shadow-md">
                🔥 &ldquo;walk me through that trade-off&rdquo;
              </span>
            </motion.div>
          </div>
        </section>

        {/* ---------- marquee ---------- */}
        <div className="relative -mx-2 -rotate-1 overflow-hidden bg-[#17140F] py-3.5">
          <div className="marquee-track">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0 items-center">
                {marqueeItems.map((item) => (
                  <span
                    key={`${dup}-${item}`}
                    className="flex items-center gap-6 pr-6 text-sm font-bold uppercase tracking-[0.18em] text-white"
                  >
                    {item}
                    <span className="text-[#FFD84D]">✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ---------- features ---------- */}
        <section id="features" className="scroll-mt-28 px-6 py-24 md:py-28">
          <div className="mx-auto w-full max-w-6xl">
            <motion.div {...reveal} className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#F4407E]">
                what&apos;s inside
              </p>
              <h2 className="mx-auto mt-3 max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                Not a question bank.{" "}
                <span className="font-serif-accent italic">A sparring partner.</span>
              </h2>
            </motion.div>

            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  n: "01",
                  soft: "#FFF3C4",
                  color: "#E8A200",
                  icon: <Volume2 className="h-5 w-5" />,
                  title: "It talks. Out loud.",
                  body: "Every interviewer has their own ElevenLabs neural voice — Vikram sounds like 15 years at Cisco, not text-to-speech from 2009.",
                  r: -1.2,
                },
                {
                  n: "02",
                  soft: "#FFE1EA",
                  color: "#F4407E",
                  icon: <Brain className="h-5 w-5" />,
                  title: "Follow-ups that follow",
                  body: "Say something vague and it digs in. Mention a project and it cross-questions your choices. Nothing is scripted.",
                  r: 1,
                },
                {
                  n: "03",
                  soft: "#DFF5D8",
                  color: "#3E9B4F",
                  icon: <FileText className="h-5 w-5" />,
                  title: "Reads your resume first",
                  body: "Upload the PDF and walk in — then defend that stack choice, that library, that one bullet point you thought nobody would ask about.",
                  r: -0.8,
                },
                {
                  n: "04",
                  soft: "#DFEAFF",
                  color: "#3B72E8",
                  icon: <Mic className="h-5 w-5" />,
                  title: "Hands-free loop",
                  body: "It transcribes you live and detects when you're done talking. No buttons, no typing — exactly like the real call.",
                  r: 1.2,
                },
                {
                  n: "05",
                  soft: "#EAE1FF",
                  color: "#7A52E0",
                  icon: <ClipboardCheck className="h-5 w-5" />,
                  title: "A report with receipts",
                  body: "Per-question verdicts, the patterns you keep repeating, and a readiness score. Praise where earned. Specifics where not.",
                  r: -1,
                },
                {
                  n: "06",
                  soft: "#FFE6D4",
                  color: "#F06A2D",
                  icon: <Timer className="h-5 w-5" />,
                  title: "Pressure included",
                  body: "Live timer, REC light, question budget, an interviewer who doesn't wait around. Sweat here so you don't sweat there.",
                  r: 0.8,
                },
              ].map((f, i) => (
                <motion.div
                  key={f.n}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: (i % 3) * 0.08 }}
                  whileHover={{ rotate: 0, y: -6 }}
                  style={{ rotate: f.r }}
                  className="relative rounded-3xl border border-black/10 p-7 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.2)]"
                >
                  <div className="absolute inset-0 rounded-3xl" style={{ background: f.soft }} />
                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <span className="text-3xl font-black" style={{ color: f.color }}>
                        {f.n}
                      </span>
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm"
                        style={{ color: f.color }}
                      >
                        {f.icon}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-black/60">{f.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- how it works: sticky notes ---------- */}
        <section id="how" className="scroll-mt-28 px-6 pb-24 md:pb-28">
          <div className="mx-auto w-full max-w-6xl">
            <motion.div {...reveal} className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B72E8]">
                how it works
              </p>
              <h2 className="mx-auto mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                In the room in <span className="font-serif-accent italic">60 seconds</span>
              </h2>
            </motion.div>

            <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  bg: "#FFE99A",
                  r: -2.5,
                  step: "1",
                  title: "Pick your interviewer",
                  body: "Five rooms, five personalities — from Priya's SDE round to Vikram's full Cisco Ideathon gauntlet.",
                },
                {
                  bg: "#FFC9DB",
                  r: 1.8,
                  step: "2",
                  title: "Hand over your resume",
                  body: "Paste it or drop the PDF. Set target company, seniority, and the weak spots you want drilled. All optional.",
                },
                {
                  bg: "#C9F0BE",
                  r: -1.5,
                  step: "3",
                  title: "Talk. Then read the damage.",
                  body: "Allow the mic and just speak. Leave whenever — the report shows every answer, judged honestly.",
                },
              ].map((s, i) => (
                <motion.div
                  key={s.step}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: i * 0.1 }}
                  whileHover={{ rotate: 0, scale: 1.02 }}
                  style={{ rotate: s.r, background: s.bg }}
                  className="relative rounded-lg p-7 pt-9 shadow-[0_20px_44px_-18px_rgba(0,0,0,0.28)]"
                >
                  {/* tape */}
                  <div className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-3 rounded-sm bg-white/60 shadow-sm backdrop-blur-[1px]" />
                  <span className="font-serif-accent text-5xl italic text-black/25">{s.step}</span>
                  <h3 className="mt-2 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-black/60">{s.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- rooms detail ---------- */}
        <section id="rooms" className="scroll-mt-28 border-t border-black/10 bg-white/50 px-6 py-24">
          <div className="mx-auto w-full max-w-6xl">
            <motion.div {...reveal}>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3E9B4F]">
                the rooms
              </p>
              <h2 className="mt-3 max-w-xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                Pick a door. <span className="font-serif-accent italic">They&apos;re waiting.</span>
              </h2>
            </motion.div>

            <motion.div
              variants={bentoGrid}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
            >
              {/* -- 01 · Cisco Ideathon — tall purple flagship -- */}
              <motion.div variants={bentoTile} whileHover={{ y: -8 }} className="lg:row-span-2">
                <Link
                  href="/interview/cisco_ideathon"
                  className="flex h-full flex-col rounded-[1.75rem] p-7"
                  style={{ background: "#C9AEF5" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#3A1B69] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                      👑 flagship
                    </span>
                    <span className="text-sm font-black text-[#3A1B69]/40">Room 02</span>
                  </div>
                  <h3 className="font-serif-accent mt-4 text-4xl text-[#3A1B69]">
                    Cisco Ideathon
                  </h3>
                  <p className="mt-1.5 text-sm font-medium text-[#3A1B69]/70">
                    with Vikram — Senior Engineer, Cisco (15+ yrs)
                  </p>

                  {/* mini call window */}
                  <motion.div
                    variants={bentoItem}
                    className="mt-6 rounded-2xl bg-white p-4 shadow-[0_14px_34px_-14px_rgba(58,27,105,0.5)]"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-black/40">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F4407E]" />
                        rec
                      </span>
                      round 2 / 6
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAE1FF] text-lg font-bold text-[#7A52E0]">
                        V
                      </span>
                      <span className="flex h-5 items-end gap-[3px] text-[#7A52E0]">
                        {[0, 0.18, 0.32, 0.08, 0.24].map((d, i) => (
                          <span key={i} className="eq-bar" style={{ animationDelay: `${d}s` }} />
                        ))}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-medium leading-relaxed text-black/70">
                      &ldquo;Pitch me your idea like it&apos;s the submission round — you have
                      two minutes.&rdquo;
                    </p>
                  </motion.div>

                  {/* the six rounds, cascading in */}
                  <div className="mt-4 flex flex-col gap-2">
                    {[
                      ["Fundamentals rapid-fire", "✓"],
                      ["Idea pitch", "▶"],
                      ["Resume grilling", ""],
                      ["CS deep-dive", ""],
                      ["Managerial curveball", ""],
                      ["Your questions back", ""],
                    ].map(([round, mark]) => (
                      <motion.div
                        key={round}
                        variants={bentoItem}
                        className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-[13px] font-bold text-[#3A1B69] ${
                          mark === "▶" ? "bg-white shadow-md" : "bg-white/45"
                        }`}
                      >
                        {round}
                        <span className={mark === "▶" ? "animate-pulse" : "opacity-60"}>
                          {mark}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  <span className="mt-auto flex items-center gap-1.5 pt-6 text-sm font-black text-[#3A1B69]">
                    Walk in <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </motion.div>

              {/* -- 02 · SDE — wide pink -- */}
              <motion.div variants={bentoTile} whileHover={{ y: -8 }} className="lg:col-span-2">
                <Link
                  href="/interview/sde"
                  className="flex h-full flex-col gap-6 rounded-[1.75rem] p-7 sm:flex-row sm:items-center"
                  style={{ background: "#F16BA9" }}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-black text-[#5E0B35]/40">Room 01</span>
                    <h3 className="font-serif-accent mt-2 text-4xl text-[#5E0B35]">
                      Software Engineer
                    </h3>
                    <p className="mt-1.5 text-sm font-medium text-[#5E0B35]/75">
                      with Priya — Senior SDE, 6 yrs
                    </p>
                    <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#5E0B35]/70">
                      DSA talked through out loud, entry-level system design, and a deep dive
                      on your best project.
                    </p>
                    <span className="mt-4 flex items-center gap-1.5 text-sm font-black text-[#5E0B35]">
                      Walk in <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                  {/* floating question stack */}
                  <div className="relative h-40 w-full flex-1 sm:h-44">
                    <motion.div
                      variants={bentoItem}
                      animate={{ y: [0, -7, 0] }}
                      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute left-0 top-2 w-56 -rotate-3 rounded-xl bg-white p-3.5 shadow-lg"
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#F4407E]">
                        Q · priya
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-snug text-black/75">
                        Reverse a linked list — talk me through it, no code editor.
                      </p>
                    </motion.div>
                    <motion.div
                      variants={bentoItem}
                      animate={{ y: [0, -9, 0] }}
                      transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                      className="absolute right-2 top-16 rotate-2 rounded-xl bg-white p-3 shadow-lg sm:top-20"
                    >
                      <p className="text-xs font-semibold text-black/75">↳ &ldquo;why O(n) space?&rdquo;</p>
                    </motion.div>
                    <motion.div
                      variants={bentoItem}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
                      className="absolute bottom-0 left-10 rotate-[-2deg] rounded-xl bg-[#5E0B35] p-3 shadow-lg"
                    >
                      <p className="text-xs font-semibold text-white">↳ &ldquo;and the edge cases?&rdquo;</p>
                    </motion.div>
                  </div>
                </Link>
              </motion.div>

              {/* -- 03 · AI Engineer — green -- */}
              <motion.div variants={bentoTile} whileHover={{ y: -8 }}>
                <Link
                  href="/interview/ai_engineer"
                  className="flex h-full flex-col rounded-[1.75rem] p-7"
                  style={{ background: "#AFC96E" }}
                >
                  <span className="text-sm font-black text-[#2F4A0D]/40">Room 03</span>
                  <h3 className="font-serif-accent mt-2 text-3xl text-[#2F4A0D]">AI Engineer</h3>
                  <p className="mt-1.5 text-sm font-medium text-[#2F4A0D]/75">
                    with Rohan — production LLM systems
                  </p>

                  <motion.div
                    variants={bentoItem}
                    className="mt-5 flex items-center gap-2.5 self-start rounded-full bg-white px-4 py-2.5 shadow-md"
                  >
                    <span className="flex items-center gap-1">
                      {[0, 0.2, 0.4].map((d, i) => (
                        <span
                          key={i}
                          className="thinking-dot h-1.5 w-1.5 rounded-full bg-[#2F4A0D]"
                          style={{ animationDelay: `${d}s` }}
                        />
                      ))}
                    </span>
                    <span className="text-xs font-bold text-black/60">Rohan is thinking…</span>
                  </motion.div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["RAG", "evals", "guardrails", "agents", "context"].map((chip) => (
                      <motion.span
                        key={chip}
                        variants={bentoItem}
                        className="rounded-full bg-white/50 px-3 py-1.5 text-xs font-bold text-[#2F4A0D]"
                      >
                        {chip}
                      </motion.span>
                    ))}
                  </div>

                  <span className="mt-auto flex items-center gap-1.5 pt-6 text-sm font-black text-[#2F4A0D]">
                    Walk in <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </motion.div>

              {/* -- 04 · ML Engineer — yellow verdict inbox -- */}
              <motion.div variants={bentoTile} whileHover={{ y: -8 }}>
                <Link
                  href="/interview/ml_engineer"
                  className="flex h-full flex-col rounded-[1.75rem] p-7"
                  style={{ background: "#F6D95F" }}
                >
                  <span className="text-sm font-black text-[#6B4A07]/40">Room 04</span>
                  <h3 className="font-serif-accent mt-2 text-3xl text-[#6B4A07]">ML Engineer</h3>
                  <p className="mt-1.5 text-sm font-medium text-[#6B4A07]/75">
                    with Ananya — model deployment focus
                  </p>

                  <div className="mt-5 flex flex-col gap-2">
                    {[
                      ["Bias–variance trade-off", "strong 💪"],
                      ["Metric choice", "okay 😬"],
                      ["Drift monitoring", "weak 🔻"],
                    ].map(([topic, verdict]) => (
                      <motion.div
                        key={topic}
                        variants={bentoItem}
                        className="flex items-center justify-between gap-2 rounded-xl bg-white px-3.5 py-2.5 shadow-sm"
                      >
                        <span className="truncate text-xs font-semibold text-black/70">
                          {topic}
                        </span>
                        <span className="shrink-0 text-[11px] font-black text-[#6B4A07]">
                          {verdict}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  <span className="mt-auto flex items-center gap-1.5 pt-6 text-sm font-black text-[#6B4A07]">
                    Walk in <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </motion.div>

              {/* -- 05 · Data Engineer — wide orange with tool-card fan -- */}
              <motion.div
                variants={bentoTile}
                whileHover={{ y: -8 }}
                className="md:col-span-2 lg:col-span-2"
              >
                <Link
                  href="/interview/data_engineer"
                  className="flex h-full flex-col gap-6 rounded-[1.75rem] p-7 sm:flex-row sm:items-center"
                  style={{ background: "#F19A5B" }}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-black text-[#6E2A0C]/40">Room 05</span>
                    <h3 className="font-serif-accent mt-2 text-4xl text-[#6E2A0C]">
                      Data Engineer
                    </h3>
                    <p className="mt-1.5 text-sm font-medium text-[#6E2A0C]/75">
                      with Karthik — pipelines at scale
                    </p>
                    <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#6E2A0C]/70">
                      Pipeline design, SQL depth, modeling trade-offs, and a scaling scenario
                      that keeps escalating.
                    </p>
                    <span className="mt-4 flex items-center gap-1.5 text-sm font-black text-[#6E2A0C]">
                      Walk in <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="flex flex-1 flex-wrap items-center justify-center gap-2 py-2">
                    {[
                      ["SQL", -8, "#17140F", "#FFD84D"],
                      ["Spark", 5, "#E25A1C", "#fff"],
                      ["Kafka", -4, "#17140F", "#fff"],
                      ["Airflow", 7, "#3B72E8", "#fff"],
                      ["dbt", -6, "#F4407E", "#fff"],
                      ["S3", 4, "#3E9B4F", "#fff"],
                    ].map(([label, r, bg, fg], i) => (
                      <motion.span
                        key={label as string}
                        variants={bentoItem}
                        animate={{ rotate: [(r as number) - 2, (r as number) + 2, (r as number) - 2] }}
                        transition={{ duration: 3.5 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
                        className="-m-1 rounded-lg px-4 py-3 text-sm font-black shadow-lg"
                        style={{ background: bg as string, color: fg as string, rotate: r as number }}
                      >
                        {label}
                      </motion.span>
                    ))}
                  </div>
                </Link>
              </motion.div>

              {/* -- 06 · the report — blue notification -- */}
              <motion.div variants={bentoTile} whileHover={{ y: -8 }}>
                <Link
                  href={sessions[0] ? `/results/${sessions[0].id}` : "#interviewers"}
                  className="flex h-full flex-col rounded-[1.75rem] p-7"
                  style={{ background: "#A9C7E8" }}
                >
                  <span className="text-sm font-black text-[#1D3E6E]/40">After every room</span>
                  <h3 className="font-serif-accent mt-2 text-3xl text-[#1D3E6E]">
                    The damage report
                  </h3>
                  <p className="mt-1.5 text-sm font-medium text-[#1D3E6E]/75">
                    Per-question verdicts. Zero sugar-coating.
                  </p>

                  <div className="relative mt-5">
                    <motion.div variants={bentoItem} className="rounded-2xl bg-white p-3.5 shadow-lg">
                      <div className="flex items-center justify-between text-[10px] font-bold text-black/40">
                        <span>🔔 InterviewMe</span>
                        <span>now</span>
                      </div>
                      <p className="mt-1.5 text-xs font-semibold leading-snug text-black/75">
                        Readiness 7/10 — &ldquo;Solid pitch, shaky subnetting.&rdquo; Tap for
                        the full report.
                      </p>
                    </motion.div>
                    <motion.div
                      variants={bentoItem}
                      className="mx-3 -mt-1 rounded-b-2xl bg-white/55 pb-2 pt-3 shadow-md"
                    />
                  </div>

                  <span className="mt-auto flex items-center gap-1.5 pt-6 text-sm font-black text-[#1D3E6E]">
                    {sessions[0] ? "See your last report" : "Earn yours"}{" "}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </motion.div>
            </motion.div>

            {/* past sessions */}
            {sessions.length > 0 && (
              <motion.div {...reveal} className="mt-16">
                <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-black/40">
                  your past sessions
                </h3>
                <div className="mt-4 flex flex-col gap-2.5">
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
                        className="flex items-center justify-between rounded-2xl border border-black/10 bg-white px-5 py-3.5 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div>
                          <p className="text-sm font-semibold">{track?.name ?? s.track}</p>
                          <p className="text-xs text-black/45">
                            {date} · {s.transcript.length} turns
                          </p>
                        </div>
                        <span className="text-sm font-bold">
                          {s.report ? (
                            <span className="text-[#3E9B4F]">{s.report.readiness}/10</span>
                          ) : (
                            <span className="text-black/30">no report</span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* ---------- faq ---------- */}
        <section id="faq" className="scroll-mt-28 px-6 py-24">
          <div className="mx-auto w-full max-w-3xl">
            <motion.div {...reveal} className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#7A52E0]">faq</p>
              <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                Before you <span className="font-serif-accent italic">walk in</span>
              </h2>
            </motion.div>

            <motion.div {...reveal} className="mt-12 flex flex-col gap-3">
              {[
                {
                  q: "Do I need an account or a credit card?",
                  a: "No. Everything runs in your browser and sessions are stored locally on your machine. Open a room and start talking.",
                },
                {
                  q: "What happens to my voice and resume?",
                  a: "Speech is transcribed by your browser's built-in recognition. Resume text is sent only to the AI model to personalize questions — nothing is stored on a server.",
                },
                {
                  q: "What powers the interviewer voices?",
                  a: "With an ElevenLabs API key configured, each persona gets their own neural voice. Without one, it automatically falls back to your browser's best built-in voice.",
                },
                {
                  q: "Which browser should I use?",
                  a: "Chrome or Edge for the full voice experience (speech recognition + audio). Elsewhere you can still interview by typing.",
                },
                {
                  q: "Is the report actually honest?",
                  a: "Yes — per-question verdicts and recurring weak patterns, not participation-trophy feedback.",
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="faq-item group rounded-2xl border border-black/10 bg-white px-6 shadow-sm"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-bold">
                    {item.q}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F6F3EC] transition-transform group-open:rotate-180">
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </summary>
                  <p className="pb-6 text-sm leading-relaxed text-black/60">{item.a}</p>
                </details>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="px-6 pb-24">
          <motion.div
            {...reveal}
            className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#17140F] px-8 py-20 text-center text-white md:py-24"
          >
            {/* sticker */}
            <div className="absolute right-8 top-8 hidden rotate-12 sm:block">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-[#FFD84D] p-2">
                <p className="text-xs font-black uppercase leading-tight tracking-wider text-[#FFD84D]">
                  100% free · no sign-up
                </p>
              </div>
            </div>

            <div className="mx-auto flex h-6 items-end justify-center gap-[3px] text-[#FFD84D]">
              {[0, 0.15, 0.3, 0.1, 0.25, 0.05, 0.2, 0.35].map((d, i) => (
                <span key={i} className="eq-bar" style={{ animationDelay: `${d}s` }} />
              ))}
            </div>
            <h2 className="mx-auto mt-6 max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
              Bomb the fake one.{" "}
              <span className="font-serif-accent italic text-[#FFD84D]">Ace the real one.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-white/60">
              Five rooms. Five interviewers. Zero judgment that follows you out.
            </p>
            <a
              href="#interviewers"
              className="group mt-9 inline-flex items-center gap-2.5 rounded-full bg-[#FFD84D] px-8 py-4 font-bold text-[#17140F] transition-transform hover:scale-[1.04]"
            >
              Walk into a room
              <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
            </a>
          </motion.div>
        </section>
      </main>

      {/* ---------- footer ---------- */}
      <footer className="border-t border-black/10 px-6 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#17140F] text-white">
              <AudioWaveform className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-bold">
              Interview<span className="text-[#F4407E]">Me</span>
            </span>
          </div>
          <p className="text-center text-xs text-black/45">
            Built for the Cisco Ideathon — and every interview after it. ✌️
          </p>
          <div className="flex items-center gap-6 text-xs font-medium text-black/50">
            <a href="#features" className="transition-colors hover:text-black">
              Features
            </a>
            <a href="#rooms" className="transition-colors hover:text-black">
              Rooms
            </a>
            <a href="#faq" className="transition-colors hover:text-black">
              FAQ
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
