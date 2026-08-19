import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const supabase = createClient();

    // Get version with report
    const { data: version, error } = await supabase
      .from("versions")
      .select(`
        *,
        reports (*),
        projects (*)
      `)
      .eq("id", jobId)
      .single();

    if (error || !version) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    return NextResponse.json({
      status: version.status,
      version: {
        id: version.id,
        version_num: version.version_num,
        screenshot_urls: version.screenshot_urls,
        error_message: version.error_message,
        created_at: version.created_at,
      },
      report: version.reports[0] || null,
      project: version.projects,
    });
  } catch (error) {
    console.error("Status API error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}