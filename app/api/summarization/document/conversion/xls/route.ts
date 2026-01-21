// app/api/summarization/document/conversion/xls/route.ts
import { NextResponse } from "next/server";
import path from "path";
import { convert } from "libreoffice-convert";

/**
 * Requirements:
 *  - Node 18+ recommended (for global FormData/Blob)
 *  - LibreOffice installed on the host (so libreoffice-convert can call it)
 *  - npm install libreoffice-convert
 *
 * Notes:
 *  - This implementation reads the uploaded file from the incoming request.formData()
 *    (Node 18+ / Next.js app-route FormData support).
 *  - For environments without global FormData/Blob support, you can use `form-data`
 *    + fs.createReadStream instead.
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

    // Parse incoming multipart form-data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided (field name: file)" },
        { status: 400 }
      );
    }

    const originalFilename = (file.name as string) || "upload";
    const ext = getExtensionFromFilename(originalFilename);

    if (!["xls", "xlsx"].includes(ext)) {
      return NextResponse.json(
        { success: false, error: `Unsupported extension .${ext}. Expect xls or xlsx.` },
        { status: 400 }
      );
    }

    // Read file into Buffer
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Convert to PDF using libreoffice-convert (requires LibreOffice on host)
    const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
      convert(inputBuffer, ".pdf", undefined, (err: Error | null, done: Buffer) => {
        if (err) return reject(err);
        resolve(done);
      });
    });

    const pdfFilename = originalFilename.replace(/\.[^/.]+$/, "") + ".pdf";

    // Determine forwarding path
    const baseUrl = new URL(request.url).origin;
    const forwardPath =
      pdfBuffer.length > MAX_PDF_BYTES
        ? "/api/summarization/document/compression"
        : "/api/summarization/document/summarization";

    const forwardUrl = new URL(forwardPath, baseUrl).toString();

    // Build FormData to forward (Node 18+ Blob + FormData)
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });
    const forwardForm = new FormData();
    forwardForm.append("file", pdfBlob, pdfFilename);

    // Forward other fields (metadata) from original formData
    for (const [key, value] of formData.entries()) {
      if (key === "file") continue;
      // If value is a File, append the file; otherwise append as string
      if (value instanceof File) {
        forwardForm.append(key, value, value.name);
      } else {
        forwardForm.append(key, String(value));
      }
    }

    // Forward the converted PDF to chosen endpoint
    const forwardResp = await fetch(forwardUrl, {
      method: "POST",
      body: forwardForm as any,
      // If you need to forward authentication, include headers here:
      // headers: { Authorization: request.headers.get("authorization") || "" }
    });

    const ct = forwardResp.headers.get("content-type") || "";

    if (ct.includes("application/json")) {
      const json = await forwardResp.json();
      return NextResponse.json(json, { status: forwardResp.status });
    }

    // Return raw text/other content-types as-is
    const text = await forwardResp.text();
    return new NextResponse(text, {
      status: forwardResp.status,
      headers: { "content-type": ct },
    });
  } catch (err: any) {
    console.error("XLS conversion route error:", err);
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
