import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { getAuthUser } from "@/lib/supabase/auth";
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
      const cookieStore = await cookies();
      const { user: authUser } = await getAuthUser(supabase, cookieStore.getAll());
      user = authUser;
    } catch {
      user = null;
    }
  }

  return (
    <html lang="cs" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${jetBrainsMono.variable} min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="relative min-h-screen">
            <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/60 glass dark:border-zinc-800/80">
              <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
                <Link href="/" className="text-lg font-bold tracking-tight text-gradient">
                  MadTV
                </Link>
                <nav className="flex items-center gap-2 sm:gap-3">
                  <Link
                    href="/explore"
                    className="hidden text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-100 sm:inline"
                  >
                    Ukázky
                  </Link>
                  <Link
                    href="/for-creators"
                    className="hidden text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-100 sm:inline"
                  >
                    Pro tvůrce
                  </Link>
                  {user ? <AccountMenu email={user.email ?? null} /> : null}
                  {!user ? (
                    <Link
                      href="/login"
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-100"
                    >
                      Přihlásit se
                    </Link>
                  ) : null}
                  <Link
                    href="/dashboard"
                    className="hidden rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 sm:inline-flex"
                  >
                    Dashboard
                  </Link>
                  <ThemeToggle />
                </nav>
              </div>
            </header>
            <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-24 sm:px-6">{children}</div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
