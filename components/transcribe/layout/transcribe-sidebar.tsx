'use client';

import type { Route } from 'next';
import { SectionSidebar } from '@/components/navigation/section-sidebar';
import {
  Captions,
  FileText,
} from 'lucide-react';

const navigation: Array<{ name: string; href: Route; icon: typeof Captions }> = [
  { name: '录音识别', href: '/transcribe/subtitle-recognition', icon: Captions },
  { name: '识别历史', href: '/transcribe/subtitle-history', icon: FileText },
];

export function Sidebar() {
  return (
    <SectionSidebar
      title="录音识别"
      subtitle="转写 · 字幕"
      items={navigation.map((item) => ({ ...item, label: item.name, icon: <item.icon className="h-4 w-4" /> }))}
    />
  );
}
