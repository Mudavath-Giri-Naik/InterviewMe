import { NextRequest, NextResponse } from "next/server";
import { tracks, isTrackId } from "@/lib/tracks";
import { buildSystemPrompt } from "@/lib/prompt";
import { groqChat } from "@/lib/groq";
import type { ChatTurn, InterviewPrefs } from "@/lib/types";

interface InterviewRequest {
  track: string;
  history: ChatTurn[];
  resumeText?: string;
  prefs?: InterviewPrefs;
}

export async function POST(req: NextRequest) {
  let body: InterviewRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { track: trackId, history, resumeText, prefs } = body;

  if (!trackId || !isTrackId(trackId)) {
    return NextResponse.json({ error: `Unknown track: ${trackId}` }, { status: 400 });
  }
  if (!Array.isArray(history)) {
    return NextResponse.json({ error: "history must be an array." }, { status: 400 });
  }

  const track = tracks[trackId];
  const lastCandidate = [...history].reverse().find((t) => t.role === "candidate");

  const system = buildSystemPrompt({
    track,
    resumeText: resumeText?.slice(0, 12000),
    prefs,
    conversationHistory: history,
    latestTranscript: lastCandidate?.text ?? "",
  });

  try {
    const reply = await groqChat({
      system,
      user:
        history.length === 0
          ? "Begin the interview now."
          : "Respond with your next spoken line as the interviewer.",
    });
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling Groq.";
    console.error("[/api/interview]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
