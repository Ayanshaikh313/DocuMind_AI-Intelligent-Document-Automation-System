// app/api/summarization/image/staging/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";

const SIZE_THRESHOLD_BYTES = 20 * 1024 * 1024; // 20 MB

async function writeFileToTemp(webFile: File) {
  const tmpDir = os.tmpdir();
  const safeName = `${Date.now()}_${(webFile as any).name?.replace(/\s+/g, "_") ?? "upload"}`;
  const tmpPath = path.join(tmpDir, safeName);

  const arrayBuffer = await (webFile as any).arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(tmpPath, buffer);

  return { tmpPath, buffer, originalName: (webFile as any).name ?? safeName, size: webFile.size, mime: (webFile as any).type ?? "application/octet-stream" };
}

/**
 * Proxy the file buffer to an internal API route (compression / summarization).
 * Uses server-side FormData + Blob to create multipart/form-data body.
 */
async function proxyToInternalRoute(request: Request, relativePath: string, buffer: Buffer, filename: string, mimeType: string) {
  // Build absolute URL based on incoming request's URL
  const base = new URL(request.url).origin;
  const url = new URL(relativePath, base).toString();

  // Create server FormData & append file as Blob
  const form = new FormData();
  // Blob is available in Node 18+ / Next server runtime
  const blob = new Blob([buffer], { type: mimeType });
  form.append("file", blob, filename);

  // Forward any other metadata if required (e.g., original filename)
  form.append("originalName", filename);

  const resp = await fetch(url, {
    method: "POST",
    body: form,
    // Do NOT set 'Content-Type' header; fetch will set the multipart boundary.
  });

  // Try to parse JSON, otherwise return raw text
  const contentType = resp.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = await resp.json();
    return { status: resp.status, body: json };
  } else {
    const text = await resp.text();
    return { status: resp.status, body: text };
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileField = formData.get("file");

    if (!fileField) {
      return NextResponse.json({ error: "No file field named 'file' in form-data." }, { status: 400 });
    }

    const webFile = fileField as unknown as File;
    if (!(webFile && typeof (webFile as any).arrayBuffer === "function")) {
      return NextResponse.json({ error: "Invalid file received." }, { status: 400 });
    }

    // Write to temp (staging)
    const { tmpPath, buffer, originalName, size, mime } = await writeFileToTemp(webFile);

    try {
      // Decide route
      if (size > SIZE_THRESHOLD_BYTES) {
        // forward to compression
        const proxied = await proxyToInternalRoute(request, "/api/summarization/image/compression", buffer, originalName, mime);

        // cleanup tmp file
        try { await fs.promises.unlink(tmpPath); } catch (e) { /* ignore */ }

        return NextResponse.json({
          routedTo: "compression",
          fileName: originalName,
          fileSizeBytes: size,
          upstreamStatus: proxied.status,
          upstreamBody: proxied.body,
        }, { status: 200 });
      } else {
        // forward to summarization
        const proxied = await proxyToInternalRoute(request, "/api/summarization/image/summarization", buffer, originalName, mime);

        // cleanup tmp file
        try { await fs.promises.unlink(tmpPath); } catch (e) { /* ignore */ }

        return NextResponse.json({
          routedTo: "summarization",
          fileName: originalName,
          fileSizeBytes: size,
          upstreamStatus: proxied.status,
          upstreamBody: proxied.body,
        }, { status: 200 });
      }
    } catch (err: any) {
      // Attempt cleanup on error
      try { await fs.promises.unlink(tmpPath); } catch (e) { /* ignore */ }
      console.error("Forwarding error:", err);
      return NextResponse.json({ error: "Failed to forward to internal route", detail: err?.message ?? String(err) }, { status: 500 });
    }
  } catch (err: any) {
    console.error("Error in /api/summarization/image/staging:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
