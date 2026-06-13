'use client';

import type { Route } from 'next';
import { SectionSidebar } from '@/components/navigation/section-sidebar';
import { ImageIcon, Clapperboard } from 'lucide-react';

const navigation: Array<{ name: string; href: Route; icon: typeof ImageIcon }> = [
  { name: '图片生成', href: '/media/image', icon: ImageIcon },
  { name: '视频生成', href: '/media/video', icon: Clapperboard },
];

export function Sidebar() {
  return (
    <SectionSidebar
      title="媒体工作台"
      subtitle="图片 · 视频"
      items={navigation.map((item) => ({ ...item, label: item.name, icon: <item.icon className="h-4 w-4" /> }))}
    />
  );
}
