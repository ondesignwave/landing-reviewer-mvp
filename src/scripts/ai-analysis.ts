import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const VERSION_ID = process.argv[2];

if (!VERSION_ID) {
  console.error("Usage: tsx ai-analysis.ts <versionId>");
  process.exit(1);
}

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5vl:7b";

async function main() {
  console.log(`[${VERSION_ID}] Starting AI analysis with ${MODEL}...`);

  // Fetch version with screenshots
  const { data: version, error } = await supabase
    .from("versions")
    .select("screenshot_urls")
    .eq("id", VERSION_ID)
    .single();

  if (error || !version || !version.screenshot_urls?.length) {
    console.error("Version not found or no screenshots");
    await markFailed(VERSION_ID, "No screenshots available");
    process.exit(1);
  }

  const screenshots = version.screenshot_urls;

  try {
    // Build prompt with images
    const prompt = buildPrompt();
    const messages = await buildMessages(prompt, screenshots);

    // Call Ollama
    const analysis = await callOllama(messages);
    
    // Parse and validate
    const parsed = parseAnalysis(analysis);
    
    // Save report
    const { error: insertError } = await supabase.from("reports").insert({
      version_id: VERSION_ID,
      criteria_scores: parsed.criteria_scores,
      issues: parsed.issues,
      checklist: parsed.checklist,
      overall_score: parsed.overall_score,
    });

    if (insertError) throw insertError;

    console.log(`[${VERSION_ID}] Analysis complete. Score: ${parsed.overall_score}`);
  } catch (err) {
    console.error(`[${VERSION_ID}] Analysis failed:`, err);
    await markFailed(VERSION_ID, err instanceof Error ? err.message : "Analysis failed");
    process.exit(1);
  }
}

function buildPrompt(): string {
  return `Ты — Senior Art Director с 15+ лет опыта. Проанализируй лендинг по 5 критериям и верни СТРОГО JSON.

КРИТЕРИИ:
1. hierarchy (Визуальная иерархия): приоритеты внимания, фокус, дыхание, вес элементов, сканируемость
2. typography (Типографика): шрифты, размеры, интерлиньяж, контраст, читаемость, ритм, WCAG AA
3. cta_scenario (Сценарий и CTA): пользовательский путь, ясность действий, микрокопирайтинг, приоритет кнопок
4. responsive (Адаптивность): breakpoints, переполнение, тач-таргеты, безопасные зоны, контент-шифт
5. conversion_blocks (Конверсионные блоки): Hero, соцдоказательства, формы, гарантии, urgency, risk reversal

ФОРМАТ ОТВЕТА (только JSON, без markdown):
{
  "criteria_scores": {"hierarchy": 7, "typography": 6, "cta_scenario": 8, "responsive": 5, "conversion_blocks": 7},
  "issues": {
    "hierarchy": ["проблема 1", "проблема 2"],
    "typography": ["проблема 1"],
    "cta_scenario": [],
    "responsive": ["проблема 1", "проблема 2"],
    "conversion_blocks": ["проблема 1"]
  },
  "checklist": [
    {"priority": 1, "text": "Критично: исправить сразу", "criterion": "hierarchy"},
    {"priority": 2, "text": "Важно: сделать до сдачи", "criterion": "typography"},
    {"priority": 3, "text": "Желательно: улучшит результат", "criterion": "conversion_blocks"}
  ],
  "overall_score": 6.6
}

ТОН: экспертный, конкретный, конструктивный. Оценки 1-10. Приоритеты: 1=критично, 2=важно, 3=желательно.`;
}

async function buildMessages(prompt: string, screenshots: string[]) {
  // Ollama's native /api/chat wants string content plus a separate
  // base64 `images` array — not OpenAI's image_url content blocks.
  const images = await Promise.all(
    screenshots.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch screenshot: ${url}`);
      const buf = await res.arrayBuffer();
      return Buffer.from(buf).toString("base64");
    })
  );

  return [
    { role: "system", content: "Ты — Senior Art Director. Анализируй строго по критериям. Отвечай только валидным JSON." },
    { role: "user", content: prompt, images },
  ];
}

async function callOllama(messages: any[]): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 2048,
        num_ctx: 8192,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama error: ${error}`);
  }

  const data = await response.json();
  return data.message.content;
}

function parseAnalysis(text: string) {
  // Extract JSON from response (in case model adds extra text)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  // Validate required fields
  const required = ["criteria_scores", "issues", "checklist", "overall_score"];
  for (const field of required) {
    if (!(field in parsed)) throw new Error(`Missing field: ${field}`);
  }
  
  // Ensure all criteria present
  const criteria = ["hierarchy", "typography", "cta_scenario", "responsive", "conversion_blocks"];
  for (const c of criteria) {
    if (!(c in parsed.criteria_scores)) parsed.criteria_scores[c] = 5;
    if (!(c in parsed.issues)) parsed.issues[c] = [];
  }
  
  // Validate checklist format
  if (!Array.isArray(parsed.checklist)) parsed.checklist = [];
  
  return parsed;
}

async function markFailed(versionId: string, message: string) {
  await supabase
    .from("versions")
    .update({ status: "failed", error_message: message })
    .eq("id", versionId);
}

main();