"use client";

export type AvatarState = "idle" | "speaking" | "listening" | "thinking";

/**
 * Phase A avatar: a warm, geometric bust lit like a video call at night.
 * idle: breathing + blink · speaking: mouth morph + glow · listening: pulse rings.
 */
export default function Avatar2D({
  state,
  name,
}: {
  state: AvatarState;
  name: string;
}) {
  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-xl border bg-surface-raised transition-colors ${
        state === "listening"
          ? "border-sage/50"
          : state === "speaking"
            ? "border-accent/50 speaking-glow"
            : "border-line"
      }`}
    >
      {state === "listening" && (
        <>
          <span className="pulse-ring" />
          <span className="pulse-ring" />
          <span className="pulse-ring" />
        </>
      )}

      {/* lamp light falling from upper-left */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 30% 10%, rgba(213,162,78,0.14), transparent 65%)",
        }}
      />

      <svg
        viewBox="0 0 200 150"
        className="avatar-breathe relative h-full w-full"
        aria-label={`${name}, your interviewer`}
        role="img"
      >
        <defs>
          <linearGradient id="bust" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#d8b075" />
            <stop offset="100%" stopColor="#8a6c42" />
          </linearGradient>
        </defs>

        {/* shoulders */}
        <path
          d="M 40 150 Q 42 112 74 104 L 126 104 Q 158 112 160 150 Z"
          fill="url(#bust)"
          opacity="0.85"
        />
        {/* neck */}
        <rect x="90" y="88" width="20" height="22" rx="8" fill="url(#bust)" />
        {/* head */}
        <circle cx="100" cy="62" r="34" fill="url(#bust)" />

        {/* brows */}
        <g
          className="avatar-brows"
          data-state={state}
          stroke="#3a2f1e"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="80" y1="50" x2="92" y2="49" />
          <line x1="108" y1="49" x2="120" y2="50" />
        </g>

        {/* eyes */}
        <g fill="#221c12">
          <ellipse className="avatar-eye" cx="86" cy="59" rx="3.4" ry="4.6" />
          <ellipse className="avatar-eye" cx="114" cy="59" rx="3.4" ry="4.6" />
        </g>

        {/* mouth */}
        <ellipse
          className="avatar-mouth"
          data-state={state}
          cx="100"
          cy="78"
          rx="9"
          ry="7"
          fill="#221c12"
        />
      </svg>

      {/* video-call chrome */}
      <div className="absolute bottom-3 left-3 rounded-md bg-background/70 px-2.5 py-1 font-mono text-xs tracking-wider text-foreground/90 backdrop-blur-sm">
        {name}
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md bg-background/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest backdrop-blur-sm">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            state === "speaking"
              ? "bg-accent"
              : state === "listening"
                ? "bg-sage"
                : state === "thinking"
                  ? "bg-accent/60"
                  : "bg-muted/60"
          }`}
        />
        <span className="text-muted">{state}</span>
      </div>
    </div>
  );
}
