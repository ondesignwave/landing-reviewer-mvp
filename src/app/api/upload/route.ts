import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];
// Vercel serverless functions hard-cap the request body at ~4.5MB — a
// bigger file never reaches this handler at all, so this exists as a
// clear error for anything that slips through client-side compression.
const MAX_SIZE_BYTES = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const { uploadRateLimit } = await import("@/lib/rate-limit");
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const { success } = await uploadRateLimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Слишком много запросов. Попробуйте через минуту." },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Неподдерживаемый тип файла: ${file.type || "неизвестный"}` },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Файл превышает 4MB" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const ext = file.type === "image/png" ? "png" : "jpg";
    const path = `uploads/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from("screenshots")
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (error) {
      console.error("Upload storage error:", error);
      return NextResponse.json({ error: "Не удалось загрузить файл" }, { status: 500 });
    }

    const { data } = supabase.storage.from("screenshots").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
