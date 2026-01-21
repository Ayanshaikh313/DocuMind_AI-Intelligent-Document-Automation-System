// api/summarization/dsf/summarization/route.ts
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  const body = await req.json();
  const text = body.text;

  const prompt = `
Extract the notice details from the following text and return JSON in the format:
{
  "title": "string",
  "insights": "string",
  "deadline": "YYYY-MM-DD",
  "severity": "High | Medium | Low",
  "authorizedBy": "string",
  "departments": ["Engineering", "Design", "Operations", "Finance"]
}
Text: ${text}
Return only valid JSON.
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  let extractedNotice: any = {};
  try {
    const cleaned = response.text.replace(/```json|```/g, "").trim();
    extractedNotice = JSON.parse(cleaned);
  } catch (err) {
    extractedNotice = { rawText: response.text };
  }

  return NextResponse.json({ success: true, extractedNotice });
}
