import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  description: "Podpoř své oblíbené tvůrce a odemkni obsah navíc.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user: { email?: string | null } | null = null;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      user = null;
    }
  }

  return (
    <html lang="cs" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${jetBrainsMono.variable} min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="relative min-h-screen">
            <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/80">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                <Link href="/" className="text-base font-bold tracking-tight sm:text-lg">
                  MadTV
                </Link>
                <nav className="flex items-center gap-1 sm:gap-2">
                  <Link href="/explore" className="rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    Explore
                  </Link>
                  <Link href="/#jak-to-funguje" className="rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    Jak to funguje
                  </Link>
                  <Link href="/for-creators" className="rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    Pro tvůrce
                  </Link>
                  {user ? (
                    <AccountMenu email={user.email ?? null} />
                  ) : (
                    <Link href="/login" className="rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      Přihlásit se
                    </Link>
                  )}
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
