"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState, useEffect, useRef } from "react";
import { BrandMark } from "@/components/brand/brand-logo";
import { useAppTheme, type ThemeMode } from "@/components/layout/app-theme-provider";
import { NavLinks, type NavigationItem } from "@/components/navigation/nav-links";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  AudioLines,
  Captions,
  Settings,
  Sparkles,
  Clapperboard,
  X,
  ChevronUp,
  ChevronLeft,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

type SidebarNavItem = NavigationItem;

interface SidebarNavSection {
  section: string;
  icon: ReactNode;
  items: SidebarNavItem[];
}

const navItems: SidebarNavSection[] = [
  {
    section: "核心能力",
    icon: <LayoutDashboard className="h-3.5 w-3.5" />,
    items: [
      { href: "/ai", label: "文本工具", icon: <Sparkles className="w-5 h-5" /> },
      { href: "/media", label: "媒体工具", icon: <Clapperboard className="w-5 h-5" /> },
      { href: "/speech", label: "语音合成", icon: <AudioLines className="w-5 h-5" /> },
      { href: "/transcribe", label: "录音识别", icon: <Captions className="w-5 h-5" /> },
    ],
  },
  {
    section: "设置",
    icon: <Settings className="h-3.5 w-3.5" />,
    items: [
      { href: "/settings", label: "账号信息", icon: <Settings className="w-5 h-5" /> },
    ],
  },
];

const themeOptions: Array<{ key: ThemeMode; label: string; icon: LucideIcon }> = [
  { key: "light", label: "浅色", icon: Sun },
  { key: "dark", label: "深色", icon: Moon },
  { key: "system", label: "系统", icon: Monitor },
];

/* ── 导航内容（桌面和移动共享） ── */
function SidebarContent({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  const { themeMode, setThemeMode } = useAppTheme();
  const visibleSections: SidebarNavSection[] = navItems.filter((section) => section.items.length > 0);

  return (
    <div className="app-sidebar-surface">
      <div className={cn("app-sidebar-brand", collapsed && "justify-center px-2")}>
        <BrandMark className="app-sidebar-mark" />
        {!collapsed && (
          <div className="min-w-0">
            <div className="app-sidebar-title truncate">智创 AI</div>
          </div>
        )}
      </div>
      <nav className="custom-scrollbar flex-1 overflow-y-auto px-3 py-6">
        <div className="flex flex-col gap-6">
          {visibleSections.map((section) => (
            <div key={section.section} className="app-sidebar-section">
              {!collapsed && (
                <div className="app-sidebar-section-title">
                  <span className="app-sidebar-section-icon">{section.icon}</span>
                  <span>{section.section}</span>
                </div>
              )}
              <div className="app-sidebar-menu-card">
                <NavLinks items={section.items} pathname={pathname} layout="sidebar" onNavigate={onNavigate} tone="sidebar" collapsed={collapsed} />
              </div>
            </div>
          ))}
        </div>
      </nav>
      <div className="app-sidebar-theme-panel">
        {collapsed ? (
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--oa-sidebar-item)] transition-colors hover:bg-[var(--oa-sidebar-hover-bg)] hover:text-[var(--oa-sidebar-text)]"
            title="切换主题"
            onClick={() => {
              const modes: ThemeMode[] = ["light", "dark", "system"];
              const currentIndex = modes.indexOf(themeMode);
              const nextMode = modes[(currentIndex + 1) % modes.length];
              setThemeMode(nextMode);
            }}
          >
            {themeMode === "light" && <Sun className="h-4 w-4" />}
            {themeMode === "dark" && <Moon className="h-4 w-4" />}
            {themeMode === "system" && <Monitor className="h-4 w-4" />}
          </button>
        ) : (
          <div className="app-theme-switcher" data-active-mode={themeMode} aria-label="主题切换">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const active = themeMode === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  className={cn("app-theme-option", active && "active")}
                  aria-pressed={active}
                  title={`切换为${option.label}主题`}
                  onClick={() => setThemeMode(option.key)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 桌面固定侧边栏 ── */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "app-sidebar hidden md:sticky md:inset-y-0 md:z-50 md:flex md:h-screen md:flex-col",
        collapsed && "is-collapsed"
      )}
    >
      <SidebarContent collapsed={collapsed} />
      <button
        className="app-sidebar-collapse-handle"
        aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
        onClick={() => setCollapsed(!collapsed)}
      >
        <ChevronLeft
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            collapsed && "rotate-180"
          )}
        />
      </button>
    </aside>
  );
}

/* ── 移动端抽屉菜单 ── */
export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onCloseRef.current();
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  return (
    <>
      {/* 遮罩 */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity duration-200 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "app-sidebar fixed inset-y-0 left-0 z-50 flex w-64 max-w-[calc(100vw-1rem)] flex-col transition-transform duration-200 ease-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-md text-[var(--oa-sidebar-muted)] transition-colors hover:bg-[var(--oa-sidebar-hover-bg)] hover:text-[var(--oa-sidebar-text)]"
          aria-label="关闭菜单"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </>
  );
}
