// app/api/others/upload-notice/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type Body = {
  title: string;
  actionable_insights?: string | null;
  severity?: string | null;
  authorized_by?: string | null;
  deadline?: string | null;
  departments: string[];
  created_at?: string | null;
  file?: string; // base64 or file key from client
  fileName?: string; // original file name
  is_document?: boolean;
};

const DEPT_TABLE_MAP: Record<string, string> = {
  Design: 'design_notice',
  Engineering: 'engineering_notice',
  Finance: 'finance_notice',
  Operations: 'operations_notice',
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const formData = await req.formData();

    const title = formData.get('title') as string;
    const actionable_insights = formData.get('actionable_insights') as string | null;
    const severity = formData.get('severity') as string | null;
    const authorized_by = formData.get('authorized_by') as string | null;
    const deadline = formData.get('deadline') as string | null;
    const departments = JSON.parse(formData.get('departments') as string) as string[];
    const file = formData.get('file') as File | null;
    const isDocument = formData.get('is_document') === 'true';

    // 🔹 Enhanced validation
    if (!title || !departments?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 🔹 Log what we received for debugging
    console.log('Form data received:', {
      title,
      departments,
      isDocument,
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });

    // 🔹 Get authenticated user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error('Authentication error:', userError);
      return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
    }
    const userId = userData.user.id;

    // 🔹 Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, department, designation, phone_number')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const uploaderId = profile.id;
    const uploader_name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
    const department_from = profile.department ?? null;
    const designation = profile.designation ?? null;
    const phone_number = profile.phone_number ?? null;

    const baseNoticeRow = {
      uploader: uploaderId,
      uploader_name,
      department_from,
      designation,
      title,
      actionable_insights,
      created_at: new Date().toISOString(),
      severity,
      authorized_by,
      deadline,
      phone_number,
    };

    let documentPath: string | null = null;

    // 🔹 Upload file if present - IMPROVED ERROR HANDLING
    if (file && file.size > 0) {
      try {
        console.log('Attempting to upload file:', file.name, file.size, file.type);
        
        // Validate file
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
        }

        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${uploaderId}.${ext}`;
        
        console.log('Uploading to storage with filename:', fileName);
        
        const { data: storageData, error: storageError } = await supabase.storage
          .from('documents')
          .upload(fileName, file, { 
            upsert: false,
            contentType: file.type
          });

        if (storageError) {
          console.error('Storage upload error:', storageError);
          return NextResponse.json({ 
            error: 'File upload failed', 
            details: storageError.message || storageError 
          }, { status: 500 });
        }

        documentPath = storageData?.path ?? null;
        console.log('File uploaded successfully, path:', documentPath);
      } catch (uploadError) {
        console.error('File upload exception:', uploadError);
        return NextResponse.json({ 
          error: 'File upload failed', 
          details: String(uploadError) 
        }, { status: 500 });
      }
    } else {
      console.log('No file to upload or file is empty');
    }

    // 🔹 Insert into documents table if is_document - IMPROVED ERROR HANDLING
    if (isDocument) {
      console.log('Inserting into documents table for departments:', departments);
      
      for (const dept of departments) {
        const docRow = {
          uploader: uploaderId,
          uploader_name,
          department_from,
          department_to: dept,
          designation,
          document_path: documentPath,
          title,
          actionable_insights,
          created_at: new Date().toISOString(),
          severity,
          authorized_by,
          deadline,
          is_notice: true, // 🔹 always true
          phone_number,
        };

        console.log('Inserting document row for dept:', dept, docRow);

        try {
          const { data: docData, error: docError } = await supabase
            .from('documents')
            .insert([docRow])
            .select(); // 🔹 returns the inserted row

          if (docError) {
            console.error(`Insert into documents failed for ${dept}:`, docError);
            // Don't return early, continue with other departments
          } else {
            console.log('Successfully inserted document row for', dept, ':', docData);
          }
        } catch (docException) {
          console.error(`Exception inserting document for ${dept}:`, docException);
        }
      }
    }

    // 🔹 Insert into department-specific notice tables - IMPROVED ERROR HANDLING
    console.log('Inserting into department-specific notice tables');
    
    for (const dept of departments) {
      const tableName = DEPT_TABLE_MAP[dept];
      if (!tableName) {
        console.warn(`No table mapping found for department: ${dept}`);
        continue;
      }

      const noticeRow = {
        ...baseNoticeRow,
        document_path: isDocument ? documentPath : null,
      };

      console.log(`Inserting into ${tableName}:`, noticeRow);

      try {
        const { data: noticeData, error: noticeError } = await supabase
          .from(tableName)
          .insert([noticeRow])
          .select();

        if (noticeError) {
          console.error(`Insert into ${tableName} failed:`, noticeError);
        } else {
          console.log(`Successfully inserted into ${tableName}:`, noticeData);
        }
      } catch (noticeException) {
        console.error(`Exception inserting into ${tableName}:`, noticeException);
      }
    }

    console.log('Upload notice process completed successfully');
    return NextResponse.json({ 
      success: true, 
      documentPath,
      message: 'Notice uploaded successfully'
    }, { status: 200 });

  } catch (err) {
    console.error('Unexpected error in upload-notice route:', err);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(err) 
    }, { status: 500 });
  }
}