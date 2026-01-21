import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const filename = file.name;
  const ext = filename.split(".").pop()?.toLowerCase();

  let extractionEndpoint = "";

  switch (ext) {
    case "txt":
      extractionEndpoint = "/api/summarization/dsf/extraction/txt";
      break;
    case "json":
      extractionEndpoint = "/api/summarization/dsf/extraction/json";
      break;
    case "csv":
      extractionEndpoint = "/api/summarization/dsf/extraction/csv";
      break;
    case "xml":
      extractionEndpoint = "/api/summarization/dsf/extraction/xml";
      break;
    default:
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const newForm = new FormData();
  newForm.append("file", file);

  const resp = await fetch(extractionEndpoint, {
    method: "POST",
    body: newForm,
  });

  const json = await resp.json();
  return NextResponse.json(json);
}
