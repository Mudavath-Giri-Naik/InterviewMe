import { NextRequest, NextResponse } from "next/server";
import { tracks, isTrackId } from "@/lib/tracks";

/**
 * ElevenLabs text-to-speech proxy. The client asks for the interviewer's
 * line as audio; the key never leaves the server. When no key is set the
 * client falls back to browser speechSynthesis.
 */

const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";
const DEFAULT_VOICE = "nPczCjzI2devNBz1zQrb"; // Brian

export async function GET() {
  return NextResponse.json({
    available: Boolean(process.env.ELEVENLABS_API_KEY),
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs is not configured — add ELEVENLABS_API_KEY to .env.local." },
      { status: 503 }
    );
  }

  let body: { text?: string; track?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text is required." }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "text too long." }, { status: 400 });
  }

  const voiceId =
    body.track && isTrackId(body.track)
      ? tracks[body.track].persona.voiceId
      : DEFAULT_VOICE;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: ELEVEN_MODEL,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      console.error("[/api/tts] ElevenLabs error", res.status, detail.slice(0, 300));
      return NextResponse.json(
        { error: `ElevenLabs request failed (${res.status}).` },
        { status: 502 }
      );
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown ElevenLabs error.";
    console.error("[/api/tts]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
