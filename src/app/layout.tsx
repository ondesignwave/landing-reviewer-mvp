import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Landing Reviewer — AI-ревью лендингов от Senior Art Director",
  description:
    "Загрузите ссылку на Figma, скриншоты или URL — получите экспертный разбор по 5 критериям за 60 секунд. Визуальная иерархия, типографика, CTA, адаптив, конверсионные блоки.",
  keywords: [
    "AI ревью лендинга",
    "арт-директор",
    "проверка дизайна",
    "конверсия лендинга",
    "фигма аудит",
  ],
  authors: [{ name: "Landing Reviewer" }],
  openGraph: {
    title: "Landing Reviewer — AI-ревью лендингов",
    description: "Экспертный разбор дизайна за 60 секунд",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}