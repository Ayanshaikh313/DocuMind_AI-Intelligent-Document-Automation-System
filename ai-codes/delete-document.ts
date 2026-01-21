// app/api/signed-url/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // MUST be server-only
);

export async function POST(req: Request) {
  const body = await req.json();
  const { path, expires = 60 } = body; // expires in seconds

  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

  // Optionally check authorization: you can inspect cookies/jwt or accept an auth header
  // For example: check session cookie or verify jwt in request headers (omitted here for brevity)

  const { data, error } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUrl(path, expires);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}
