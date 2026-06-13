'use client';

import { useState, type FormEvent } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ImageResultCard } from '@/components/media/image/image-result-card';
import { generateImage } from '@/lib/media/client/media';
import {
  IMAGE_ICON_URL,
  IMAGE_MODEL_NAME,
  IMAGE_SIZE_OPTIONS,
  type ImageSize,
} from '@/lib/media/shared/models';

export default function ImageGenerationPage() {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<ImageSize>('1024x1024');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setImageUrl('');

    if (!prompt.trim()) {
      setError('请输入图片描述');
      return;
    }

    setIsGenerating(true);
    try {
      const url = await generateImage({ prompt: prompt.trim(), size });
      setImageUrl(url);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : '图片生成失败，请稍后再试');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <img src={IMAGE_ICON_URL} alt="" className="h-10 w-10 object-contain" />
            <div>
              <CardTitle>图片生成</CardTitle>
              <CardDescription>使用 {IMAGE_MODEL_NAME}，根据文字描述生成图片。</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? <div className="alert-danger">{error}</div> : null}

            <div className="space-y-2">
              <Label htmlFor="image-prompt">图片描述</Label>
              <textarea
                id="image-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="描述你想生成的画面，例如：夕阳下的城市天际线，电影感光影，细节清晰"
                className="min-h-[140px] w-full rounded-[var(--radius-md)] border border-[var(--oa-control-border)] bg-[var(--oa-card-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--oa-blue)]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-size">图片尺寸</Label>
              <select
                id="image-size"
                value={size}
                onChange={(event) => setSize(event.target.value as ImageSize)}
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--oa-control-border)] bg-[var(--oa-card-bg)] px-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--oa-blue)]"
              >
                {IMAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isGenerating}>
              {isGenerating ? '生成中...' : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  生成图片
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <ImageResultCard imageUrl={imageUrl} />
    </div>
  );
}
