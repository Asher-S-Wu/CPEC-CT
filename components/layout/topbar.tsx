"use client";

import type { Route } from "next";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/layout/logout-button";
import { formatRoleLabel } from "@/lib/labels";
import { Menu } from "lucide-react";

const BREADCRUMB_MAP: Record<string, string> = {
  "/speech": "语音合成",
  "/speech/text-to-speech": "文本转语音",
  "/speech/tts-history": "生成历史",
  "/speech/voice-clone": "声音克隆",
  "/speech/my-voices": "我的声音",
  "/transcribe": "录音识别",
  "/transcribe/subtitle-recognition": "录音识别",
  "/transcribe/subtitle-history": "识别历史",
  "/ai": "文本工具",
  "/media": "媒体工具",
  "/media/image": "图片生成",
  "/media/video": "视频生成",
  "/settings": "账号信息",
};

type Breadcrumb = {
  label: string;
  href: Route;
};

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Breadcrumb[] = [];

  let currentPath = "";
  for (const seg of segments) {
    currentPath += `/${seg}`;
    const label = BREADCRUMB_MAP[currentPath];
    if (label) {
      crumbs.push({ label, href: currentPath as Route });
    }
  }

  return crumbs.length > 0 ? crumbs : [{ label: "工作台", href: "/ai" as Route }];
}

interface TopbarProps {
  email: string;
  role: string;
  onMenuClick?: () => void;
}

export function Topbar({ email, role, onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const initials = email.slice(0, 2).toUpperCase();
  const breadcrumbs = buildBreadcrumbs(pathname);
  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || "工作台";

  return (
    <header className="app-topbar md:min-h-[56px] md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--oa-control-border)] bg-[var(--oa-control-bg)] text-[var(--oa-ink)] transition-colors hover:bg-[var(--oa-paper-soft)] md:hidden"
          aria-label="打开菜单"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="min-w-0">
          <h1 className="app-topbar-title truncate md:text-[18px]">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden items-center gap-2.5 rounded-lg border border-[var(--oa-card-border)] bg-[var(--oa-paper-soft)] p-1.5 pr-3 md:flex">
          <div className="app-topbar-tag flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-medium">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="app-topbar-name text-xs font-medium leading-tight">{email}</span>
            <span className="text-[10px] font-medium leading-tight text-[var(--oa-muted)]">
              {formatRoleLabel(role)}
            </span>
          </div>
        </div>

        <div className="app-topbar-tag flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-medium md:hidden">
          {initials}
        </div>

        <LogoutButton />
      </div>
    </header>
  );
}
