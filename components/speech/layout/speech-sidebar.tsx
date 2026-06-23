'use client';

import type { Route } from 'next';
import { SectionSidebar } from '@/components/navigation/section-sidebar';
import {
  Mic,
  FileAudio,
  Music,
  History,
} from 'lucide-react';

const navigation: Array<{ name: string; href: Route; icon: typeof FileAudio }> = [
  { name: '文本转语音', href: '/speech/text-to-speech', icon: FileAudio },
  { name: '生成历史', href: '/speech/tts-history', icon: History },
  { name: '声音克隆', href: '/speech/voice-clone', icon: Mic },
  { name: '我的声音', href: '/speech/my-voices', icon: Music },
];

export function Sidebar() {
  return (
    <SectionSidebar
      title="语音合成"
      subtitle="配音 · 克隆"
      items={navigation.map((item) => ({ ...item, label: item.name, icon: <item.icon className="h-4 w-4" /> }))}
    />
  );
}
