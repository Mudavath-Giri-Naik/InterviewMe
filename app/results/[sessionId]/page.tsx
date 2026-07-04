"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { tracks } from "@/lib/tracks";
import { getSession, saveSession } from "@/lib/sessions";
import type { Report, StoredSession } from "@/lib/types";

type State =
  | { phase: "loading" }
  | { phase: "missing" }
  | { phase: "generating"; session: StoredSession }
  | { phase: "error"; session: StoredSession; message: string }
  | { phase: "ready"; session: StoredSession; report: Report };

const verdictStyles: Record<string, string> = {
  strong: "border-sage/50 text-sage",
  okay: "border-accent/50 text-accent",
  weak: "border-danger/50 text-danger",
};

export default function ResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [state, setState] = useState<State>({ phase: "loading" });

  const generate = useCallback(async (session: StoredSession) => {
    setState({ phase: "generating", session });
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track: session.track,
          transcript: session.transcript,
          resumeText: session.resumeSnapshot,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      const updated = { ...session, report: data.report as Report };
      saveSession(updated);
      setState({ phase: "ready", session: updated, report: updated.report! });
    } catch (err) {
      setState({
        phase: "error",
        session,
        message: err instanceof Error ? err.message : "Report generation failed.",
      });
    }
  }, []);

  useEffect(() => {
    const session = getSession(sessionId);
    if (!session) {
      setState({ phase: "missing" });
    } else if (session.report) {
      setState({ phase: "ready", session, report: session.report });
    } else {
      generate(session);
    }
  }, [sessionId, generate]);

  if (state.phase === "loading") return null;

  if (state.phase === "missing") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted">
          No session found — reports are stored in this browser only.
        </p>
        <Link href="/" className="text-accent underline underline-offset-4">
          Back to the lobby
        </Link>
      </main>
    );
  }

  const { session } = state;
  const track = tracks[session.track];
  const date = new Date(session.startedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-widest text-muted hover:text-accent"
      >
        ← lobby
      </Link>
      <p className="mt-4 font-mono text-xs uppercase tracking-[0.3em] text-muted">
        session report
      </p>
      <h1 className="mt-2 text-3xl font-semibold">{track.name}</h1>
      <p className="mt-1 text-sm text-muted">
        with {track.persona.name} · {date} · {session.transcript.length} turns
      </p>

      {state.phase === "generating" && (
        <div className="mt-16 flex flex-col items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="thinking-dot h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="thinking-dot h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="thinking-dot h-2.5 w-2.5 rounded-full bg-accent" />
          </div>
          <p className="text-sm text-muted">
            {track.persona.name} is writing up notes on your session…
          </p>
        </div>
      )}

      {state.phase === "error" && (
        <div className="mt-10 rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm">
          <p className="text-danger">{state.message}</p>
          <button
            onClick={() => generate(session)}
            className="mt-2 font-mono text-xs uppercase tracking-widest text-accent hover:underline"
          >
            retry
          </button>
        </div>
      )}

      {state.phase === "ready" && (
        <ReportView report={state.report} session={session} personaName={track.persona.name} />
      )}
    </main>
  );
}

function ReportView({
  report,
  session,
  personaName,
}: {
  report: Report;
  session: StoredSession;
  personaName: string;
}) {
  return (
    <div className="mt-10 flex flex-col gap-10">
      {/* readiness + summary */}
      <div className="flex items-start gap-6 rounded-xl border border-line bg-surface p-6">
        <div className="shrink-0 text-center">
          <p className="font-mono text-5xl text-accent">{report.readiness}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
            / 10 readiness
          </p>
        </div>
        <div>
          <p className="leading-relaxed">{report.summary}</p>
          <p className="mt-2 text-xs text-muted/70">
            Directional, not a verdict — trend it across sessions.
          </p>
        </div>
      </div>

      {/* patterns */}
      {report.patterns.length > 0 && (
        <section>
          <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
            patterns across the session
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {report.patterns.map((p, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="text-accent">▸</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* per-question */}
      {report.questions.length > 0 && (
        <section>
          <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
            question by question
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            {report.questions.map((q, i) => (
              <div key={i} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-medium leading-relaxed">{q.question}</p>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                      verdictStyles[q.verdict] ?? verdictStyles.okay
                    }`}
                  >
                    {q.verdict}
                  </span>
                </div>
                {q.improvement && (
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    <span className="text-sage">↗ </span>
                    {q.improvement}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* transcript */}
      <details className="rounded-lg border border-line bg-surface p-4">
        <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-muted hover:text-accent">
          full transcript ({session.transcript.length} turns)
        </summary>
        <div className="mt-4 flex flex-col gap-3">
          {session.transcript.map((t, i) => (
            <p key={i} className="text-sm leading-relaxed">
              <span
                className={`font-mono text-xs uppercase tracking-widest ${
                  t.role === "interviewer" ? "text-accent/80" : "text-muted"
                }`}
              >
                {t.role === "interviewer" ? personaName : "you"}:
              </span>{" "}
              {t.text}
            </p>
          ))}
        </div>
      </details>

      <div className="flex gap-4">
        <Link
          href={`/interview/${session.track}`}
          className="rounded-lg bg-accent px-6 py-3 font-medium text-background transition-opacity hover:opacity-90"
        >
          Run it again
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-line px-6 py-3 text-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          Back to the lobby
        </Link>
      </div>
    </div>
  );
}
