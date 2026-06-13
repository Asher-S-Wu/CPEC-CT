'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageIcon } from 'lucide-react';

interface ImageResultCardProps {
  imageUrl: string;
}

export function ImageResultCard({ imageUrl }: ImageResultCardProps) {
  if (!imageUrl) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          生成的图片
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--oa-card-border)] bg-[var(--oa-paper-soft)]">
          <img
            src={imageUrl}
            alt="生成的图片"
            className="mx-auto max-h-[640px] w-full object-contain"
          />
        </div>
        <a
          href={imageUrl}
          download
          className="inline-flex text-sm font-medium text-[var(--oa-blue)] hover:underline"
        >
          下载图片
        </a>
      </CardContent>
    </Card>
  );
}
