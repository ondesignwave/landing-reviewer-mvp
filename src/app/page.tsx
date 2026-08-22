"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Zap, CheckCircle, AlertCircle, X as XIcon } from "lucide-react";
import {
  IconHierarchy2,
  IconTypography,
  IconClick,
  IconResize,
  IconTargetArrow,
  IconUpload,
  IconSparkles,
  IconFileCheck,
  IconLink,
  IconBrandFigma,
  IconPhoto,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dropzone } from "@/components/ui/dropzone";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const gradientButtonStyle: React.CSSProperties = {
  background: "linear-gradient(70deg, #bdd3ff 0%, #0b9eec 45%, #da7ad6 100%)",
};

export default function LandingPage() {
  const [activeTab, setActiveTab] = React.useState<"url" | "figma" | "files">("url");
  const [url, setUrl] = React.useState("");
  const [figmaUrl, setFigmaUrl] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<string | null>(null);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [jobData, setJobData] = React.useState<any>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const [error, setError] = React.useState<string | null>(null);
  const suppressSubmitUntilRef = React.useRef(0);

  React.useEffect(() => {
    // Opening the native file picker / camera sheet blurs the window;
    // closing it fires focus again. On some mobile browsers, the tap that
    // dismisses that sheet can also register as a click on whatever page
    // element sits underneath it — which was firing the submit button on
    // its own. Ignore submits for a moment right after regaining focus.
    const onWindowFocus = () => {
      suppressSubmitUntilRef.current = Date.now() + 700;
    };
    window.addEventListener("focus", onWindowFocus);
    return () => window.removeEventListener("focus", onWindowFocus);
  }, []);

  React.useEffect(() => {
    if (!jobId) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        const json = await res.json();
        if (cancelled) return;
        setJobData(json);
        if (json.status === "processing") setTimeout(poll, 2000);
      } catch {
        // keep showing "processing" — the preview page has its own error handling
      }
    };
    poll();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  React.useEffect(() => {
    if (jobData?.status !== "processing") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [jobData?.status]);

  const closeModal = () => {
    setJobId(null);
    setJobData(null);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });

    // A body over Vercel's ~4.5MB function limit never reaches our handler —
    // the platform returns its own plain-text error page, not JSON.
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      throw new Error(
        res.status === 413
          ? `"${file.name}" слишком большой файл`
          : `Не удалось загрузить "${file.name}"`
      );
    }
    if (!res.ok) throw new Error(data.error || `Не удалось загрузить "${file.name}"`);
    return data.url as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() < suppressSubmitUntilRef.current) return;
    setError(null);
    setJobData(null);
    setIsLoading(true);
    setUploadStatus(null);

    try {
      let body: any = { source_type: activeTab };
      if (activeTab === "url") body.url = url;
      else if (activeTab === "figma") {
        body.figma_url = figmaUrl;
      } else {
        const { pdfToImageFiles } = await import("@/lib/pdf-to-images");
        const { compressImageFile } = await import("@/lib/image-compress");
        const screenshotUrls: string[] = [];
        let uploaded = 0;
        const filesToUpload: File[] = [];
        for (const file of files) {
          if (file.type === "application/pdf") {
            setUploadStatus(`Рендерю страницы "${file.name}"...`);
            filesToUpload.push(...(await pdfToImageFiles(file)));
          } else {
            filesToUpload.push(file);
          }
        }
        for (const file of filesToUpload) {
          uploaded++;
          setUploadStatus(`Загружаю файл ${uploaded} из ${filesToUpload.length}...`);
          const compressed = await compressImageFile(file);
          screenshotUrls.push(await uploadFile(compressed));
        }
        body.screenshot_urls = screenshotUrls;
      }

      setUploadStatus(null);
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
      setUploadStatus(null);
    }
  };

  const canSubmit =
    (activeTab === "url" && url.trim()) ||
    (activeTab === "figma" && figmaUrl.trim()) ||
    (activeTab === "files" && files.length > 0);

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const jobElapsedLabel = (() => {
    if (!jobData?.version?.created_at) return null;
    const seconds = Math.floor(
      Math.max(0, now - new Date(jobData.version.created_at).getTime()) / 1000
    );
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  })();

  return (
    <div className="hero-gradient min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-6 inline-flex items-center gap-2 border-white/20 bg-white/10 text-white hover:bg-white/10">
              <Zap className="h-3 w-3" />
              MVP — Бесплатно на время бета-теста
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-balance mb-6 text-white">
              AI-ревью лендинга за{" "}
              <span className="text-primary">5 минут</span>
            </h1>
            <p className="text-lg lg:text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              Загрузите ссылку на Figma, скриншоты или URL — получите экспертный разбор как от
              Senior Art Director. Визуальная иерархия, типографика, CTA, адаптив, конверсионные
              блоки.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="w-full sm:w-auto gap-2 border-0 text-white hover:opacity-90"
                style={gradientButtonStyle}
                disabled={isLoading}
                onClick={() => scrollToId("analyze-form")}
              >
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
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => scrollToId("how-it-works")}
              >
                Как это работает
              </Button>
            </div>
            <Link
              href="/example"
              className="inline-block mt-4 text-sm text-white/60 hover:text-white hover:underline"
            >
              Посмотреть пример отчёта →
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-white">Как это работает</h2>
            <p className="text-white/70 max-w-2xl mx-auto">Три шага от ссылки до готового чек-листа правок</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <IconUpload className="h-5 w-5" />,
                title: "1. Загрузите материал",
                desc: "Ссылка на опубликованный лендинг, публичный Figma-файл или скриншоты/PDF",
              },
              {
                icon: <IconSparkles className="h-5 w-5" />,
                title: "2. AI анализирует",
                desc: "За 3–5 минут разбираем иерархию, типографику, CTA, адаптив и конверсионные блоки",
              },
              {
                icon: <IconFileCheck className="h-5 w-5" />,
                title: "3. Получаете отчёт",
                desc: "Оценки по 5 критериям и приоритизированный чек-лист правок, готовый к работе",
              },
            ].map((item) => (
              <Card key={item.title} className="h-full bg-white/5 border-white/10 backdrop-blur-sm text-white hover:border-white/20">
                <CardHeader>
                  <div className="flex items-center gap-2 text-primary mb-2">{item.icon}</div>
                  <CardTitle className="text-lg text-white">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-white/60">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Upload Form */}
      <section id="analyze-form" className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b" role="tablist">
                {[
                  { id: "url", label: "URL сайта", icon: <IconLink className="h-4 w-4" /> },
                  { id: "figma", label: "Figma ссылка", icon: <IconBrandFigma className="h-4 w-4" /> },
                  { id: "files", label: "Скриншоты/PDF", icon: <IconPhoto className="h-4 w-4" /> },
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
                    <label className="block text-sm font-medium">Ссылка на опубликованный лендинг</label>
                    <Input
                      type="url"
                      placeholder="https://example.com/landing"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Мы сделаем скриншоты в 3 разрешениях (десктоп, планшет, мобильный) и проанализируем
                    </p>
                  </div>
                )}

                {activeTab === "figma" && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium">Публичная ссылка на Figma-файл</label>
                    <Input
                      type="url"
                      placeholder="figma.com/file/... или figma.com/design/..."
                      value={figmaUrl}
                      onChange={(e) => setFigmaUrl(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Файл должен быть открыт по ссылке для всех («Anyone with the link»). Приватные
                      файлы пока не поддерживаем — не просим токен доступа к вашему аккаунту Figma. Мы
                      парсим структуру, стили, компоненты и автолейауты.
                    </p>
                  </div>
                )}

                {activeTab === "files" && (
                  <div className="space-y-4">
                    <Dropzone
                      onFilesChange={setFiles}
                      disabled={isLoading}
                      maxFiles={10}
                      maxSizeMB={45}
                    />
                    <p className="text-sm text-muted-foreground text-center">
                      Загрузите скриншоты экранов (PNG/JPG) или PDF. Рекомендуем: десктоп, планшет,
                      мобильная версия каждого ключевого экрана.
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full border-0 text-white hover:opacity-90"
                  style={gradientButtonStyle}
                  disabled={isLoading || !canSubmit}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {uploadStatus || "Запускаю анализ..."}
                    </>
                  ) : (
                    "Начать бесплатный разбор →"
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
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-white">Что вы получаете</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Структурированный отчёт по 5 критериям с оценками, проблемами и приоритизированным чек-листом правок
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <IconHierarchy2 className="h-5 w-5" />,
                title: "Визуальная иерархия",
                desc: "Приоритеты внимания, фокус, дыхание, вес элементов, сканируемость",
              },
              {
                icon: <IconTypography className="h-5 w-5" />,
                title: "Типографика",
                desc: "Шрифты, размеры, интерлиньяж, контраст, читаемость, ритм, WCAG AA",
              },
              {
                icon: <IconClick className="h-5 w-5" />,
                title: "Сценарий и CTA",
                desc: "Пользовательский путь, ясность действий, микрокопирайтинг, приоритет кнопок",
              },
              {
                icon: <IconResize className="h-5 w-5" />,
                title: "Адаптив и резиновая вёрстка",
                desc: "Breakpoints, переполнение, тач-таргеты, безопасные зоны, контент-шифт",
              },
              {
                icon: <IconTargetArrow className="h-5 w-5" />,
                title: "Конверсионные блоки",
                desc: "Hero, соцдоказательства, формы, гарантии, urgency, риск-реверсинг",
              },
            ].map((item) => (
              <Card key={item.title} className="h-full bg-white/5 border-white/10 backdrop-blur-sm text-white hover:border-white/20">
                <CardHeader>
                  <div className="flex items-center gap-2 text-primary mb-2">{item.icon}</div>
                  <CardTitle className="text-lg text-white">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-white/60">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 text-white border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Готовы проверить свой лендинг?</h2>
          <p className="text-white/70 mb-8 max-w-2xl mx-auto">
            Пока сервис в бета-тесте — все разборы бесплатны, без ограничений и скрытых условий
          </p>
          <Button
            size="lg"
            className="gap-2 border-0 text-white hover:opacity-90"
            style={gradientButtonStyle}
            onClick={() => scrollToId("analyze-form")}
          >
            <ArrowRight className="h-4 w-4" />
            Начать бесплатный разбор
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="container mx-auto px-4 text-center text-sm text-white/50 space-y-2">
          <p>Landing Reviewer — MVP для веб-дизайнеров</p>
          <p>
            ИП Соколова А. Д. ·{" "}
            <a href="mailto:landing-reviewer@mail.ru" className="hover:text-white hover:underline">
              landing-reviewer@mail.ru
            </a>
          </p>
          <p>
            <Link href="/privacy" className="hover:text-white hover:underline">
              Политика обработки персональных данных
            </Link>
          </p>
        </div>
      </footer>

      {jobId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative bg-card rounded-xl p-8 max-w-md w-full">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              aria-label="Закрыть"
            >
              <XIcon className="h-5 w-5" />
            </button>

            {jobData?.status === "ready" ? (
              <>
                <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Разбор готов!</h3>
                <p className="text-muted-foreground mb-1 tabular-nums">
                  Оценка {jobData.report?.overall_score?.toFixed?.(1) ?? "—"}/10
                </p>
                <p className="text-muted-foreground mb-6">Полный отчёт — на странице превью</p>
                <Button
                  onClick={() => window.open(`/preview/${jobId}`, "_blank")}
                  className="w-full border-0 text-white hover:opacity-90"
                  style={gradientButtonStyle}
                >
                  Смотреть результат
                </Button>
              </>
            ) : jobData?.status === "failed" ? (
              <>
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Не получилось разобрать</h3>
                <p className="text-muted-foreground mb-6">
                  {jobData.version?.error_message || "Неизвестная ошибка"}
                </p>
                <Button onClick={closeModal} className="w-full">
                  Попробовать снова
                </Button>
              </>
            ) : (
              <>
                <div className="relative mx-auto mb-4 h-16 w-16">
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Анализ запущен</h3>
                <p className="text-muted-foreground mb-1">Обычно занимает 3–5 минут</p>
                <p className="text-foreground font-medium mb-1 tabular-nums">
                  Прошло {jobElapsedLabel || "0:00"}
                </p>
                <p className="text-muted-foreground mb-6">
                  Статус обновится сам, когда будет готово
                  <br />
                  можно просто подождать на этой странице
                </p>
                <Button
                  onClick={() => window.open(`/preview/${jobId}`, "_blank")}
                  className="w-full border-0 text-white hover:opacity-90"
                  style={gradientButtonStyle}
                >
                  Открыть превью
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}