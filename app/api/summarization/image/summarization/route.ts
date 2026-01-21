// app/api/image/summarization/route.ts
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Helper: convert File to Base64
async function fileToBase64(file: File) {
  const arrayBuffer = await (file as any).arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const fileField = formData.get("file");

    if (!fileField) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const webFile = fileField as unknown as File;

    // Convert image to Base64
    const base64Data = await fileToBase64(webFile);
    const mimeType = (webFile as any).type || "image/jpeg";

    // Prepare prompt for Gemini
    const prompt = `We have deparments Engineering, Design, Operations and Finance and severity High, Medium and Low.Extract the details from the image and then generate the json in the format:
    {
  "success": true,
  "extractedNotice": {
    "title": "string (should be short)",
  "insights": "string (should be short and maximum 2 lines)",
  "deadline": "YYYY-MM-DD",
  "severity": "High | Medium | Low",
  "authorizedBy": "string",
  "departments": ["Engineering", "Design", "Operations", "Finance"]
  }
}
Give json only and nothing else. Return only valid json without backticks or any other markdowns.`;

    // Send inline image + prompt
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        { text: prompt },
      ],
    });

    console.log("Response from Gemini:", response);

    // Parse Gemini output
    let extractedNotice: any = {};
    try {
      // Remove ```json or ``` and trim extra whitespace
      const cleanedText = response.text.replace(/```json|```/g, "").trim();
      extractedNotice = JSON.parse(cleanedText);
    } catch (err) {
      console.error("JSON parse error:", err);
      extractedNotice = { rawText: response.text };
    }

    console.log("Extracted Notice:", extractedNotice);

    return NextResponse.json({
      success: true,
      extractedNotice,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
