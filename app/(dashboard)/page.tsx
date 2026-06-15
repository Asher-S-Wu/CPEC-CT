import { redirect } from "next/navigation";

// 总览看板已移除：根路径重定向到文本工具。鉴权由本路由组的 layout.tsx 统一处理。
export default function DashboardRootPage() {
  redirect("/ai");
}
