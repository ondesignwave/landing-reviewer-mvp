"use client";

import * as React from "react";
import { ArrowRight, CheckCircle, FileText, Shield, Zap, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dropzone } from "@/components/ui/dropzone";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  const [activeTab, setActiveTab] = React.useState<"url" | "figma" | "files">("url");
  const [url, setUrl] = React.useState("");
  const [figmaUrl, setFigmaUrl] = React.useState("");
  const [figmaToken, setFigmaToken] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let body: any = { source_type: activeTab };
      if (activeTab === "url") body.url = url;
      else if (activeTab === "figma") {
        body.figma_url = figmaUrl;
        if (figmaToken) body.figma_token = figmaToken;
      } else body.files = files.map((f) => f.name); // placeholder

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка анализа");
      setJobId(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Что-то пошло не так");
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit =
    (activeTab === "url" && url.trim()) ||
    (activeTab === "figma" && figmaUrl.trim()) ||
    (activeTab === "files" && files.length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 inline-flex items-center gap-2">
              <Zap className="h-3 w-3" />
              MVP — Бесплатно на время бета-теста
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-balance mb-6">
              AI-ревью лендинга за{" "}
              <span className="text-primary">60 секунд</span>
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Загрузите ссылку на Figma, скриншоты или URL — получите экспертный разбор как от
              Senior Art Director. Визуальная иерархия, типографика, CTA, адаптив, конверсионные
              блоки.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="w-full sm:w-auto gap-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Анализирую...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    Начать бесплатный разбор
                  </>
                )}
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Как это работает
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Form */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b" role="tablist">
                {[
                  { id: "url", label: "URL сайта", icon: <Eye className="h-4 w-4" /> },
                  { id: "figma", label: "Figma ссылка", icon: <FileText className="h-4 w-4" /> },
                  { id: "files", label: "Скриншоты/PDF", icon: <Shield className="h-4 w-4" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-6">
                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                    {error}
                  </div>
                )}

                {activeTab === "url" && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium">Ссылка на опубликованный лендинг</label>
                    <Input
                      type="url"
                      placeholder="https://example.com/landing"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Мы сделаем скриншоты в 3 разрешениях (десктоп, планшет, мобильный) и проанализируем
                    </p>
                  </div>
                )}

                {activeTab === "figma" && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium">Публичная ссылка на Figma-файл</label>
                    <Input
                      type="url"
                      placeholder="https://www.figma.com/file/FILE_KEY/... или https://www.figma.com/design/FILE_KEY/..."
                      value={figmaUrl}
                      onChange={(e) => setFigmaUrl(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                    <label className="block text-sm font-medium">Figma Personal Access Token (опционально)</label>
                    <Input
                      type="password"
                      placeholder="figd_... (нужен для приватных файлов)"
                      value={figmaToken}
                      onChange={(e) => setFigmaToken(e.target.value)}
                      disabled={isLoading}
                    />
                    <p className="text-sm text-muted-foreground">
                      Для публичных файлов токен не нужен. Мы парсим структуру, стили, компоненты и
                      автолейауты.
                    </p>
                  </div>
                )}

                {activeTab === "files" && (
                  <div className="space-y-4">
                    <Dropzone
                      onFilesChange={setFiles}
                      disabled={isLoading}
                      maxFiles={10}
                      maxSizeMB={10}
                    />
                    <p className="text-sm text-muted-foreground text-center">
                      Загрузите скриншоты экранов (PNG/JPG) или PDF. Рекомендуем: десктоп, планшет,
                      мобильная версия каждого ключевого экрана.
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading || !canSubmit}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Запускаю анализ...
                    </>
                  ) : (
                    "Запустить AI-разбор →"
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Что вы получаете</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Структурированный отчёт по 5 критериям с оценками, проблемами и приоритизированным чек-листом правок
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Eye className="h-5 w-5" />,
                title: "Визуальная иерархия",
                desc: "Приоритеты внимания, фокус, дыхание, вес элементов, сканируемость",
              },
              {
                icon: <FileText className="h-5 w-5" />,
                title: "Типографика",
                desc: "Шрифты, размеры, интерлиньяж, контраст, читаемость, ритм, WCAG AA",
              },
              {
                icon: <Zap className="h-5 w-5" />,
                title: "Сценарий и CTA",
                desc: "Пользовательский путь, ясность действий, микрокопирайтинг, приоритет кнопок",
              },
              {
                icon: <Shield className="h-5 w-5" />,
                title: "Адаптив и резиновая вёрстка",
                desc: "Breakpoints, переполнение, тач-таргеты, безопасные зоны, контент-шифт",
              },
              {
                icon: <CheckCircle className="h-5 w-5" />,
                title: "Конверсионные блоки",
                desc: "Hero, соцдоказательства, формы, гарантии, urgency, риск-реверсинг",
              },
            ].map((item) => (
              <Card key={item.title} className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-2 text-primary mb-2">{item.icon}</div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Готовы проверить свой лендинг?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Первый полный разбор бесплатно. Без регистрации для превью. Платите только если результат
            пригодился.
          </p>
          <Button size="lg" variant="secondary" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Начать бесплатно
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Landing Reviewer — MVP для веб-дизайнеров. Сделано с Next.js, Supabase, Inngest.</p>
        </div>
      </footer>

      {jobId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-8 max-w-md w-full text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Анализ запущен</h3>
            <p className="text-muted-foreground mb-6">
              Это займёт 30–90 секунд. Результат появится на странице превью.
            </p>
            <Button
              onClick={() => window.open(`/preview/${jobId}`, "_blank")}
              className="w-full"
            >
              Открыть превью
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}