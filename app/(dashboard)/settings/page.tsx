import { requirePageSession } from "@/lib/auth";
import { formatRoleLabel } from "@/lib/labels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRound } from "lucide-react";

export default async function SettingsPage() {
  const current = await requirePageSession();
  const initial = current.user.email.slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      {/* 用户 hero 区：首字母头像 + 邮箱 + 角色 */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--oa-ink)] text-lg font-semibold text-[var(--oa-paper)]">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[var(--oa-ink)]">{current.user.email}</p>
            <p className="mt-1 text-xs text-[var(--oa-muted)]">{formatRoleLabel(current.user.role)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--oa-card-border)] bg-[var(--oa-paper-soft)] text-[var(--oa-ink)]">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">账号信息</CardTitle>
              <CardDescription>你的登录身份与基本资料</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="info-grid">
            <div className="info-item">
              <p className="info-label">昵称</p>
              <p className="info-value">{current.user.displayName || "-"}</p>
            </div>
            <div className="info-item">
              <p className="info-label">登录邮箱</p>
              <p className="info-value">{current.user.email}</p>
            </div>
            <div className="info-item">
              <p className="info-label">角色</p>
              <p className="info-value">{formatRoleLabel(current.user.role)}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <p className="text-sm leading-6 text-muted-foreground">
              本工作台提供 AI 对话、语音合成、录音识别等核心能力。如需退出，请使用右上角的“退出登录”。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
