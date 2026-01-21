import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import path from "path";
import { convert } from "libreoffice-convert"; // install libreoffice-convert

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    // Read DOC/DOCX into buffer
    const arrayBuffer = await file.arrayBuffer();
    const docBuffer = Buffer.from(arrayBuffer);

    // Convert DOC/DOCX → PDF
    const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
      convert(docBuffer, ".pdf", undefined, (err, done) => {
        if (err) reject(err);
        else resolve(done);
      });
    });

    // Save temporarily to check size
    const tempPath = path.join("/tmp", `${Date.now()}.pdf`);
    fs.writeFileSync(tempPath, pdfBuffer);

    const stats = fs.statSync(tempPath);
    const fileSizeMB = stats.size / (1024 * 1024);

    if (fileSizeMB > 20) {
      // Forward to compression API
      const resp = await fetch(`${process.env.BASE_URL}/api/summarization/document/compression`, {
        method: "POST",
        body: pdfBuffer,
        headers: { "Content-Type": "application/pdf" },
      });
      return NextResponse.json(await resp.json());
    } else {
      // Forward to summarization API
      const resp = await fetch(`${process.env.BASE_URL}/api/summarization/document/summarization`, {
        method: "POST",
        body: pdfBuffer,
        headers: { "Content-Type": "application/pdf" },
      });
      return NextResponse.json(await resp.json());
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
