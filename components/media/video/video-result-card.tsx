'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clapperboard } from 'lucide-react';

interface VideoResultCardProps {
  videoUrl: string;
}

export function VideoResultCard({ videoUrl }: VideoResultCardProps) {
  if (!videoUrl) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clapperboard className="h-5 w-5" />
          生成的视频
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <video
          controls
          playsInline
          className="w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--oa-card-border)] bg-black"
          src={videoUrl}
        >
          您的浏览器不支持视频播放。
        </video>
        <a
          href={videoUrl}
          download
          className="inline-flex text-sm font-medium text-[var(--oa-blue)] hover:underline"
        >
          下载视频
        </a>
      </CardContent>
    </Card>
  );
}
