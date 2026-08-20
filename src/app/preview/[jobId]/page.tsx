"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle, X, ChevronDown, ChevronUp, Eye, FileText, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatRelativeTime, getScoreColor, getScoreTextColor, getScoreBg, cn } from "@/lib/utils";

const CRITERIA = [
  { key: "hierarchy", label: "Визуальная иерархия", icon: Eye },
  { key: "typography", label: "Типографика", icon: FileText },
  { key: "cta_scenario", label: "Сценарий и CTA", icon: CheckCircle },
  { key: "responsive", label: "Адаптивность", icon: Download },
  { key: "conversion_blocks", label: "Конверсионные блоки", icon: Share2 },
] as const;

export default function PreviewPage({ params }: { params: { jobId: string } }) {
  const router = useRouter();
  const jobId = params.jobId;

  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Анализирую лендинг...</h2>
          <p className="text-muted-foreground">Это займёт 30–90 секунд</p>
        </div>
      </div>
    );
  }

  if (!data?.version) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Разбор не найден</h2>
          <p className="text-muted-foreground mb-4">Возможно, анализ ещё не завершился или произошла ошибка</p>
          <Button onClick={() => router.push("/")}>На главную</Button>
        </div>
      </div>
    );
  }

  const { version, report, project } = data;
  const isReady = version.status === "ready" && report;

  return (
    <div className="min-h-screen bg-background">
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
            <Badge variant={isReady ? "success" : "warning"}>
              {version.status === "processing" && "Обработка..."}
              {version.status === "ready" && "Готово"}
              {version.status === "failed" && "Ошибка"}
            </Badge>
          </div>
        </div>
      </header>

      {version.status === "failed" && (
        <div className="container mx-auto px-4 py-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Ошибка анализа</h2>
          <p className="text-muted-foreground mb-6">{version.error_message || "Неизвестная ошибка"}</p>
          <Button onClick={() => router.push("/")}>Попробовать снова</Button>
        </div>
      )}

      {isReady && (
        <div className="container mx-auto px-4 py-8">
          {/* Overall Score */}
          <Card className="mb-8">
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
                      <div key={c.key} className={cn(getScoreBg(score), "rounded-lg p-3")}>
                        <c.icon className={cn("h-4 w-4 mx-auto mb-1", getScoreTextColor(score))} />
                        <p className={cn("text-2xl font-bold", getScoreTextColor(score))}>
                          {score}
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
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Скриншоты
                  <span className="text-sm font-normal text-muted-foreground">
                    {version.screenshot_urls.length} ракурсов
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
                        {["Десктоп", "Планшет", "Мобильный"][i] || `Вид ${i + 1}`}
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
                <Card key={c.key}>
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <c.icon className={cn("h-5 w-5", getScoreTextColor(score))} />
                        <div>
                          <CardTitle className="text-lg">{c.label}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {issues.length} замечание{issues.length === 1 ? "" : issues.length < 5 ? "я" : "ий"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("px-3 py-1 rounded-full text-sm font-semibold", getScoreBg(score), getScoreTextColor(score))}>
                          {score}/10
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
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
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Экспорт в PDF (скоро)
            </Button>
            <Button variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              Поделиться (скоро)
            </Button>
            <Button onClick={() => router.push("/")} className="gap-2">
              <X className="h-4 w-4" />
              Новый разбор
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}