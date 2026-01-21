// app/api/summarization/document/compression/route.ts
/**
 * Compression route (NO Ghostscript)
 *
 * Strategy:
 * 1. If incoming PDF <= TARGET_SIZE => forward directly to summarization.
 * 2. Try cheap compression: re-save with pdf-lib removing metadata.
 * 3. If still large: rasterize pages with pdfjs-dist => compress JPEGs with sharp =>
 *    assemble a new PDF with pdf-lib. (Aggressive but drops selectable text.)
 * 4. If final PDF <= TARGET_SIZE => forward to summarization.
 * 5. Else return 413-like response recommending installing qpdf/ghostscript or
 *    using an external compression microservice.
 *
 * Dependencies (install):
 *   npm i pdf-lib pdfjs-dist canvas sharp
 *
 * System libs required:
 *   - node-canvas requires Cairo & friends (see node-canvas docs)
 *   - sharp downloads libvips binary when installed
 *
 * NOTE: This is CPU- and memory-heavy. Consider running in a worker/container.
 */

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js"; // legacy build works in Node
import { createCanvas, Image } from "canvas";
import sharp from "sharp";

export const runtime = "nodejs";

const TARGET_SIZE = 19 * 1024 * 1024; // 19 MB
const MAX_PAGES_RASTERIZE = 200; // guard — avoid insane PDFs

// helper to forward a PDF buffer to summarization endpoint
async function forwardToSummarization(reqUrl: string, pdfBuffer: Buffer, filename = "compressed.pdf") {
  const baseUrl = new URL(reqUrl).origin;
  const forwardUrl = new URL("/api/summarization/document/summarization", baseUrl).toString();

  // build FormData (Node 18+ environment supports global FormData & Blob)
  const form = new FormData();
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  form.append("file", blob, filename);

  const resp = await fetch(forwardUrl, {
    method: "POST",
    body: form as any,
  });

  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) return NextResponse.json(await resp.json(), { status: resp.status });
  const txt = await resp.text();
  return new NextResponse(txt, { status: resp.status, headers: { "content-type": ct } });
}

// quick cheap re-save with pdf-lib (strips metadata)
async function quickResavePdf(inputBuffer: Buffer) {
  const pdfDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  // clear some metadata
  pdfDoc.setTitle("");
  pdfDoc.setAuthor("");
  pdfDoc.setSubject("");
  pdfDoc.setProducer("");
  pdfDoc.setCreator("");
  pdfDoc.setCreationDate(undefined as any);
  pdfDoc.setModificationDate(undefined as any);

  // Save with compression
  const out = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
  return Buffer.from(out);
}

// rasterize pages using pdfjs-dist + canvas, compress images with sharp, then reassemble PDF with pdf-lib
async function rasterizeAndRebuildPdf(inputBuffer: Buffer, quality = 65, scale = 1.0) {
  // Load PDF via pdfjs
  const loadingTask = pdfjsLib.getDocument({ data: inputBuffer });
  const pdf = await loadingTask.promise;

  const numPages = pdf.numPages;
  if (numPages > MAX_PAGES_RASTERIZE) {
    throw new Error(`PDF has too many pages (${numPages}). Aborting rasterization.`);
  }

  const pageImages: { data: Buffer; width: number; height: number }[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);

    const viewport = page.getViewport({ scale: 1.0 * scale });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");

    // Prepare render context for pdfjs
    const renderContext = {
      canvasContext: ctx,
      viewport,
    };

    // Render page to canvas
    await page.render(renderContext).promise;

    // Get PNG buffer from canvas
    const pngBuffer = canvas.toBuffer("image/png");

    // Compress/resize using sharp -> JPEG (smaller than PNG for photos)
    // You can adjust resizing rules here: for very large pages, downscale
    const img = sharp(pngBuffer);

    // Optionally downscale large pages (example: limit 2480px height)
    const metadata = await img.metadata();
    let resizeOptions: { width?: number; height?: number } = {};
    const maxDim = 2480; // ~300 DPI for A4 at 8.27in*300 ≈ 2481px
    if ((metadata.width ?? 0) > maxDim || (metadata.height ?? 0) > maxDim) {
      const ratio = (metadata.width ?? maxDim) / (metadata.height ?? maxDim);
      if ((metadata.width ?? 0) >= (metadata.height ?? 0)) resizeOptions.width = Math.round(maxDim);
      else resizeOptions.height = Math.round(maxDim);
    }

    let jpeg = img;
    if (resizeOptions.width || resizeOptions.height) jpeg = jpeg.resize(resizeOptions);
    jpeg = jpeg.jpeg({ quality, mozjpeg: true });

    const jpegBuffer = await jpeg.toBuffer();
    const jpgMeta = await sharp(jpegBuffer).metadata();

    pageImages.push({
      data: jpegBuffer,
      width: jpgMeta.width ?? viewport.width,
      height: jpgMeta.height ?? viewport.height,
    });

    // free page resources
    page.cleanup?.();
  }

  // Reassemble into a new PDF using pdf-lib
  const outPdf = await PDFDocument.create();

  for (const img of pageImages) {
    // embed JPEG (pdf-lib supports embedJpg)
    const jpg = await outPdf.embedJpg(img.data);
    const page = outPdf.addPage([jpg.width, jpg.height]);
    page.drawImage(jpg, {
      x: 0,
      y: 0,
      width: jpg.width,
      height: jpg.height,
    });
  }

  const outBytes = await outPdf.save({ useObjectStreams: true });
  return Buffer.from(outBytes);
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ success: false, error: "Content-Type must be multipart/form-data" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded (field name: file)" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ success: false, error: "Only PDF files supported" }, { status: 400 });
    }

    const originalFilename = file.name;
    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // If already small enough, forward immediately
    if (inputBuffer.length <= TARGET_SIZE) {
      return await forwardToSummarization(request.url, inputBuffer, originalFilename);
    }

    // 1) Quick cheap resave using pdf-lib (may remove metadata)
    let compressed = await quickResavePdf(inputBuffer);
    if (compressed.length <= TARGET_SIZE) {
      return await forwardToSummarization(request.url, compressed, originalFilename);
    }

    // 2) Aggressive rasterize & recompress pass
    // We'll try a few configurations progressively reducing quality/resolution
    const attempts = [
      { quality: 70, scale: 1.0 },
      { quality: 60, scale: 0.95 },
      { quality: 50, scale: 0.9 },
      { quality: 40, scale: 0.85 },
    ];

    let success = false;
    let finalBuffer: Buffer | null = null;

    for (const attempt of attempts) {
      try {
        const rebuilt = await rasterizeAndRebuildPdf(inputBuffer, attempt.quality, attempt.scale);
        if (rebuilt.length <= TARGET_SIZE) {
          finalBuffer = rebuilt;
          success = true;
          break;
        } else {
          // keep the smallest we have
          if (!finalBuffer || rebuilt.length < finalBuffer.length) finalBuffer = rebuilt;
        }
      } catch (err) {
        // continue to next attempt — but log
        console.warn("Rasterization attempt failed:", err);
      }
    }

    if (success && finalBuffer) {
      return await forwardToSummarization(request.url, finalBuffer, originalFilename);
    }

    // If we have a finalBuffer (smaller but still > TARGET) we can still forward it
    // or suggest alternative. Here we forward only if it's smaller than original,
    // but still larger than target - user asked specifically to convert to size 19MB,
    // so we will return an informative error recommending better tools.
    if (finalBuffer && finalBuffer.length < inputBuffer.length) {
      // forward anyway? safer to return a helpful error and provide the compressed result link.
      // We'll return 413 with details and include returned compressed size (best effort).
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not reduce PDF under 19 MB with Node-only rasterization approach. " +
            "Best-effort compressed PDF is attached as base64 (may still be >19MB). " +
            "For reliable compression under a size threshold use a binary tool (qpdf/ghostscript) or an external compression microservice.",
          originalSize: inputBuffer.length,
          bestAttemptSize: finalBuffer.length,
          bestAttemptBase64: finalBuffer.toString("base64"),
        },
        { status: 413 }
      );
    }

    // If no finalBuffer or nothing helped, return guidance
    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to compress PDF under 19 MB using pure-Node techniques in this environment. " +
          "Recommended options: install qpdf or ghostscript (server binary) and use them for compression, or send the PDF to a specialized cloud compression API.",
        originalSize: inputBuffer.length,
      },
      { status: 500 }
    );
  } catch (err: any) {
    console.error("Compression route error:", err);
    return NextResponse.json({ success: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
