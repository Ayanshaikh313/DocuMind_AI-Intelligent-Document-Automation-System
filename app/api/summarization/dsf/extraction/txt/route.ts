// api/summarization/dsf/extraction/txt/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  const text = await file.text();

  const resp = await fetch("/api/summarization/dsf/summarization", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  const summaryJson = await resp.json();
  return NextResponse.json({ success: true, extractedNotice: summaryJson.extractedNotice, routedTo: "summarization" });
}
