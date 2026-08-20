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
    console.log('=== END DEBUG ===');    const body = await request.json();
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

    // Rate limiting check
    const { rateLimit } = await import("@/lib/rate-limit");
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const { success } = await rateLimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Слишком много запросов. Попробуйте через минуту." }, { status: 429 });
    }

    // Get user if authenticated
    const cookieStore = cookies();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check free tier limits
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

    // Create project
    const projectName = source_type === "url" ? new URL(url).hostname :
      source_type === "figma" ? "Figma файл" : `${files.length} файлов`;

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: user?.id || null,
        name: projectName,
        source_type,
        source_url: source_type === "url" ? url : source_type === "figma" ? figma_url : null,
        figma_file_key: source_type === "figma" ? extractFigmaKey(figma_url) : null,
      })
      .select()
      .single();

    if (projectError || !project) {
      console.error("Project creation error:", projectError);
      return NextResponse.json({ error: "Ошибка создания проекта" }, { status: 500 });
    }

    // Create version
    const { data: version, error: versionError } = await supabase
      .from("versions")
      .insert({
        project_id: project.id,
        version_num: 1,
        status: "queued",
      })
      .select()
      .single();

    if (versionError || !version) {
      console.error("Version creation error:", versionError);
      return NextResponse.json({ error: "Ошибка создания версии" }, { status: 500 });
    }

    // Trigger GitHub Actions workflow
    await triggerGitHubActions(version.id, {
      sourceType: source_type,
      url,
      figmaUrl: figma_url,
      figmaToken: figma_token,
      fileNames: files,
      userId: user?.id,
    });

    return NextResponse.json({ jobId: version.id });
  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

function extractFigmaKey(figmaUrl: string): string | null {
  const match = figmaUrl.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

async function triggerGitHubActions(versionId: string, payload: any) {
  const githubToken = process.env.GITHUB_ACTIONS_TOKEN;
  const repo = process.env.GITHUB_REPO; // format: "owner/repo"
  
  if (!githubToken || !repo) {
    console.warn("GitHub Actions not configured, version will stay in 'queued' status");
    return;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${githubToken}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "analyze-landing",
        client_payload: { versionId, ...payload },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("GitHub Actions trigger failed:", error);
    }
  } catch (error) {
    console.error("GitHub Actions trigger error:", error);
  }
}
