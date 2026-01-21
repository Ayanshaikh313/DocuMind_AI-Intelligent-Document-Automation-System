// app/api/summarization/document/staging/route.ts
import { NextResponse } from "next/server";

const MAX_PPT_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

function extFromFilename(filename: string | undefined | null) {
  if (!filename) return "";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ext;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    // Use Next.js App Router native FormData parsing
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    const filename = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());
    const size = buffer.byteLength;
    const mime = file.type || "application/octet-stream";

    // Determine extension and route
    const ext = extFromFilename(filename);
    let targetPath = "/api/summarization/document/summarization"; // default

    const pptExts = ["ppt", "pptx"];
    const docExts = ["doc", "docx"];
    const xlsExts = ["xls", "xlsx"];
    const pdfExts = ["pdf"];

    if (pptExts.includes(ext)) {
      targetPath = size > MAX_PPT_SIZE_BYTES
        ? "/api/summarization/document/compression"
        : "/api/summarization/document/conversion/ppt";
    } else if (docExts.includes(ext)) {
      targetPath = "/api/summarization/document/conversion/doc";
    } else if (xlsExts.includes(ext)) {
      targetPath = "/api/summarization/document/conversion/xls";
    } else if (pdfExts.includes(ext)) {
      targetPath = "/api/summarization/document/summarization";
    }

    // Build absolute URL for forwarding
    const baseUrl = new URL(req.url).origin;
    const forwardUrl = new URL(targetPath, baseUrl).toString();

    // Forward the file to the target endpoint
    const forwardForm = new FormData();
    forwardForm.append("file", new Blob([buffer], { type: mime }), filename);

    const forwardResp = await fetch(forwardUrl, {
      method: "POST",
      body: forwardForm as any,
    });

    const contentTypeForward = forwardResp.headers.get("content-type") || "";

    if (contentTypeForward.includes("application/json")) {
      const json = await forwardResp.json();
      return NextResponse.json(json, { status: forwardResp.status });
    }

    const text = await forwardResp.text();
    return new NextResponse(text, {
      status: forwardResp.status,
      headers: { "content-type": contentTypeForward },
    });
  } catch (err: any) {
    console.error("Staging routing error:", err);
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
