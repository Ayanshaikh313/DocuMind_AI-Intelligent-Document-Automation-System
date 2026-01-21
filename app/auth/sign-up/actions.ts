"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  // Read and normalize fields from the form
  const firstName = (formData.get("firstName") as string | null)?.trim() ?? "";
  const lastName = (formData.get("lastName") as string | null)?.trim() ?? "";
  const designation =
    (formData.get("designation") as string | null)?.trim() ?? "";
  const customDesignation =
    (formData.get("customDesignation") as string | null)?.trim() ?? "";
  const department =
    (formData.get("department") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const phoneNumber =
    (formData.get("phoneNumber") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  // Enhanced server-side validation
  if (
    !firstName ||
    !lastName ||
    !designation ||
    !email ||
    !password ||
    !phoneNumber
  ) {
    console.error("Missing required fields:", {
      firstName: !!firstName,
      lastName: !!lastName,
      designation: !!designation,
      email: !!email,
      password: !!password,
      phoneNumber: !!phoneNumber, // Add this line
    });
    redirect("/error");
  }

  // Validate designation-specific requirements
  if (designation !== "Director" && !department) {
    console.error("Department required for non-director roles");
    redirect("/error");
  }

  if (designation === "Others" && !customDesignation) {
    console.error("Custom designation required for Others role");
    redirect("/error");
  }

  try {
    console.log("Attempting to create user with email:", email);

    // create the auth user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email,
        password,
      }
    );

    if (signUpError) {
      console.error("Supabase auth signup error:", signUpError);
      redirect("/error");
    }

    console.log("Auth signup successful:", !!signUpData.user);

    // If signUpData.user exists, we can immediately create the profile row.
    // If not, it likely means email confirmation is required (or similar).
    const user = signUpData?.user ?? null;

    if (!user || !user.id) {
      console.log("No user returned, likely requires email confirmation");
      revalidatePath("/", "layout");
      redirect("/check-email");
    }

    // decide booleans and canonical designation text
    const isDirector = designation === "Director";
    const isBranchManager = designation === "Department Manager";
    const isOthers = designation === "Others";
    const canonicalDesignation = isOthers
      ? customDesignation || "Others"
      : designation;

    // Create profile row
    const profileRow = {
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone_number: phoneNumber, // Add this line
      designation: canonicalDesignation || null,
      is_director: isDirector,
      is_branch_manager: isBranchManager,
      is_others: isOthers,
      department: isDirector ? null : department || null,
    };

    console.log("Attempting to insert profile:", profileRow);

    const { error: insertError } = await supabase
      .from("profiles")
      .insert([profileRow]);

    if (insertError) {
      console.error("Profile insert error:", insertError);
      redirect("/error");
    }

    console.log("Profile inserted successfully");

    // revalidate home
    revalidatePath("/", "layout");

    // Redirect to login page after successful signup
    // This is more standard UX - user signs up, then logs in
    redirect("/auth/login?message=signup-success");
  } catch (err) {
    // Don't log NEXT_REDIRECT errors as they are expected
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err; // Re-throw redirect errors
    }
    console.error("Unexpected signup error:", err);
    redirect("/error");
  }
}
