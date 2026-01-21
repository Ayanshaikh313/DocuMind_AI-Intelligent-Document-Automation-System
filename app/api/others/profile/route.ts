// app/api/others/profile/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET (request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Not authenticated" }, 
        { status: 401 }
      );
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("first_name, last_name, designation, department")
      .eq("id", user.id)
      .single();

    if (profileErr) {
      console.error("Profile fetching error:", profileErr);
      return NextResponse.json({
        displayName: user.email ?? user.id,
        displayProfession: "No designation",
        displayDepartment: "No department",
      });
    }

    const displayName =
      profile && (profile.first_name || profile.last_name)
        ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
        : user.email ?? user.id;

    const displayProfession = profile?.designation ?? "No designation";
    const displayDepartment = profile?.department ?? "No department";

    return NextResponse.json({
      displayName,
      displayProfession,
      displayDepartment,
    });

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Not authenticated" }, 
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        first_name: body.firstName,
        last_name: body.lastName,
        designation: body.designation,
        department: body.department,
      })
      .eq("id", user.id)
      .select();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update profile" }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("POST API Route Error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}