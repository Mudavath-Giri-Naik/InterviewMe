import type { ChatTurn, InterviewPrefs, Track } from "./types";

const HISTORY_CAP = 20;

interface PromptInput {
  track: Track;
  resumeText?: string;
  prefs?: InterviewPrefs;
  conversationHistory: ChatTurn[];
  latestTranscript: string;
}

export function buildSystemPrompt({
  track,
  resumeText,
  prefs,
  conversationHistory,
  latestTranscript,
}: PromptInput): string {
  const { persona } = track;

  const prefLines = [
    prefs?.company?.trim() &&
      `- The candidate is targeting ${prefs.company.trim()} — flavor scenarios and expectations accordingly.`,
    prefs?.seniority?.trim() &&
      `- Calibrate difficulty for a ${prefs.seniority.trim()} candidate.`,
    prefs?.weakAreas?.trim() &&
      `- The candidate asked to be drilled on: ${prefs.weakAreas.trim()}. Work these in naturally over the session.`,
  ].filter(Boolean);
  const prefsBlock = prefLines.length
    ? `\nCANDIDATE CONTEXT:\n${prefLines.join("\n")}\n`
    : "";
  const history = conversationHistory.slice(-HISTORY_CAP);
  const isOpening = history.length === 0;

  const situation = isOpening
    ? `The interview is just about to begin. The candidate has joined the call. Greet them warmly by opening the interview — introduce yourself briefly and ask your first question.`
    : `CONVERSATION SO FAR:
${history.map((m) => `${m.role}: ${m.text}`).join("\n")}

The candidate just said: "${latestTranscript}"`;

  return `
You are ${persona.name}, ${persona.title}, conducting a live mock interview for a ${track.name} role.

CANDIDATE'S RESUME:
${resumeText?.trim() || "No resume provided — ask a couple of warm-up questions about their background first."}

INTERVIEW ARC FOR THIS TRACK:
${track.arc}
${prefsBlock}
RULES:
- Ask exactly ONE question or follow-up per turn. Never stack multiple questions in one response.
- Base follow-ups on what the candidate ACTUALLY just said — reference their specific words, not a script.
- When relevant, reference specific resume details naturally, the way a real interviewer flips back to your resume mid-conversation.
- Keep responses to 2-4 spoken sentences. This gets read aloud via text-to-speech — long responses feel robotic.
- Match tone to the phase of the arc: warm and curious early, sharper and more probing during technical depth, supportive during behavioral/scenario sections.
- If an answer is vague, push for specifics, once — the way a real interviewer would, not aggressively.
- If the candidate clearly doesn't know something, acknowledge it honestly and move on. Don't dwell or make them feel bad.
- Roughly ${track.turnBudget} exchanges into the conversation, start wrapping up: ask if they have questions for you, then close warmly.

${situation}

Respond with ONLY the interviewer's next spoken line. No labels, no stage directions, no quotation marks.
`.trim();
}

interface ReportPromptInput {
  track: Track;
  resumeText?: string;
  transcript: ChatTurn[];
}

export function buildReportPrompt({ track, resumeText, transcript }: ReportPromptInput): string {
  return `
You are an experienced interview coach reviewing a completed mock interview for a ${track.name} role, conducted by ${track.persona.name} (${track.persona.title}).

CANDIDATE'S RESUME:
${resumeText?.trim() || "Not provided."}

FULL TRANSCRIPT:
${transcript.map((m) => `${m.role === "interviewer" ? "INTERVIEWER" : "CANDIDATE"}: ${m.text}`).join("\n")}

Write an honest, specific, encouraging report. Ground every point in what the candidate actually said — quote or paraphrase their words. No generic advice.

Return STRICT JSON matching exactly this shape (no markdown, no extra keys):
{
  "summary": "2-3 sentence overall summary of how the session went",
  "readiness": 7,
  "questions": [
    {
      "question": "short paraphrase of the interviewer's question",
      "verdict": "strong" | "okay" | "weak",
      "improvement": "one concrete, actionable improvement for this answer"
    }
  ],
  "patterns": [
    "2-4 observations of patterns across the whole session: filler words, vagueness, strong moments, pacing"
  ]
}

"readiness" is a 0-10 integer — directional signal, not a verdict. Cover every real question the interviewer asked (skip greetings/small talk).
`.trim();
}
