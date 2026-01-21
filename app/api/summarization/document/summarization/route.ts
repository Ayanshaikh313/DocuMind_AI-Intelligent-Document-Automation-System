// app/api/summarization/document/summarization/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    // Get form data
    const form = await req.formData();
    const file = form.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64File = Buffer.from(arrayBuffer).toString("base64");

    // Prompt for extracting structured JSON
    const prompt = `We have departments Engineering, Design, Operations, and Finance, and severity levels High, Medium, and Low.
Extract the details from the document and generate JSON in the format:
{
  "success": true,
  "extractedNotice": {
    "title": "string",
  "insights": "string",
  "deadline": "YYYY-MM-DD",
  "severity": "High | Medium | Low",
  "authorizedBy": "string",
  "departments": ["Engineering", "Design", "Operations", "Finance"]
  }
}
Return only valid JSON. Do NOT include backticks, explanations, or markdown.`;

    // Send file to Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: file.type || "application/octet-stream",
            data: base64File,
          },
        },
      ],
    });

    console.log("Gemini raw response:", JSON.stringify(response, null, 2));

    // Fixed text extraction logic
    let textOutput = "";
    if (response.candidates?.length) {
      for (const candidate of response.candidates) {
        // Check if content is an array of parts
        if (Array.isArray(candidate.content?.parts)) {
          for (const part of candidate.content.parts) {
            if (part.text) {
              textOutput += part.text;
            }
          }
        }
        // Fallback: check if content itself has text property
        else if (candidate.content?.text) {
          textOutput += candidate.content.text;
        }
        // Another fallback: check the structure you were using
        else if (Array.isArray(candidate.content)) {
          for (const c of candidate.content) {
            if (c.text) {
              textOutput += c.text;
            }
          }
        }
      }
    }

    // Additional fallback: try to get text from the response object directly
    if (!textOutput && response.text) {
      textOutput = response.text;
    }

    console.log("Extracted text output:", textOutput);

    if (!textOutput) {
      // Return more detailed error information
      return NextResponse.json(
        {
          success: false,
          message: "Gemini returned no text",
          debug: {
            candidatesLength: response.candidates?.length || 0,
            candidateStructure: response.candidates?.[0]
              ? {
                  hasContent: !!response.candidates[0].content,
                  contentType: typeof response.candidates[0].content,
                  contentKeys: response.candidates[0].content
                    ? Object.keys(response.candidates[0].content)
                    : [],
                  contentIsArray: Array.isArray(response.candidates[0].content),
                }
              : null,
            fullResponse: JSON.stringify(response, null, 2),
          },
        },
        { status: 500 }
      );
    }

    // Clean the text output (remove potential markdown formatting)
    const cleanedText = textOutput
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    // Parse JSON safely
    let jsonResult;
    try {
      jsonResult = JSON.parse(cleanedText);
    } catch (err) {
      return NextResponse.json(
        {
          success: false,
          message: "Gemini returned invalid JSON",
          rawText: cleanedText,
          originalText: textOutput,
          error: err instanceof Error ? err.message : String(err),
        },
        { status: 500 }
      );
    }

    return NextResponse.json(jsonResult);
  } catch (err: any) {
    console.error("Summarization error:", err);
    return NextResponse.json(
      { success: false, message: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
