import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppThemeProvider } from "@/components/layout/app-theme-provider";
import { ConfirmProvider } from "@/components/ui/confirm-provider";
import "./globals.css";

const scrollbarScript = `
  (function(){
    var m=new WeakMap();
    document.addEventListener('scroll',function(e){
      var t=e.target;
      if(t===document||t===document.documentElement)t=document.documentElement;
      if(!t||!t.setAttribute)return;
      t.setAttribute('data-scrolling','');
      var p=m.get(t);
      if(p)clearTimeout(p);
      m.set(t,setTimeout(function(){
        t.removeAttribute('data-scrolling');
        m.delete(t);
      },800));
    },{capture:true,passive:true});
  })();
`;

const themeInitScript = `
  (() => {
    const savedThemeMode = localStorage.getItem('studio-theme-mode');
    const themeMode = ['light', 'dark', 'system'].includes(savedThemeMode) ? savedThemeMode : 'system';
    const resolvedTheme = themeMode === 'system'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : themeMode;
    document.documentElement.dataset.oaTheme = resolvedTheme;
    document.documentElement.dataset.oaThemeMode = themeMode;
    document.documentElement.style.colorScheme = resolvedTheme;
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    document.documentElement.classList.toggle('dark-mode', resolvedTheme === 'dark');
  })();
`;

export const metadata: Metadata = {
  title: "AI 业务工具",
  description: "AI 对话、语音合成与录音识别，AI 赋能数字融媒体创制"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: scrollbarScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <AppThemeProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
