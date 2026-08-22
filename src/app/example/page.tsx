import Link from "next/link";
import { X, ChevronDown } from "lucide-react";
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
import { getScoreTextColor, cn } from "@/lib/utils";

export const metadata = {
  title: "Пример отчёта — Landing Reviewer",
};

const CRITERIA = [
  { key: "hierarchy", label: "Визуальная иерархия", icon: IconHierarchy2 },
  { key: "typography", label: "Типографика", icon: IconTypography },
  { key: "cta_scenario", label: "Сценарий и CTA", icon: IconClick },
  { key: "responsive", label: "Адаптивность", icon: IconResize },
  { key: "conversion_blocks", label: "Конверсионные блоки", icon: IconTargetArrow },
] as const;

// Вымышленный пример: лендинг фитнес-приложения "FitLoop", загружен
// дизайнером Марией К. — реального такого продукта не существует,
// это иллюстрация формата отчёта.
const EXAMPLE = {
  projectName: "fitloop-app.ru",
  overallScore: 6.0,
  criteriaScores: {
    hierarchy: 7,
    typography: 5,
    cta_scenario: 4,
    responsive: 8,
    conversion_blocks: 6,
  } as Record<string, number>,
  issues: {
    hierarchy: ["Заголовок и подзаголовок визуально одного веса — непонятно, что читать первым"],
    typography: [
      "Основной текст 14px — мелко для десктопа, читается с усилием",
      "Межстрочный интервал в абзацах 120% — тесно для длинных текстов",
    ],
    cta_scenario: [
      "Три разные формулировки кнопки на одном экране («Начать», «Попробовать», «Подробнее»)",
      "Основная кнопка теряется на фоне градиента — контраст ниже WCAG AA",
    ],
    responsive: [],
    conversion_blocks: ["Нет социального доказательства (отзывов, логотипов, цифр) в первом экране"],
  } as Record<string, string[]>,
  checklist: [
    { priority: 1, text: "Увеличить контраст и повторить одну формулировку кнопки по всей странице", criterion: "cta_scenario" },
    { priority: 2, text: "Поднять размер основного текста до 16px и увеличить межстрочный интервал", criterion: "typography" },
    { priority: 3, text: "Добавить блок с отзывами или цифрами сразу под первым экраном", criterion: "conversion_blocks" },
  ],
};

export default function ExamplePage() {
  const { projectName, overallScore, criteriaScores, issues, checklist } = EXAMPLE;

  return (
    <div className="hero-gradient min-h-screen">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <X className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold">Превью разбора</h1>
              <p className="text-xs text-muted-foreground">{projectName} · пример</p>
            </div>
          </div>
          <Badge variant="secondary">Вымышленный пример</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4">
        <div className="max-w-3xl mx-auto p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-center">
          Это пример отчёта на вымышленном лендинге — так выглядит результат настоящего разбора
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <Card className="mb-8 bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground mb-1">Общий балл</p>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-5xl font-bold tabular-nums", getScoreTextColor(overallScore))}>
                    {overallScore.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">/ 10</span>
                </div>
              </div>
              <Separator orientation="vertical" className="h-16 md:h-20 mx-4 md:mx-0" />
              <div className="grid grid-cols-5 gap-4 text-center">
                {CRITERIA.map((c) => {
                  const score = criteriaScores[c.key];
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

        <div className="space-y-4 mb-8">
          {CRITERIA.map((c) => {
            const score = criteriaScores[c.key];
            const list = issues[c.key];
            return (
              <Card key={c.key} className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <c.icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", getScoreTextColor(score))} />
                      <div>
                        <CardTitle className="text-lg">{c.label}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {list.length === 0 ? "Замечаний нет" : `${list.length} замечани${list.length === 1 ? "е" : "я"}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("px-3 py-1 rounded-full text-sm font-semibold bg-muted tabular-nums", getScoreTextColor(score))}>
                        {score.toFixed(1)}/10
                      </span>
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                {list.length > 0 && (
                  <CardContent className="pt-0">
                    <ul className="space-y-2">
                      {list.map((issue, i) => (
                        <li key={i} className="text-sm p-3 bg-muted/50 rounded-lg">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                )}
              </Card>
            );
          })}

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Приоритизированный чек-лист правок</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ol className="space-y-2">
                {checklist.map((item, i) => (
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
                        Критерий: {CRITERIA.find((c) => c.key === item.criterion)?.label}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center pb-12">
          <Link href="/#analyze-form">
            <Button size="lg" className="gap-2">
              Начать бесплатный разбор
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
