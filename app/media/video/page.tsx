'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Clapperboard, ImagePlus, Sparkles, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { VideoResultCard } from '@/components/media/video/video-result-card';
import { generateVideo } from '@/lib/media/client/media';
import {
  VIDEO_ASPECT_RATIO_OPTIONS,
  VIDEO_DURATION_OPTIONS,
  VIDEO_FRAME_ACCEPTED_MIME_TYPES,
  VIDEO_FRAME_MAX_BYTES,
  VIDEO_ICON_URL,
  VIDEO_MODEL_NAME,
  VIDEO_PROMPT_MAX_LENGTH,
  VIDEO_RESOLUTION_OPTIONS,
  type VideoAspectRatio,
  type VideoDuration,
  type VideoResolution,
} from '@/lib/media/shared/models';

type VideoMode = 'text' | 'image';
type FrameKind = 'image' | 'lastFrame';

function isAcceptedFrame(file: File) {
  return VIDEO_FRAME_ACCEPTED_MIME_TYPES.includes(file.type as typeof VIDEO_FRAME_ACCEPTED_MIME_TYPES[number]);
}

export default function VideoGenerationPage() {
  const [mode, setMode] = useState<VideoMode>('text');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [durationSeconds, setDurationSeconds] = useState<VideoDuration>(5);
  const [resolution, setResolution] = useState<VideoResolution>('720p');
  const [generateAudio, setGenerateAudio] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [lastFrame, setLastFrame] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [lastFramePreviewUrl, setLastFramePreviewUrl] = useState('');
  const [imageInputKey, setImageInputKey] = useState(0);
  const [lastFrameInputKey, setLastFrameInputKey] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    if (!image) {
      setImagePreviewUrl('');
      return;
    }

    const nextUrl = URL.createObjectURL(image);
    setImagePreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [image]);

  useEffect(() => {
    if (!lastFrame) {
      setLastFramePreviewUrl('');
      return;
    }

    const nextUrl = URL.createObjectURL(lastFrame);
    setLastFramePreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [lastFrame]);

  const handleModeChange = (nextMode: VideoMode) => {
    setMode(nextMode);
    setError('');
    setVideoUrl('');
  };

  const handleFrameChange = (kind: FrameKind, file: File | null) => {
    setError('');
    if (kind === 'image') {
      setImage(file);
      if (!file) setImageInputKey((current) => current + 1);
      return;
    }
    setLastFrame(file);
    if (!file) setLastFrameInputKey((current) => current + 1);
  };

  const validateFrame = (file: File | null, label: string) => {
    if (!file) return '';
    if (!isAcceptedFrame(file)) return `${label}仅支持 PNG、JPG、WEBP 图片`;
    if (file.size > VIDEO_FRAME_MAX_BYTES) return `${label}大小不能超过 25MB`;
    return '';
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setVideoUrl('');

    if (mode === 'text' && !prompt.trim()) {
      setError('请输入视频描述');
      return;
    }

    if (mode === 'image' && !image) {
      setError('请上传首帧图片');
      return;
    }

    if (prompt.trim().length > VIDEO_PROMPT_MAX_LENGTH) {
      setError(`视频描述最多支持 ${VIDEO_PROMPT_MAX_LENGTH} 个字符`);
      return;
    }

    const imageError = validateFrame(mode === 'image' ? image : null, '首帧图片');
    if (imageError) {
      setError(imageError);
      return;
    }

    const lastFrameError = validateFrame(mode === 'image' ? lastFrame : null, '尾帧图片');
    if (lastFrameError) {
      setError(lastFrameError);
      return;
    }

    setIsGenerating(true);
    try {
      const url = await generateVideo({
        prompt: prompt.trim(),
        aspectRatio,
        durationSeconds,
        resolution,
        image: mode === 'image' ? image : null,
        lastFrame: mode === 'image' ? lastFrame : null,
        generateAudio,
      });
      setVideoUrl(url);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : '视频生成失败，请稍后再试');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderFramePicker = ({
    kind,
    label,
    file,
    previewUrl,
    inputKey,
  }: {
    kind: FrameKind;
    label: string;
    file: File | null;
    previewUrl: string;
    inputKey: number;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={`video-${kind}`}>{label}</Label>
      <div className="overflow-hidden rounded-lg border border-[var(--oa-card-border)] bg-[var(--oa-paper-soft)]">
        <div className="relative min-h-[130px]">
          <label
            htmlFor={`video-${kind}`}
            className="flex min-h-[130px] cursor-pointer flex-col items-center justify-center px-4 py-5 text-center text-sm text-[var(--oa-muted)] transition hover:text-[var(--oa-ink)]"
          >
            {previewUrl ? (
              <img src={previewUrl} alt={label} className="h-[156px] w-full object-contain" />
            ) : (
              <>
                <Upload className="mb-2 h-6 w-6" />
                <span className="font-medium">{file ? file.name : '上传 PNG、JPG 或 WEBP'}</span>
                <span className="mt-1 text-xs">最大 25MB</span>
              </>
            )}
          </label>
          {previewUrl ? (
            <button
              type="button"
              onClick={() => handleFrameChange(kind, null)}
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
              aria-label={`移除${label}`}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <input
            key={inputKey}
            id={`video-${kind}`}
            type="file"
            accept={VIDEO_FRAME_ACCEPTED_MIME_TYPES.join(',')}
            className="sr-only"
            onChange={(event) => handleFrameChange(kind, event.target.files?.[0] || null)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <img src={VIDEO_ICON_URL} alt="" className="h-10 w-10 object-contain" />
            <div>
              <CardTitle>视频生成</CardTitle>
              <CardDescription>使用 {VIDEO_MODEL_NAME}，生成短视频或让图片动起来。</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? <div className="alert-danger">{error}</div> : null}

            <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--oa-control-border)] bg-[var(--oa-paper-soft)] p-1">
              <button
                type="button"
                onClick={() => handleModeChange('text')}
                className={`flex h-11 items-center justify-center gap-2 rounded-[calc(0.5rem-2px)] text-sm font-medium transition ${
                  mode === 'text'
                    ? 'bg-[var(--oa-card-bg)] text-[var(--oa-ink)]'
                    : 'text-[var(--oa-muted)] hover:text-[var(--oa-ink)]'
                }`}
              >
                <Clapperboard className="h-4 w-4" />
                文字生成
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('image')}
                className={`flex h-11 items-center justify-center gap-2 rounded-[calc(0.5rem-2px)] text-sm font-medium transition ${
                  mode === 'image'
                    ? 'bg-[var(--oa-card-bg)] text-[var(--oa-ink)]'
                    : 'text-[var(--oa-muted)] hover:text-[var(--oa-ink)]'
                }`}
              >
                <ImagePlus className="h-4 w-4" />
                图片转视频
              </button>
            </div>

            {mode === 'image' ? (
              <div className="grid gap-4 md:grid-cols-2">
                {renderFramePicker({
                  kind: 'image',
                  label: '首帧图片',
                  file: image,
                  previewUrl: imagePreviewUrl,
                  inputKey: imageInputKey,
                })}
                {renderFramePicker({
                  kind: 'lastFrame',
                  label: '尾帧图片',
                  file: lastFrame,
                  previewUrl: lastFramePreviewUrl,
                  inputKey: lastFrameInputKey,
                })}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="video-prompt">视频描述</Label>
              <textarea
                id="video-prompt"
                value={prompt}
                maxLength={VIDEO_PROMPT_MAX_LENGTH}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={mode === 'image'
                  ? '描述画面如何运动，例如：人物缓慢转身，镜头轻微推进，背景灯光逐渐亮起'
                  : '描述你想生成的视频内容，例如：一只金毛犬在日落海滩上奔跑，镜头缓慢推进'}
                className="min-h-[140px] w-full rounded-lg border border-[var(--oa-control-border)] bg-[var(--oa-card-bg)] px-4 py-3 text-sm text-[var(--oa-ink)] outline-none focus:border-[var(--oa-ink)]"
              />
              <div className="text-right text-xs text-[var(--oa-muted)]">
                {prompt.length}/{VIDEO_PROMPT_MAX_LENGTH}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="video-aspect">画面比例</Label>
                <select
                  id="video-aspect"
                  value={aspectRatio}
                  onChange={(event) => setAspectRatio(event.target.value as VideoAspectRatio)}
                className="h-11 w-full rounded-lg border border-[var(--oa-control-border)] bg-[var(--oa-card-bg)] px-4 text-sm text-[var(--oa-ink)] outline-none focus:border-[var(--oa-ink)]"
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
                className="h-11 w-full rounded-lg border border-[var(--oa-control-border)] bg-[var(--oa-card-bg)] px-4 text-sm text-[var(--oa-ink)] outline-none focus:border-[var(--oa-ink)]"
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
                className="h-11 w-full rounded-lg border border-[var(--oa-control-border)] bg-[var(--oa-card-bg)] px-4 text-sm text-[var(--oa-ink)] outline-none focus:border-[var(--oa-ink)]"
                >
                  {VIDEO_RESOLUTION_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex min-h-[72px] items-center gap-3 rounded-lg border border-[var(--oa-control-border)] bg-[var(--oa-card-bg)] px-4 py-3 text-sm text-[var(--oa-ink)]">
              <input
                type="checkbox"
                checked={generateAudio}
                onChange={(event) => setGenerateAudio(event.target.checked)}
                className="h-4 w-4"
              />
              生成音轨
            </label>

            <p className="text-xs text-[var(--oa-muted)]">
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
