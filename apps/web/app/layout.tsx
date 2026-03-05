import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";

import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "MadTV",
  description: "Creator membership platform MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${jetBrainsMono.variable} min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="relative min-h-screen">
            <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/80">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                <Link href="/" className="text-base font-bold tracking-tight sm:text-lg">
                  MadTV
                </Link>
                <nav className="flex items-center gap-2 sm:gap-3">
                  <Link href="/dashboard" className="rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    Dashboard
                  </Link>
                  <Link href="/login" className="rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    Login
                  </Link>
                  <ThemeToggle />
                </nav>
              </div>
            </header>
            <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6">{children}</div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
