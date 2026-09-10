import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import AuthProvider from "@/components/goaledge/auth-provider";
import { ServiceWorkerRegister } from "@/components/goaledge/service-worker-register";

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// Self-hosted Geist fonts (no runtime dependency on Google Fonts)
const geistSans = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  display: "swap",
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
    icon: "/favicon.svg",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "GoalEdge",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
  metadataBase: new URL("https://goaledge.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "GoalEdge — Smarter Football Predictions",
    description: "Predict smarter. Win more often. Expert tips across 10+ leagues.",
    siteName: "GoalEdge",
    type: "website",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "GoalEdge" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GoalEdge — Smarter Football Predictions",
    description: "Predict smarter. Win more often.",
    images: ["/icons/icon-512.png"],
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
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}