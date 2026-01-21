// api/summarization/dsf/extraction/json/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  const jsonData = await file.text();
  const parsed = JSON.parse(jsonData);
  const text = JSON.stringify(parsed, null, 2);

  const resp = await fetch("/api/summarization/dsf/summarization", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  const summaryJson = await resp.json();
  return NextResponse.json({ success: true, extractedNotice: summaryJson.extractedNotice, routedTo: "summarization" });
}
