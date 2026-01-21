// app/api/summarization/document/conversion/ppt/route.ts
import { NextResponse } from "next/server";
import path from "path";
import { convert } from "libreoffice-convert";

/**
 * Requirements:
 *  - Node 18+ recommended (for global FormData/Blob)
 *  - LibreOffice installed on the host (so libreoffice-convert can call it)
 *  - npm i libreoffice-convert
 *
 * Note: If your environment doesn't have global FormData/Blob, use `form-data` and fs.createReadStream
 * instead for forwarding. This code uses the Web FormData/Blob API.
 */

export const runtime = "nodejs";

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB

function getExtensionFromFilename(filename?: string | null) {
  if (!filename) return "";
  return (path.extname(filename) || "").replace(".", "").toLowerCase();
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    // parse incoming multipart using Web API (works in Node 18+ with Next.js)
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided (field name: file)" },
        { status: 400 }
      );
    }

    // validate extension
    const originalFilename = (file.name as string) || "upload";
    const ext = getExtensionFromFilename(originalFilename);
    if (!["ppt", "pptx"].includes(ext)) {
      return NextResponse.json(
        { success: false, error: `Unsupported extension .${ext}. Expect ppt or pptx.` },
        { status: 400 }
      );
    }

    // read incoming file into Buffer
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Convert to PDF using libreoffice-convert
    const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
      convert(inputBuffer, ".pdf", undefined, (err: Error | null, done: Buffer) => {
        if (err) return reject(err);
        resolve(done);
      });
    });

    // Determine PDF filename
    const pdfFilename = originalFilename.replace(/\.[^/.]+$/, "") + ".pdf";

    // Decide where to forward
    const baseUrl = new URL(request.url).origin; // works across environments
    let forwardPath = "/api/summarization/document/summarization";

    if (pdfBuffer.length > MAX_PDF_BYTES) {
      forwardPath = "/api/summarization/document/compression";
    } else {
      forwardPath = "/api/summarization/document/summarization";
    }

    const forwardUrl = new URL(forwardPath, baseUrl).toString();

    // Build FormData to forward the PDF
    // Use Blob + FormData (Node 18+). Include filename and content-type.
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });
    const forwardForm = new FormData();
    forwardForm.append("file", pdfBlob, pdfFilename);

    // Optionally forward other form fields if present (like metadata)
    for (const [k, v] of formData.entries()) {
      if (k === "file") continue;
      // formData.getAll may return File or string; ensure string append
      const val = v as any;
      if (val instanceof File) {
        // if other files are present, append them as-is
        forwardForm.append(k, val);
      } else {
        forwardForm.append(k, String(val));
      }
    }

    // Forward the converted PDF to chosen endpoint
    const forwardResp = await fetch(forwardUrl, {
      method: "POST",
      body: forwardForm as any,
    });

    const ct = forwardResp.headers.get("content-type") || "";

    if (ct.includes("application/json")) {
      const json = await forwardResp.json();
      return NextResponse.json(json, { status: forwardResp.status });
    }

    // For non-json responses, return raw text and content-type
    const text = await forwardResp.text();
    return new NextResponse(text, {
      status: forwardResp.status,
      headers: { "content-type": ct },
    });
  } catch (err: any) {
    console.error("PPT conversion route error:", err);
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
