// app/api/image/compression/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";

const MAX_SIZE_BYTES = 19 * 1024 * 1024; // 19 MB

async function writeFileToTemp(webFile: File) {
  const tmpDir = os.tmpdir();
  const safeName = `${Date.now()}_${(webFile as any).name?.replace(/\s+/g, "_") ?? "upload"}`;
  const tmpPath = path.join(tmpDir, safeName);

  const arrayBuffer = await (webFile as any).arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(tmpPath, buffer);

  return { tmpPath, buffer, originalName: (webFile as any).name ?? safeName, size: webFile.size, mime: (webFile as any).type ?? "application/octet-stream" };
}

async function compressImage(buffer: Buffer, mime: string) {
  let quality = 90; // start high
  let compressed = buffer;

  while (compressed.length > MAX_SIZE_BYTES && quality > 10) {
    compressed = await sharp(buffer)
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    quality -= 10; // reduce quality progressively
  }

  return compressed;
}

async function proxyToSummarization(request: Request, buffer: Buffer, filename: string, mime: string) {
  const base = new URL(request.url).origin;
  const url = new URL("/api/image/summarization", base).toString();

  const form = new FormData();
  const blob = new Blob([buffer], { type: mime });
  form.append("file", blob, filename);

  const resp = await fetch(url, {
    method: "POST",
    body: form,
  });

  const contentType = resp.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return await resp.json();
  return await resp.text();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileField = formData.get("file");

    if (!fileField) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const webFile = fileField as unknown as File;
    const { buffer, originalName, mime, size } = await writeFileToTemp(webFile);

    // Compress only if >20MB
    let finalBuffer = buffer;
    if (size > 20 * 1024 * 1024) {
      finalBuffer = await compressImage(buffer, mime);
      console.log(`Compressed ${originalName} from ${(size / 1024 / 1024).toFixed(2)} MB to ${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    }

    const result = await proxyToSummarization(request, finalBuffer, originalName, mime);
    return NextResponse.json({ routedTo: "summarization", upstreamResult: result });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
