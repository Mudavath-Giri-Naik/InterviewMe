import { NextRequest, NextResponse } from "next/server";
import { tracks, isTrackId } from "@/lib/tracks";
import { buildReportPrompt } from "@/lib/prompt";
import { groqChat } from "@/lib/groq";
import type { ChatTurn, Report, ReportQuestion } from "@/lib/types";

interface FeedbackRequest {
  track: string;
  transcript: ChatTurn[];
  resumeText?: string;
}

function parseReport(raw: string): Report {
  // Strip markdown fences if the model wrapped its JSON anyway.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const data = JSON.parse(cleaned) as Partial<Report>;

  const verdicts = new Set(["strong", "okay", "weak"]);
  const questions: ReportQuestion[] = Array.isArray(data.questions)
    ? data.questions
        .filter((q) => q && typeof q.question === "string")
        .map((q) => ({
          question: q.question,
          verdict: verdicts.has(q.verdict as string) ? q.verdict : "okay",
          improvement: typeof q.improvement === "string" ? q.improvement : "",
        }))
    : [];

  return {
    summary: typeof data.summary === "string" ? data.summary : "No summary generated.",
    readiness: Math.max(0, Math.min(10, Math.round(Number(data.readiness) || 0))),
    questions,
    patterns: Array.isArray(data.patterns)
      ? data.patterns.filter((p): p is string => typeof p === "string")
      : [],
  };
}

export async function POST(req: NextRequest) {
  let body: FeedbackRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { track: trackId, transcript, resumeText } = body;
  if (!trackId || !isTrackId(trackId)) {
    return NextResponse.json({ error: `Unknown track: ${trackId}` }, { status: 400 });
  }
  if (!Array.isArray(transcript) || transcript.length < 2) {
    return NextResponse.json(
      { error: "Not enough conversation to report on." },
      { status: 400 }
    );
  }

  const system = buildReportPrompt({
    track: tracks[trackId],
    resumeText: resumeText?.slice(0, 12000),
    transcript,
  });

  try {
    const raw = await groqChat({
      system,
      user: "Produce the report JSON now.",
      temperature: 0.3,
      maxTokens: 3000,
      json: true,
      reasoningEffort: "medium",
    });
    return NextResponse.json({ report: parseReport(raw) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error generating report.";
    console.error("[/api/feedback]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
