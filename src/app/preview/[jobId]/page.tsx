"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle,
  Circle,
  AlertCircle,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Share2,
  Camera,
  Sparkles,
} from "lucide-react";
import {
  IconHierarchy2,
  IconTypography,
  IconClick,
  IconResize,
  IconTargetArrow,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatRelativeTime, getScoreTextColor, pluralizeRu, cn } from "@/lib/utils";

const gradientButtonStyle: React.CSSProperties = {
  background: "linear-gradient(70deg, #bdd3ff 0%, #0b9eec 45%, #da7ad6 100%)",
};

const CRITERIA = [
  { key: "hierarchy", label: "Визуальная иерархия", icon: IconHierarchy2 },
  { key: "typography", label: "Типографика", icon: IconTypography },
  { key: "cta_scenario", label: "Сценарий и CTA", icon: IconClick },
  { key: "responsive", label: "Адаптивность", icon: IconResize },
  { key: "conversion_blocks", label: "Конверсионные блоки", icon: IconTargetArrow },
] as const;

export default function PreviewPage({ params }: { params: { jobId: string } }) {
  const router = useRouter();
  const jobId = params.jobId;

  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!jobId) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        const json = await res.json();
        setData(json);
        setLoading(false);

        if (json.status === "processing") {
          setTimeout(fetchStatus, 2000);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchStatus();
  }, [jobId]);

  React.useEffect(() => {
    if (data?.status !== "processing") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [data?.status]);

  if (loading) {
    return (
      <div className="hero-gradient min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-16 w-16">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Загружаем разбор...</h2>
        </div>
      </div>
    );
  }

  if (!data?.version) {
    return (
      <div className="hero-gradient min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Разбор не найден</h2>
          <p className="text-muted-foreground mb-4">Возможно, анализ ещё не завершился или произошла ошибка</p>
          <Button onClick={() => router.push("/")}>На главную</Button>
        </div>
      </div>
    );
  }

  const { version, report, project, status } = data;
  const isReady = status === "ready" && report;
  const isProcessing = status === "processing";

  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - new Date(version.created_at).getTime()) / 1000)
  );
  const elapsedLabel = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, "0")}`;

  const stage: "screenshots" | "analysis" | "pdf" = !version.screenshot_urls?.length
    ? "screenshots"
    : !report
      ? "analysis"
      : "pdf";

  const STAGES = [
    { key: "screenshots", label: "Делаем скриншоты", icon: Camera },
    { key: "analysis", label: "AI анализирует дизайн", icon: Sparkles },
    { key: "pdf", label: "Готовим PDF-отчёт", icon: FileText },
  ] as const;
  const stageIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="hero-gradient min-h-screen">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <X className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">Превью разбора</h1>
              <p className="text-xs text-muted-foreground">
                {project?.name} · {formatRelativeTime(version.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isProcessing && (
              <Badge className="border-primary/20 bg-primary/10 text-primary gap-1.5 hover:bg-primary/10 tabular-nums">
                <Loader2 className="h-3 w-3 animate-spin" />
                Обработка · {elapsedLabel}
              </Badge>
            )}
            {status === "ready" && <Badge variant="success">Готово</Badge>}
            {status === "failed" && <Badge variant="destructive">Ошибка</Badge>}
          </div>
        </div>
      </header>

      {status === "failed" && (
        <div className="container mx-auto px-4 py-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Ошибка анализа</h2>
          <p className="text-muted-foreground mb-6">{version.error_message || "Неизвестная ошибка"}</p>
          <Button onClick={() => router.push("/")}>Попробовать снова</Button>
        </div>
      )}

      {isProcessing && (
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-sm mx-auto">
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
            <h2 className="text-h3 font-semibold mb-2">Анализируем {project?.name}</h2>
            <p className="text-sm text-muted-foreground mb-1">Обычно занимает 3–5 минут</p>
            <p className="text-sm text-foreground font-medium mb-8 tabular-nums">Прошло {elapsedLabel}</p>

            <div className="space-y-3">
              {STAGES.map((s, i) => {
                const done = i < stageIndex;
                const active = i === stageIndex;
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    {done ? (
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    ) : active ? (
                      <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/30 flex-shrink-0" />
                    )}
                    <span className={cn("text-sm", active ? "font-medium text-foreground" : done ? "text-foreground" : "text-muted-foreground")}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isReady && (
        <div className="container mx-auto px-4 py-8">
          {/* Overall Score */}
          <Card className="mb-8 bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <p className="text-sm text-muted-foreground mb-1">Общий балл</p>
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-5xl font-bold", getScoreTextColor(report.overall_score))}>
                      {report.overall_score.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">/ 10</span>
                  </div>
                </div>
                <Separator orientation="vertical" className="h-16 md:h-20 mx-4 md:mx-0" />
                <div className="grid grid-cols-5 gap-4 text-center">
                  {CRITERIA.map((c) => {
                    const score = report.criteria_scores[c.key] || 0;
                    return (
                      <div key={c.key} className="rounded-lg p-3 bg-muted/40">
                        <c.icon className={cn("h-4 w-4 mx-auto mb-1", getScoreTextColor(score))} />
                        <p className={cn("text-2xl font-bold tabular-nums", getScoreTextColor(score))}>
                          {score.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Screenshots */}
          {version.screenshot_urls && version.screenshot_urls.length > 0 && (
            <Card className="mb-8 bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Скриншоты
                  <span className="text-sm font-normal text-muted-foreground">
                    {version.screenshot_urls.length}{" "}
                    {pluralizeRu(version.screenshot_urls.length, "ракурс", "ракурса", "ракурсов")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {version.screenshot_urls.map((url: string, i: number) => (
                    <div key={i} className="relative aspect-[16/10] rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={url}
                        alt={`Screenshot ${i + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        {project?.source_type === "url"
                          ? ["Десктоп", "Планшет", "Мобильный"][i] || `Вид ${i + 1}`
                          : `Файл ${i + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Criteria Details */}
          <div className="space-y-4 mb-8">
            {CRITERIA.map((c) => {
              const score = report.criteria_scores[c.key] || 0;
              const issues = report.issues[c.key] || [];
              return (
                <Card key={c.key} className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <c.icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", getScoreTextColor(score))} />
                        <div>
                          <CardTitle className="text-lg">{c.label}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {issues.length} {pluralizeRu(issues.length, "замечание", "замечания", "замечаний")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("px-3 py-1 rounded-full text-sm font-semibold bg-muted tabular-nums", getScoreTextColor(score))}>
                          {score.toFixed(1)}/10
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpanded(expanded === c.key ? null : c.key)}
                          aria-expanded={expanded === c.key}
                        >
                          {expanded === c.key ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {expanded === c.key && issues.length > 0 && (
                    <CardContent className="pt-0">
                      <ul className="space-y-2">
                        {issues.map((issue: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm p-3 bg-muted/50 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-destructive/80 mt-0.5 flex-shrink-0" />
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {/* Checklist */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Приоритизированный чек-лист правок
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="space-y-2">
                  {report.checklist?.map((item: any, i: number) => (
                    <li key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <span
                        className={cn(
                          "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          item.priority === 1 && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                          item.priority === 2 && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
                          item.priority === 3 && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        )}
                      >
                        {item.priority}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{item.text}</p>
                        <p className="text-xs text-muted-foreground">
                          Критерий: {CRITERIA.find((c) => c.key === item.criterion)?.label || item.criterion}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 pt-4 border-t text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    1 — критично
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    2 — важно
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    3 — желательно
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              variant="outline"
              className="gap-2"
              disabled={!report.pdf_url}
              onClick={() => window.open(report.pdf_url, "_blank")}
            >
              <Download className="h-4 w-4" />
              {report.pdf_url ? "Скачать PDF" : "PDF готовится..."}
            </Button>
            <Button variant="outline" className="gap-2" disabled>
              <Share2 className="h-4 w-4" />
              Поделиться (скоро)
            </Button>
            <Button
              onClick={() => router.push("/")}
              className="gap-2 border-0 text-white hover:opacity-90"
              style={gradientButtonStyle}
            >
              <Plus className="h-4 w-4" />
              Начать бесплатный разбор
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}