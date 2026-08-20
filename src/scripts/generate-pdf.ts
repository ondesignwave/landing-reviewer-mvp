import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const VERSION_ID = process.argv[2];

if (!VERSION_ID) {
  console.error("Usage: tsx generate-pdf.ts <versionId>");
  process.exit(1);
}

async function main() {
  console.log(`[${VERSION_ID}] Generating PDF...`);

  // Fetch full data
  const { data: version, error: vError } = await supabase
    .from("versions")
    .select("*, projects(*), reports(*)")
    .eq("id", VERSION_ID)
    .single();

  if (vError || !version || !version.reports?.length) {
    console.error("Version or report not found");
    await markFailed(VERSION_ID, "Report not ready");
    process.exit(1);
  }

  const report = version.reports[0];
  const project = version.projects;

  try {
    // Generate HTML
    const html = generateReportHTML(report, project, version);
    
    // Render PDF with Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size: 10px; width: 100%; text-align: center; color: #666; padding: 5px;">
        Landing Reviewer — AI-ревью от Senior Art Director
      </div>`,
      footerTemplate: `<div style="font-size: 10px; width: 100%; text-align: center; color: #666; padding: 5px;">
        Страница <span class="pageNumber"></span> из <span class="totalPages"></span> | ${new Date().toLocaleDateString("ru-RU")}
      </div>`,
    });
    
    await browser.close();

    // Upload to Supabase Storage
    const path = `${VERSION_ID}/report.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(path, pdfBuffer, { contentType: "application/pdf", upsert: true });
    
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("pdfs").getPublicUrl(path);

    // Update report with PDF URL
    await supabase
      .from("reports")
      .update({ pdf_url: data.publicUrl })
      .eq("version_id", VERSION_ID);

    // Final version status
    await supabase
      .from("versions")
      .update({ status: "ready" })
      .eq("id", VERSION_ID);

    console.log(`[${VERSION_ID}] PDF generated: ${data.publicUrl}`);
  } catch (err) {
    console.error(`[${VERSION_ID}] PDF generation failed:`, err);
    await markFailed(VERSION_ID, err instanceof Error ? err.message : "PDF generation failed");
    process.exit(1);
  }
}

function generateReportHTML(report: any, project: any, version: any): string {
  const criteria = [
    { key: "hierarchy", label: "Визуальная иерархия", icon: "👁" },
    { key: "typography", label: "Типографика", icon: "📝" },
    { key: "cta_scenario", label: "Сценарий и CTA", icon: "🎯" },
    { key: "responsive", label: "Адаптивность", icon: "📱" },
    { key: "conversion_blocks", label: "Конверсионные блоки", icon: "💰" },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 8) return "#16a34a";
    if (score >= 6) return "#ca8a04";
    if (score >= 4) return "#ea580c";
    return "#dc2626";
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return "#dcfce7";
    if (score >= 6) return "#fef9c3";
    if (score >= 4) return "#ffedd5";
    return "#fee2e2";
  };

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1f2937; }
    .page { page-break-after: always; padding: 40px; }
    .page:last-child { page-break-after: auto; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    h2 { font-size: 20px; font-weight: 600; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
    h3 { font-size: 16px; font-weight: 600; margin: 16px 0 8px; }
    p { margin-bottom: 12px; }
    .score-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 14px; }
    .criteria-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 24px 0; }
    .criteria-card { text-align: center; padding: 16px; border-radius: 8px; background: #f9fafb; }
    .criteria-score { font-size: 32px; font-weight: 700; line-height: 1; }
    .criteria-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .issue { padding: 12px; background: #fef2f2; border-left: 4px solid #ef4444; margin: 8px 0; border-radius: 0 8px 8px 0; }
    .checklist-item { display: flex; gap: 12px; padding: 12px; background: #f9fafb; border-radius: 8px; margin: 8px 0; }
    .priority { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0; }
    .priority-1 { background: #fee2e2; color: #991b1b; }
    .priority-2 { background: #fef9c3; color: #854d0e; }
    .priority-3 { background: #dcfce7; color: #166534; }
    .screenshots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
    .screenshot { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .screenshot img { width: 100%; height: auto; display: block; }
    .screenshot-label { padding: 8px; background: #f3f4f6; font-size: 12px; color: #6b7280; text-align: center; }
    .meta { display: flex; gap: 24px; margin-bottom: 24px; font-size: 14px; color: #6b7280; }
    .meta-item { display: flex; align-items: center; gap: 6px; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <!-- Page 1: Title + Executive Summary -->
  <div class="page">
    <h1>Ревью лендинга: ${project.name}</h1>
    <div class="meta">
      <span class="meta-item">Источник: ${project.source_type === "url" ? "URL" : project.source_type === "figma" ? "Figma" : "Файлы"}</span>
      <span class="meta-item">Версия: v${version.version_num}</span>
      <span class="meta-item">Дата: ${new Date(version.created_at).toLocaleDateString("ru-RU")}</span>
    </div>
    
    <h2>Executive Summary</h2>
    <p><strong>Общий балл: <span class="score-badge" style="background: ${getScoreBg(report.overall_score)}; color: ${getScoreColor(report.overall_score)};">${report.overall_score.toFixed(1)}/10</span></strong></p>
    <p>Этот отчёт содержит экспертный анализ вашего лендинга по 5 ключевым критериям. Каждый критерий оценён по 10-балльной шкале с детальным разбором проблем и приоритизированным чек-листом правок.</p>
    
    <div class="criteria-grid">
      ${criteria.map(c => {
        const score = report.criteria_scores[c.key] || 0;
        return `
        <div class="criteria-card" style="background: ${getScoreBg(score)};">
          <div class="criteria-score" style="color: ${getScoreColor(score)};">${score}</div>
          <div class="criteria-label">${c.icon} ${c.label}</div>
        </div>
        `;
      }).join("")}
    </div>

    <h2>Скриншоты</h2>
    <div class="screenshots">
      ${(version.screenshot_urls || []).map((url: string, i: number) => `
        <div class="screenshot">
          <img src="${url}" alt="Screenshot ${i+1}">
          <div class="screenshot-label">${["Десктоп", "Планшет", "Мобильный"][i] || `Вид ${i+1}`}</div>
        </div>
      `).join("")}
    </div>
  </div>

  <!-- Page 2+: Criteria Details -->
  ${criteria.map(c => {
    const score = report.criteria_scores[c.key] || 0;
    const issues = report.issues[c.key] || [];
    return `
  <div class="page">
    <h2>${c.icon} ${c.label} <span class="score-badge" style="background: ${getScoreBg(score)}; color: ${getScoreColor(score)};">${score}/10</span></h2>
    ${issues.length === 0 ? `
      <p style="color: #16a34a; font-weight: 500;">✅ Серьёзных проблем не выявлено</p>
    ` : issues.map((issue: string) => `
      <div class="issue">${issue}</div>
    `).join("")}
  </div>
    `;
  }).join("")}

  <!-- Checklist Page -->
  <div class="page">
    <h2>📋 Приоритизированный чек-лист правок</h2>
    <p>Выполняйте в порядке приоритета. 1 = критично (блокирует сдачу), 2 = важно (сильно улучшит результат), 3 = желательно (повысит качество).</p>
    ${(report.checklist || []).map((item: any) => `
      <div class="checklist-item">
        <span class="priority priority-${item.priority}">${item.priority}</span>
        <div>
          <strong>${item.text}</strong>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Критерий: ${criteria.find(x => x.key === item.criterion)?.label || item.criterion}</div>
        </div>
      </div>
    `).join("")}
  </div>

  <!-- Final Page -->
  <div class="page">
    <h2>Как это улучшит ваш результат</h2>
    <ul style="margin-left: 20px; line-height: 2;">
      <li><strong>Для портфолио:</strong> Чистый, профессиональный лендинг показывает уровень Senior-дизайнера</li>
      <li><strong>Для клиента:</strong> Меньше правок, быстрее одобрение, выше доверие к экспертизе</li>
      <li><strong>Для конверсии:</strong> Исправление иерархии и CTA напрямую влияет на лиды/продажи</li>
      <li><strong>Для адаптивности:</strong> Работающий мобильный = 60%+ трафика не теряется</li>
    </ul>
    <div class="footer">
      Сгенерировано Landing Reviewer AI • ${new Date().toLocaleDateString("ru-RU")}<br>
      <a href="https://landing-reviewer.vercel.app" style="color: #6366f1;">landing-reviewer.vercel.app</a>
    </div>
  </div>
</body>
</html>
  `;
}

async function markFailed(versionId: string, message: string) {
  await supabase
    .from("versions")
    .update({ status: "failed", error_message: message })
    .eq("id", versionId);
}

main();