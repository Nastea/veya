"use client";

import { BarChart3, Files, Home, Layers, Lightbulb, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getDefaultContentId } from "@/data/content-items";

type NavItem = {
  href: string;
  icon: typeof Home;
};

function pathMatches(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/content")) return pathname.startsWith("/content");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();
  const defaultContentId = getDefaultContentId();
  const navItems: NavItem[] = [
    { href: "/", icon: Home },
    { href: "/ideas", icon: Lightbulb },
    { href: "/calendar", icon: Layers },
    { href: "/feed-preview", icon: Sparkles },
    { href: "/reporting", icon: BarChart3 }
  ];
  if (defaultContentId) {
    navItems.push({ href: `/content/${defaultContentId}`, icon: Files });
  }

  return (
    <aside className="hidden w-[4.25rem] shrink-0 flex-col border-r border-zinc-200/60 bg-[#f6f6f8] lg:flex">
      <Link
        href="/"
        className="mx-auto mt-5 flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-xs font-semibold tracking-tight text-zinc-800 transition-colors hover:border-zinc-300"
      >
        V
      </Link>
      <nav className="mt-8 flex flex-1 flex-col items-center gap-1.5 px-2">
        {navItems.map((item) => {
          const isActive = pathMatches(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-white text-zinc-800 ring-1 ring-zinc-200/80"
                  : "text-zinc-400 hover:bg-white/60 hover:text-zinc-700"
              ].join(" ")}
            >
              <Icon className="h-[15px] w-[15px] stroke-[1.5]" />
            </Link>
          );
        })}
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/60 hover:text-zinc-700"
          aria-label="Settings (coming soon)"
        >
          <Settings className="h-[15px] w-[15px] stroke-[1.5]" />
        </button>
      </nav>
    </aside>
  );
}
