// api/summarization/dsf/extraction/csv/route.ts
import { NextResponse } from "next/server";
import Papa from "papaparse";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  const csvText = await file.text();
  const parsed = Papa.parse(csvText, { header: true });
  const text = JSON.stringify(parsed.data, null, 2);

  const resp = await fetch("/api/summarization/dsf/summarization", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  const summaryJson = await resp.json();
  return NextResponse.json({ success: true, extractedNotice: summaryJson.extractedNotice, routedTo: "summarization" });
}
