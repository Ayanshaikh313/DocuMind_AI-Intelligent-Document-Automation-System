// client upload (using lib/supabaseClient.ts client)
async function uploadDocumentFile(file: File, meta) {
  // meta: { title, actionable_insights, severity, departmentTo }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const uploaderId = user.id;
  const filePath = `documents/${uploaderId}/${Date.now()}_${file.name}`;

  // 1) upload to storage
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, { upsert: false });

  if (uploadError) throw uploadError;

  // 2) fetch uploader profile for denormalized fields
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("first_name,last_name,designation,department")
    .eq("id", uploaderId)
    .single();

  if (profileErr) throw profileErr;

  // 3) insert document record (RLS requires uploader_id == auth.uid())
  const { error: insertErr } = await supabase.from("documents").insert([
    {
      uploader_id: uploaderId,
      uploader_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || null,
      department_from: profile?.department ?? null,
      department_to: meta.departmentTo ?? null,
      designation: profile?.designation ?? null,
      title: meta.title,
      document_path: filePath,
      actionable_insights: meta.actionable_insights,
      severity: meta.severity,
    },
  ]);

  if (insertErr) {
    // optionally rollback file (server side remove recommended)
    throw insertErr;
  }

  return { filePath };
}
