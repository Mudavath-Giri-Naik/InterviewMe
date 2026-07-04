"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { tracks } from "@/lib/tracks";
import { listSessions } from "@/lib/sessions";
import type { StoredSession, TrackId } from "@/lib/types";

const rooms: { id: TrackId; room: string; note?: string }[] = [
  { id: "sde", room: "Room 01" },
  {
    id: "cisco_ideathon",
    room: "Room 02",
    note: "The full multi-round shape: fundamentals rapid-fire, idea pitch, resume grilling, CS deep-dive, managerial scenario.",
  },
  { id: "ai_engineer", room: "Room 03" },
  { id: "ml_engineer", room: "Room 04" },
  { id: "data_engineer", room: "Room 05" },
];

export default function Home() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);

  // localStorage only exists client-side; read after mount to avoid hydration mismatch
  useEffect(() => {
    setSessions(listSessions());
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
          mock interview studio
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight">
          Interview<span className="text-accent">Me</span>
        </h1>
        <p className="mt-4 max-w-lg text-muted">
          A live, spoken conversation with an interviewer who actually listens —
          real follow-ups based on what you said, and a real report at the end.
        </p>

        <div className="mt-12 flex flex-col gap-4">
          {rooms.map(({ id, room, note }) => {
            const track = tracks[id];
            return (
              <Link
                key={id}
                href={`/interview/${id}`}
                className="group block rounded-xl border border-line bg-surface p-6 transition-colors hover:border-accent/60 hover:bg-surface-raised"
              >
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-accent">
                      {room} · open
                    </p>
                    <h2 className="mt-2 text-xl font-medium">{track.name}</h2>
                    <p className="mt-1 text-sm text-muted">
                      with {track.persona.name} — {track.persona.title}
                    </p>
                    {note && (
                      <p className="mt-2 text-xs leading-relaxed text-muted/80">{note}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-2xl text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent">
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {sessions.length > 0 && (
          <section className="mt-16">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
              past sessions
            </h2>
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
                    className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:border-accent/50"
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
          </section>
        )}
      </div>
    </main>
  );
}
