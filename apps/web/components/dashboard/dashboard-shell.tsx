"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  CreditCard,
  FileText,
  LayoutDashboard,
  PlusCircle,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
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

type DashboardSidebarProps = {
  pathname: string;
  hasCreatorAccess: boolean;
  hasViewerAccess: boolean;
  isPlatformAdmin: boolean;
};

function isItemActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function DashboardSidebar({ pathname, hasCreatorAccess, hasViewerAccess, isPlatformAdmin }: DashboardSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

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
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="px-2">
          {!collapsed ? <span className="text-base font-bold text-gradient">CreatorHub</span> : null}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {hasCreatorAccess ? (
          <SidebarGroup>
            <SidebarGroupLabel>Tvůrce</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {creatorNav.map((item) => {
                  const active = isItemActive(pathname, item);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label} className={cn(active && "font-medium")}>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {hasViewerAccess ? (
          <SidebarGroup>
            <SidebarGroupLabel>Divák</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {viewerNav.map((item) => {
                  const active = isItemActive(pathname, item);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label} className={cn(active && "font-medium")}>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {isPlatformAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>Správa</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/admin")} tooltip="Admin">
                    <Link href="/admin">
                      <Shield className="h-4 w-4 shrink-0" />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
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

  return (
    <SidebarProvider>
      <div className="relative left-1/2 flex min-h-[calc(100vh-8.5rem)] w-screen max-w-[1400px] -translate-x-1/2 gap-4 px-4 sm:px-6">
        <DashboardSidebar
          pathname={pathname}
          hasCreatorAccess={hasCreatorAccess}
          hasViewerAccess={hasViewerAccess}
          isPlatformAdmin={isPlatformAdmin}
        />

        <SidebarInset className="min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-sm">
          <header className="flex h-14 items-center justify-between border-b border-border/70 px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-8 w-8 rounded-md" />
              {defaultCreatorSlug ? (
                <Link
                  href={`/c/${defaultCreatorSlug}`}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Zobrazit profil
                </Link>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden max-w-56 truncate text-xs text-muted-foreground lg:block">{userEmail ?? ""}</span>
              <ThemeToggle />
              <form action="/logout" method="post">
                <Button variant="outline" size="sm" type="submit">
                  Odhlásit
                </Button>
              </form>
            </div>
          </header>

          <main className="min-h-0 flex-1 p-4 sm:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
