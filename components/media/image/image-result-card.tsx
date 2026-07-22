'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, ImageIcon } from 'lucide-react';

interface ImageResultCardProps {
  imageUrl: string;
  title?: string;
}

export function ImageResultCard({ imageUrl, title = '生成的图片' }: ImageResultCardProps) {
  if (!imageUrl) return null;

  return (
    <Card className="animate-fade-in-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-lg border border-[var(--oa-card-border)] bg-[var(--oa-paper-soft)]">
          <img
            src={imageUrl}
            alt={title}
            className="mx-auto max-h-[640px] w-full object-contain"
          />
        </div>
        <a
          href={imageUrl}
          download
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--oa-control-border)] bg-[var(--oa-control-bg)] px-3 py-2 text-xs font-medium text-[var(--oa-ink)] transition-colors hover:bg-[var(--oa-paper-soft)]"
        >
          <Download className="h-4 w-4" />
          下载图片
        </a>
      </CardContent>
    </Card>
  );
}
