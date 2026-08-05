import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import AuthProvider from "@/components/goaledge/auth-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GoalEdge — Smarter Football Predictions",
  description:
    "Expert football predictions, real odds and in-depth analysis. Start free, upgrade to premium. 10+ leagues, data-driven tips, real-time value alerts.",
  keywords: [
    "football predictions",
    "soccer tips",
    "betting tips",
    "Premier League",
    "NPFL",
    "GoalEdge",
    "football analysis",
    "value bets",
  ],
  authors: [{ name: "GoalEdge" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "GoalEdge — Smarter Football Predictions",
    description: "Predict smarter. Win more often. Expert tips across 10+ leagues.",
    siteName: "GoalEdge",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GoalEdge — Smarter Football Predictions",
    description: "Predict smarter. Win more often.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}