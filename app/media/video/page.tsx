'use client';

import { useState, type FormEvent } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { VideoResultCard } from '@/components/media/video/video-result-card';
import { generateVideo } from '@/lib/media/client/media';
import {
  VIDEO_ASPECT_RATIO_OPTIONS,
  VIDEO_DURATION_OPTIONS,
  VIDEO_ICON_URL,
  VIDEO_MODEL_NAME,
  VIDEO_RESOLUTION_OPTIONS,
  type VideoAspectRatio,
  type VideoDuration,
  type VideoResolution,
} from '@/lib/media/shared/models';

export default function VideoGenerationPage() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [durationSeconds, setDurationSeconds] = useState<VideoDuration>(5);
  const [resolution, setResolution] = useState<VideoResolution>('720p');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setVideoUrl('');

    if (!prompt.trim()) {
      setError('请输入视频描述');
      return;
    }

    setIsGenerating(true);
    try {
      const url = await generateVideo({
        prompt: prompt.trim(),
        aspectRatio,
        durationSeconds,
        resolution,
      });
      setVideoUrl(url);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : '视频生成失败，请稍后再试');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <img src={VIDEO_ICON_URL} alt="" className="h-10 w-10 object-contain" />
            <div>
              <CardTitle>视频生成</CardTitle>
              <CardDescription>使用 {VIDEO_MODEL_NAME}，根据文字描述生成短视频。</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? <div className="alert-danger">{error}</div> : null}

            <div className="space-y-2">
              <Label htmlFor="video-prompt">视频描述</Label>
              <textarea
                id="video-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="描述你想生成的视频内容，例如：一只金毛犬在日落海滩上奔跑，镜头缓慢推进"
                className="min-h-[140px] w-full rounded-[var(--radius-md)] border border-[var(--oa-control-border)] bg-[var(--oa-card-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--oa-blue)]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="video-aspect">画面比例</Label>
                <select
                  id="video-aspect"
                  value={aspectRatio}
                  onChange={(event) => setAspectRatio(event.target.value as VideoAspectRatio)}
                  className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--oa-control-border)] bg-[var(--oa-card-bg)] px-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--oa-blue)]"
                >
                  {VIDEO_ASPECT_RATIO_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="video-duration">视频时长</Label>
                <select
                  id="video-duration"
                  value={durationSeconds}
                  onChange={(event) => setDurationSeconds(Number(event.target.value) as VideoDuration)}
                  className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--oa-control-border)] bg-[var(--oa-card-bg)] px-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--oa-blue)]"
                >
                  {VIDEO_DURATION_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="video-resolution">分辨率</Label>
                <select
                  id="video-resolution"
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value as VideoResolution)}
                  className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--oa-control-border)] bg-[var(--oa-card-bg)] px-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--oa-blue)]"
                >
                  {VIDEO_RESOLUTION_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              视频生成通常需要 1 到 3 分钟，请耐心等待。
            </p>

            <Button type="submit" size="lg" className="w-full" disabled={isGenerating}>
              {isGenerating ? '生成中，请稍候...' : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  生成视频
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <VideoResultCard videoUrl={videoUrl} />
    </div>
  );
}
