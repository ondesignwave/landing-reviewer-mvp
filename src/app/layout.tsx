import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter_Tight({
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
  metadataBase: new URL("https://landing-reviewer-eight.vercel.app"),
  title: "Landing Reviewer — AI-ревью лендингов от Senior Art Director",
  description:
    "Загрузите ссылку на Figma, скриншоты или URL — получите экспертный разбор по 5 критериям за 5 минут. Визуальная иерархия, типографика, CTA, адаптив, конверсионные блоки.",
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
    description: "Экспертный разбор дизайна за 5 минут",
    type: "website",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Landing Reviewer — AI-ревью лендингов",
    description: "Экспертный разбор дизайна за 5 минут",
    images: ["/opengraph-image.png"],
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
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
        <Toaster theme="dark" richColors position="top-center" />
      </body>
    </html>
  );
}