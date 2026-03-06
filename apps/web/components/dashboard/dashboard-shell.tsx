"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CreditCard,
  FileText,
  LayoutDashboard,
  PlusCircle,
  Settings,
  Shield,
  User,
  Users,
  Compass,
  Menu,
  X,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail: string | null;
  hasCreatorAccess: boolean;
  hasViewerAccess: boolean;
  isPlatformAdmin: boolean;
  defaultCreatorSlug: string | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

function SidebarLink({
  item,
  collapsed,
  pathname,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
}) {
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-zinc-200/70 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-100"
          : "text-zinc-600 hover:bg-zinc-200/40 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100",
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed ? <span>{item.label}</span> : null}
    </Link>
  );
}

export function DashboardShell({
  children,
  userEmail,
  hasCreatorAccess,
  hasViewerAccess,
  isPlatformAdmin,
  defaultCreatorSlug,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const creatorNav: NavItem[] = [
    { href: "/dashboard", label: "Přehled", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/creator", label: "Profil tvůrce", icon: User },
    { href: "/dashboard/tiers", label: "Tiery", icon: CreditCard },
    { href: "/dashboard/posts", label: "Příspěvky", icon: FileText },
    { href: "/dashboard/posts/new", label: "Nový příspěvek", icon: PlusCircle, exact: true },
  ];

  const viewerNav: NavItem[] = [
    { href: "/dashboard/viewer", label: "Divák přehled", icon: Users, exact: true },
    { href: "/dashboard/viewer/subscriptions", label: "Moje členství", icon: CreditCard },
    { href: "/dashboard/viewer/profile", label: "Můj profil", icon: User },
    { href: "/dashboard/viewer/billing", label: "Platby", icon: Settings },
    { href: "/dashboard/viewer/explore", label: "Najít tvůrce", icon: Compass },
  ];

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-8.5rem)] w-full max-w-[1400px] gap-4">
        <aside
          className={cn(
            "glass hidden shrink-0 rounded-2xl p-3 md:block",
            collapsed ? "w-[76px]" : "w-72",
          )}
        >
          <div className="mb-3 flex items-center justify-between px-1">
            {!collapsed ? <span className="text-base font-bold text-gradient">CreatorHub</span> : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-4">
            {hasCreatorAccess ? (
              <div className="space-y-1">
                {!collapsed ? <p className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Tvůrce</p> : null}
                {creatorNav.map((item) => (
                  <SidebarLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
                ))}
              </div>
            ) : null}

            {hasViewerAccess ? (
              <div className="space-y-1">
                {!collapsed ? <p className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Divák</p> : null}
                {viewerNav.map((item) => (
                  <SidebarLink key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
                ))}
              </div>
            ) : null}

            {isPlatformAdmin ? (
              <div className="space-y-1">
                {!collapsed ? <p className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Správa</p> : null}
                <SidebarLink item={{ href: "/admin", label: "Admin", icon: Shield }} collapsed={collapsed} pathname={pathname} />
              </div>
            ) : null}
          </div>
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
              aria-label="Zavřít menu"
            />
            <div className="glass absolute left-3 top-3 bottom-3 w-[82%] max-w-xs rounded-2xl p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-base font-bold text-gradient">CreatorHub</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {hasCreatorAccess ? (
                  <div className="space-y-1">
                    <p className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Tvůrce</p>
                    {creatorNav.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                          pathname === item.href || (!item.exact && pathname.startsWith(item.href))
                            ? "bg-zinc-200/70 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-100"
                            : "text-zinc-600 hover:bg-zinc-200/40 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100",
                        )}
                        onClick={() => setMobileOpen(false)}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}

                {hasViewerAccess ? (
                  <div className="space-y-1">
                    <p className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Divák</p>
                    {viewerNav.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                          pathname === item.href || (!item.exact && pathname.startsWith(item.href))
                            ? "bg-zinc-200/70 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-100"
                            : "text-zinc-600 hover:bg-zinc-200/40 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100",
                        )}
                        onClick={() => setMobileOpen(false)}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}

                {isPlatformAdmin ? (
                  <div className="space-y-1">
                    <p className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Správa</p>
                    <Link
                      href="/admin"
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                        pathname.startsWith("/admin")
                          ? "bg-zinc-200/70 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-100"
                          : "text-zinc-600 hover:bg-zinc-200/40 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100",
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Shield className="h-4 w-4 shrink-0" />
                      <span>Admin</span>
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass mb-4 flex h-14 items-center justify-between rounded-2xl px-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg md:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              {defaultCreatorSlug ? (
                <Link href={`/c/${defaultCreatorSlug}`} className="text-sm text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-100">
                  Zobrazit profil
                </Link>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden max-w-56 truncate text-xs text-zinc-500 lg:block">{userEmail ?? ""}</span>
              <ThemeToggle />
              <form action="/logout" method="post">
                <Button variant="outline" size="sm" type="submit">
                  Odhlásit
                </Button>
              </form>
            </div>
          </header>

          <main className="flex-1 pb-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
