'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ImagePlus, Sparkles, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ImageResultCard } from '@/components/media/image/image-result-card';
import { editImage, generateImage } from '@/lib/media/client/media';
import {
  IMAGE_EDIT_ACCEPTED_MIME_TYPES,
  IMAGE_EDIT_MAX_BYTES,
  IMAGE_ICON_URL,
  IMAGE_MODEL_NAME,
  IMAGE_PROMPT_MAX_LENGTH,
  IMAGE_SIZE_OPTIONS,
  type ImageSize,
} from '@/lib/media/shared/models';

type ImageMode = 'generate' | 'edit';

export default function ImageGenerationPage() {
  const [mode, setMode] = useState<ImageMode>('generate');
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<ImageSize>('1024x1024');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [resultTitle, setResultTitle] = useState('生成的图片');
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState('');
  const [sourceInputKey, setSourceInputKey] = useState(0);

  useEffect(() => {
    if (!sourceImage) {
      setSourcePreviewUrl('');
      return;
    }

    const nextUrl = URL.createObjectURL(sourceImage);
    setSourcePreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [sourceImage]);

  const handleModeChange = (nextMode: ImageMode) => {
    setMode(nextMode);
    setError('');
    setImageUrl('');
    setResultTitle(nextMode === 'edit' ? '编辑后的图片' : '生成的图片');
  };

  const handleSourceImageChange = (file: File | null) => {
    setError('');
    setSourceImage(file);
    if (!file) {
      setSourceInputKey((current) => current + 1);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setImageUrl('');

    if (!prompt.trim()) {
      setError('请输入图片描述');
      return;
    }

    if (prompt.trim().length > IMAGE_PROMPT_MAX_LENGTH) {
      setError(`描述最多支持 ${IMAGE_PROMPT_MAX_LENGTH} 个字符`);
      return;
    }

    if (mode === 'edit') {
      if (!sourceImage) {
        setError('请上传需要编辑的图片');
        return;
      }

      if (!IMAGE_EDIT_ACCEPTED_MIME_TYPES.includes(sourceImage.type as typeof IMAGE_EDIT_ACCEPTED_MIME_TYPES[number])) {
        setError('仅支持 PNG、JPG、WEBP 图片');
        return;
      }

      if (sourceImage.size > IMAGE_EDIT_MAX_BYTES) {
        setError('图片大小不能超过 25MB');
        return;
      }
    }

    setIsGenerating(true);
    try {
      const url = mode === 'edit' && sourceImage
        ? await editImage({ prompt: prompt.trim(), size, image: sourceImage })
        : await generateImage({ prompt: prompt.trim(), size });
      setImageUrl(url);
      setResultTitle(mode === 'edit' ? '编辑后的图片' : '生成的图片');
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : '图片处理失败，请稍后再试');
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
              <CardDescription>使用 {IMAGE_MODEL_NAME}，生成新图片或编辑已有图片。</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? <div className="alert-danger">{error}</div> : null}

            <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-md)] border border-[var(--oa-control-border)] bg-[var(--oa-paper-soft)] p-1">
              <button
                type="button"
                onClick={() => handleModeChange('generate')}
                className={`flex h-11 items-center justify-center gap-2 rounded-[calc(var(--radius-md)-2px)] text-sm font-semibold transition ${
                  mode === 'generate'
                    ? 'bg-[var(--oa-card-bg)] text-[var(--oa-ink)] shadow-sm'
                    : 'text-[var(--oa-muted)] hover:text-[var(--oa-ink)]'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                生成图片
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('edit')}
                className={`flex h-11 items-center justify-center gap-2 rounded-[calc(var(--radius-md)-2px)] text-sm font-semibold transition ${
                  mode === 'edit'
                    ? 'bg-[var(--oa-card-bg)] text-[var(--oa-ink)] shadow-sm'
                    : 'text-[var(--oa-muted)] hover:text-[var(--oa-ink)]'
                }`}
              >
                <ImagePlus className="h-4 w-4" />
                编辑图片
              </button>
            </div>

            {mode === 'edit' ? (
              <div className="space-y-2">
                <Label htmlFor="source-image">参考图片</Label>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                  <label
                    htmlFor="source-image"
                    className="flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--oa-control-border)] bg-[var(--oa-control-bg)] px-4 py-5 text-center text-sm text-[var(--oa-muted)] transition hover:border-[var(--oa-blue)] hover:text-[var(--oa-ink)]"
                  >
                    <Upload className="mb-2 h-6 w-6" />
                    <span className="font-medium">{sourceImage ? sourceImage.name : '上传 PNG、JPG 或 WEBP'}</span>
                    <span className="mt-1 text-xs">最大 25MB</span>
                    <input
                      key={sourceInputKey}
                      id="source-image"
                      type="file"
                      accept={IMAGE_EDIT_ACCEPTED_MIME_TYPES.join(',')}
                      className="sr-only"
                      onChange={(event) => handleSourceImageChange(event.target.files?.[0] || null)}
                    />
                  </label>

                  <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--oa-card-border)] bg-[var(--oa-paper-soft)]">
                    {sourcePreviewUrl ? (
                      <>
                        <img src={sourcePreviewUrl} alt="参考图片" className="h-[132px] w-full object-contain" />
                        <button
                          type="button"
                          onClick={() => handleSourceImageChange(null)}
                          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(0,0,0,0.58)] text-white transition hover:bg-[rgba(0,0,0,0.72)]"
                          aria-label="移除图片"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <div className="flex h-[132px] items-center justify-center text-sm text-[var(--oa-muted)]">
                        未选择图片
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="image-prompt">图片描述</Label>
              <textarea
                id="image-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={IMAGE_PROMPT_MAX_LENGTH}
                placeholder={mode === 'edit'
                  ? '描述你想修改的地方，例如：保留人物姿势，将背景改成夜晚街景，增加霓虹灯'
                  : '描述你想生成的画面，例如：夕阳下的城市天际线，电影感光影，细节清晰'}
                className="min-h-[140px] w-full rounded-[var(--radius-md)] border border-[var(--oa-control-border)] bg-[var(--oa-card-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--oa-blue)]"
              />
              <div className="text-right text-xs text-[var(--oa-muted)]">
                {prompt.length}/{IMAGE_PROMPT_MAX_LENGTH}
              </div>
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
              {isGenerating ? '处理中...' : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  {mode === 'edit' ? '编辑图片' : '生成图片'}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <ImageResultCard imageUrl={imageUrl} title={resultTitle} />
    </div>
  );
}
