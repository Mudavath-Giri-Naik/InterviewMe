import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 12000;

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF too large (max 8 MB)." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    const text = parsed.text
      .replace(/^-- \d+ of \d+ --$/gm, "") // pdf-parse v2 page separators
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, MAX_TEXT_CHARS);

    if (!text) {
      return NextResponse.json(
        { error: "Couldn't extract text — the PDF may be a scan. Paste your resume as text instead." },
        { status: 422 }
      );
    }
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[/api/resume]", err);
    return NextResponse.json(
      { error: "Failed to parse the PDF. Paste your resume as text instead." },
      { status: 500 }
    );
  }
}
