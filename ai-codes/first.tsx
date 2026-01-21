"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function UploadDocument() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [actionable, setActionable] = useState("");
  const [severity, setSeverity] = useState<number>(1);
  const [departmentTo, setDeptTo] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const uploaderId = user.id;

      // 1) upload file to storage (if file present)
      let path = null;
      if (file) {
        const filePath = `documents/${uploaderId}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("documents")
          .upload(filePath, file, { upsert: false });

        if (upErr) throw upErr;
        path = filePath;
      }

      // 2) fetch profile to get name/designation
      const { data: profile } = await supabase.from("profiles").select("first_name,last_name,designation,department").eq("id", uploaderId).single();

      // 3) insert documents row
      const { error: insertErr } = await supabase.from("documents").insert([
        {
          uploader_id: uploaderId,
          uploader_name: profile ? `${profile.first_name} ${profile.last_name}` : null,
          department_from: profile?.department ?? null,
          department_to: departmentTo || null,
          designation: profile?.designation ?? null,
          title,
          document_path: path,
          actionable_insights: actionable,
          severity: severity,
        },
      ]);

      if (insertErr) throw insertErr;

      // success
      setTitle("");
      setActionable("");
      setFile(null);
      alert("Uploaded");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
      <select value={departmentTo} onChange={(e) => setDeptTo(e.target.value)}>
        <option value="">Select target department</option>
        <option value="Engineering">Engineering</option>
        <option value="Finance">Finance</option>
        <option value="Operations">Operations</option>
        <option value="Design">Design</option>
      </select>
      <input type="file" onChange={handleFileChange} />
      <textarea value={actionable} onChange={(e) => setActionable(e.target.value)} placeholder="Actionable insights" />
      <input type="number" value={severity} onChange={(e) => setSeverity(Number(e.target.value))} min={1} max={10} />
      <button type="submit" disabled={loading}>{loading ? "Uploading..." : "Upload Document"}</button>
    </form>
  );
}
