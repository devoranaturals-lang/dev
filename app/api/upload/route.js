import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs/promises";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serverSupabase =
  supabaseUrl && (supabaseServiceKey || supabaseAnonKey) && !supabaseUrl.includes("your-supabase-project")
    ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: { persistSession: false },
      })
    : null;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder") || "storefront";

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, error: "No valid file uploaded." },
        { status: 400 }
      );
    }

    const originalName = file.name || "image.png";
    const extension = path.extname(originalName) || ".png";
    const cleanBaseName = path.basename(originalName, extension).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${folder}/${Date.now()}_${cleanBaseName}${extension}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/png";

    // 1. Attempt upload to Supabase Storage bucket 'storefront'
    if (serverSupabase) {
      try {
        const { data: buckets } = await serverSupabase.storage.listBuckets();
        const bucketExists = buckets?.some((b) => b.name === "storefront" || b.id === "storefront");

        if (!bucketExists) {
          await serverSupabase.storage.createBucket("storefront", {
            public: true,
            fileSizeLimit: 10485760, // 10MB
          });
        }

        const { data: uploadData, error: uploadError } = await serverSupabase.storage
          .from("storefront")
          .upload(filename, fileBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!uploadError && uploadData?.path) {
          const { data: urlData } = serverSupabase.storage
            .from("storefront")
            .getPublicUrl(uploadData.path);

          if (urlData?.publicUrl) {
            return NextResponse.json({
              success: true,
              url: urlData.publicUrl,
              filename: uploadData.path,
            });
          }
        } else if (uploadError) {
          console.warn("Supabase Storage upload warning:", uploadError.message);
        }
      } catch (storageErr) {
        console.warn("Supabase Storage exception, using filesystem fallback:", storageErr.message);
      }
    }

    // 2. Safe Filesystem Fallback: Save to public/uploads/
    try {
      const publicUploadsDir = path.join(process.cwd(), "public", "uploads", folder);
      await fs.mkdir(publicUploadsDir, { recursive: true });
      const diskFilename = `${Date.now()}_${cleanBaseName}${extension}`;
      const filePath = path.join(publicUploadsDir, diskFilename);
      await fs.writeFile(filePath, fileBuffer);
      const publicUrl = `/uploads/${folder}/${diskFilename}`;

      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename: diskFilename,
      });
    } catch (fsErr) {
      console.warn("Filesystem upload fallback error:", fsErr.message);
    }

    // 3. Compact Base64 fallback if both Supabase and disk are restricted
    const base64Data = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
    return NextResponse.json({
      success: true,
      url: base64Data,
    });
  } catch (err) {
    console.error("Upload API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process image upload." },
      { status: 500 }
    );
  }
}
