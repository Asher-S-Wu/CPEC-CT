"use client";

import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface NavigationItem {
  href: string;
  label: string;
  icon: ReactNode;
  external?: boolean;
}

function isActivePath(pathname: string, href: string) {
  if (!href.startsWith("/")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavLinksProps {
  items: NavigationItem[];
  pathname: string;
  layout: "sidebar" | "tabbar";
  onNavigate?: () => void;
  tone?: "light" | "dark" | "sidebar";
  collapsed?: boolean;
}

export function NavLinks({ items, pathname, layout, onNavigate, tone = "light", collapsed }: NavLinksProps) {
  if (layout === "tabbar") {
    return (
      <>
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              onClick={onNavigate}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
                active
                  ? "border border-[#0a0a0a] bg-[#0a0a0a] text-white"
                  : "border border-[#e5e5e5] bg-white text-[#525252] hover:bg-[#f5f5f5] hover:text-[#0a0a0a]"
              )}
            >
              <span className="h-3.5 w-3.5 shrink-0">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <>
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        const itemClassName = cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          collapsed && "justify-center px-2",
          tone === "sidebar" && "app-sidebar-link",
          tone === "sidebar"
            ? active
              ? "bg-[#0a0a0a] text-white"
              : "text-[var(--oa-sidebar-item)] hover:bg-[var(--oa-sidebar-hover-bg)] hover:text-[var(--oa-sidebar-text)]"
            : tone === "dark"
            ? active
              ? "bg-white text-[#0a0a0a]"
              : "text-white/70 hover:bg-white/10 hover:text-white"
            : active
              ? "bg-[#0a0a0a] text-white"
              : "text-[var(--oa-muted)] hover:bg-[var(--oa-paper-soft)] hover:text-[var(--oa-ink)]"
        );

        if (item.external) {
          return (
            <a key={item.href} href={item.href} onClick={onNavigate} className={itemClassName} title={collapsed ? item.label : undefined}>
              <span className={cn("grid h-5 w-5 flex-shrink-0 place-items-center transition-opacity", active ? "opacity-100" : "opacity-70 group-hover:opacity-100")}>
                {item.icon}
              </span>
              {!collapsed && item.label}
            </a>
          );
        }

        return (
          <Link key={item.href} href={item.href as Route} onClick={onNavigate} className={itemClassName} title={collapsed ? item.label : undefined}>
            <span className={cn("grid h-5 w-5 flex-shrink-0 place-items-center transition-opacity", active ? "opacity-100" : "opacity-70 group-hover:opacity-100")}>
              {item.icon}
            </span>
            {!collapsed && item.label}
          </Link>
        );
      })}
    </>
  );
}
