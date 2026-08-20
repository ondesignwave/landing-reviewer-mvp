import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log('=== DEBUG ENV ===');
    console.log('GITHUB_REPO:', process.env.GITHUB_REPO);
    console.log('GITHUB_ACTIONS_TOKEN:', process.env.GITHUB_ACTIONS_TOKEN ? 'SET' : 'MISSING');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
    console.log('=== END DEBUG ===');

    const body = await request.json();
    const { source_type, url, figma_url, figma_token, files } = body;

    if (!source_type || !["url", "figma", "files"].includes(source_type)) {
      return NextResponse.json({ error: "Неверный тип источника" }, { status: 400 });
    }

    if (source_type === "url" && !url) {
      return NextResponse.json({ error: "URL обязателен" }, { status: 400 });
    }
    if (source_type === "figma" && !figma_url) {
      return NextResponse.json({ error: "Figma URL обязателен" }, { status: 400 });
    }
    if (source_type === "files" && (!files || files.length === 0)) {
      return NextResponse.json({ error: "Файлы обязательны" }, { status: 400 });
    }

    const { rateLimit } = await import("@/lib/rate-limit");
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const { success } = await rateLimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Слишком много запросов. Попробуйте через минуту." }, { status: 429 });
    }

    const cookieStore = cookies();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();

      const tier = profile?.subscription_tier || "free";
      if (tier === "free") {
        const { count } = await supabase
          .from("versions")
          .select("*", { count: "exact", head: true })
          .eq("project_id", (await supabase.from("projects").select("id").eq("user_id", user.id)).data?.[0]?.id || "")
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        if (count && count >= 1) {
          return NextResponse.json({ error: "Free тариф: 1 разбор в неделю. Обновите до Pro." }, { status: 403 });
        }
      }
    }

    const projectName = source_type === "url" ? new
