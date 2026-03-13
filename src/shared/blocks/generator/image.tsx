'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  Download,
  Gift,
  ImageIcon,
  Loader2,
  Palette,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';
import {
  ImageUploader,
  ImageUploaderValue,
  LazyImage,
} from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Progress } from '@/shared/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';

interface ImageGeneratorProps {
  allowMultipleImages?: boolean;
  maxImages?: number;
  maxSizeMB?: number;
  srOnlyTitle?: string;
  className?: string;
}

interface ColoringPageInfo {
  id: string;
  slug: string;
  title: string;
  category: string;
  imageUrl: string;
}

interface GeneratedImage {
  id: string;
  url: string;
  provider?: string;
  model?: string;
  prompt?: string;
  coloringPage?: ColoringPageInfo;
}

interface BackendTask {
  id: string;
  status: string;
  provider: string;
  model: string;
  prompt: string | null;
  taskInfo: string | null;
  taskResult: string | null;
}

type ImageGeneratorTab = 'text-to-image' | 'image-to-image';

const POLL_INTERVAL = 5000;
const GENERATION_TIMEOUT = 180000;
const MAX_PROMPT_LENGTH = 2000;

const MODEL_OPTIONS = [
  {
    value: 'renderartist/coloring-book-z-image-turbo-lora',
    label: 'Z-Library',
    provider: 'replicate',
    scenes: ['text-to-image'],
  },
  {
    value: 'google/nano-banana-pro',
    label: 'Nano Banana Pro',
    provider: 'replicate',
    scenes: ['text-to-image', 'image-to-image'],
  },
  {
    value: 'bytedance/seedream-4',
    label: 'Seedream 4',
    provider: 'replicate',
    scenes: ['text-to-image', 'image-to-image'],
  },
  {
    value: 'gemini-3-pro-image-preview',
    label: 'Gemini 3 Pro Image Preview',
    provider: 'gemini',
    scenes: ['text-to-image', 'image-to-image'],
  },
  {
    value: 'renderartist/coloring-book-z-image-turbo-lora',
    label: 'Z-Library (Fal)',
    provider: 'fal',
    scenes: ['text-to-image'],
  },
  {
    value: 'Tongyi-MAI/Z-Image-Turbo',
    label: 'Tongyi Z-Image',
    provider: 'siliconflow',
    scenes: ['text-to-image'],
  },
  {
    value: 'runware:400@2',
    label: 'Runware',
    provider: 'runware',
    scenes: ['text-to-image', 'image-to-image'],
  },
];

const PROVIDER_OPTIONS = [
  {
    value: 'replicate',
    label: 'Replicate',
  },
  {
    value: 'fal',
    label: 'Fal',
  },
  {
    value: 'gemini',
    label: 'Gemini',
  },
  {
    value: 'runware',
    label: 'Runware',
  },
  {
    value: 'siliconflow',
    label: 'SiliconFlow',
  },
];

const PREVIEW_PAIRS = [
  { id: '1', photo: '/previews/landscape_photo_1773238545031.png', lineart: '/previews/landscape_lineart_1773238560906.png', title: 'Landscape' },
  { id: '2', photo: '/previews/people_child_photo_1773238577924.png', lineart: '/previews/people_child_lineart_1773238593662.png', title: 'Happy Child' },
  { id: '3', photo: '/previews/still_life_photo_1773238607505.png', lineart: '/previews/still_life_lineart_1773238892533.png', title: 'Vintage Camera' },
  { id: '4', photo: '/previews/animal_photo_1773238908374.png', lineart: '/previews/animal_lineart_1773238923286.png', title: 'Cute Puppy' },
];

function parseTaskResult(taskResult: string | null): any {
  if (!taskResult) {
    return null;
  }

  try {
    return JSON.parse(taskResult);
  } catch (error) {
    console.warn('Failed to parse taskResult:', error);
    return null;
  }
}

function extractImageUrls(result: any): string[] {
  if (!result) {
    return [];
  }

  const output = result.output ?? result.images ?? result.data;

  if (!output) {
    return [];
  }

  if (typeof output === 'string') {
    return [output];
  }

  if (Array.isArray(output)) {
    return output
      .flatMap((item) => {
        if (!item) return [];
        if (typeof item === 'string') return [item];
        if (typeof item === 'object') {
          const candidate =
            item.url ?? item.uri ?? item.image ?? item.src ?? item.imageUrl;
          return typeof candidate === 'string' ? [candidate] : [];
        }
        return [];
      })
      .filter(Boolean);
  }

  if (typeof output === 'object') {
    const candidate =
      output.url ?? output.uri ?? output.image ?? output.src ?? output.imageUrl;
    if (typeof candidate === 'string') {
      return [candidate];
    }
  }

  return [];
}

export function ImageGenerator({
  allowMultipleImages = true,
  maxImages = 9,
  maxSizeMB = 5,
  srOnlyTitle,
  className,
}: ImageGeneratorProps) {
  const t = useTranslations('ai.image.generator');


  const [provider, setProvider] = useState('siliconflow');
  const [model, setModel] = useState('Tongyi-MAI/Z-Image-Turbo');
  const [prompt, setPrompt] = useState('');
  const [referenceImageItems, setReferenceImageItems] = useState<
    ImageUploaderValue[]
  >([]);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [coloringPageInfo, setColoringPageInfo] = useState<ColoringPageInfo | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(
    null
  );
  const [taskStatus, setTaskStatus] = useState<AITaskStatus | null>(null);
  const [downloadingImageId, setDownloadingImageId] = useState<string | null>(
    null
  );
  const [isMounted, setIsMounted] = useState(false);
  const [showBonusBadge, setShowBonusBadge] = useState(true);
  const [activePreviewId, setActivePreviewId] = useState<string>(PREVIEW_PAIRS[0].id);
  const activePreview = PREVIEW_PAIRS.find(p => p.id === activePreviewId) || PREVIEW_PAIRS[0];

  const { user, isCheckSign, setIsShowSignModal, fetchUserCredits } =
    useAppContext();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const promptLength = prompt.trim().length;
  const remainingCredits = user?.credits?.remainingCredits ?? 0;
  const isPromptTooLong = promptLength > MAX_PROMPT_LENGTH;
  const isTextToImageMode = referenceImageUrls.length === 0;

  // We determine cost based on whether it is text-to-image or image-to-image
  const currentCostCredits = isTextToImageMode ? 2 : 4;

  const taskStatusLabel = useMemo(() => {
    if (!taskStatus) {
      return '';
    }

    switch (taskStatus) {
      case AITaskStatus.PENDING:
        return 'Waiting for the model to start';
      case AITaskStatus.PROCESSING:
        return 'Generating your image...';
      case AITaskStatus.SUCCESS:
        return 'Image generation completed';
      case AITaskStatus.FAILED:
        return 'Generation failed';
      default:
        return '';
    }
  }, [taskStatus]);

  const handleReferenceImagesChange = useCallback(
    (items: ImageUploaderValue[]) => {
      setReferenceImageItems(items);
      const uploadedUrls = items
        .filter((item) => item.status === 'uploaded' && item.url)
        .map((item) => item.url as string);
      setReferenceImageUrls(uploadedUrls);
    },
    []
  );

  const isReferenceUploading = useMemo(
    () => referenceImageItems.some((item) => item.status === 'uploading'),
    [referenceImageItems]
  );

  const hasReferenceUploadError = useMemo(
    () => referenceImageItems.some((item) => item.status === 'error'),
    [referenceImageItems]
  );

  const resetTaskState = useCallback(() => {
    setIsGenerating(false);
    setProgress(0);
    setTaskId(null);
    setGenerationStartTime(null);
    setTaskStatus(null);
  }, []);

  const pollTaskStatus = useCallback(
    async (id: string) => {
      try {
        if (
          generationStartTime &&
          Date.now() - generationStartTime > GENERATION_TIMEOUT
        ) {
          resetTaskState();
          toast.error('Image generation timed out. Please try again.');
          return true;
        }

        const resp = await fetch('/api/ai/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId: id }),
        });

        if (!resp.ok) {
          throw new Error(`request failed with status: ${resp.status}`);
        }

        const { code, message, data } = await resp.json();
        if (code !== 0) {
          throw new Error(message || 'Query task failed');
        }

        const task = data as BackendTask;
        const currentStatus = task.status as AITaskStatus;
        setTaskStatus(currentStatus);

        const parsedResult = parseTaskResult(task.taskInfo);
        const imageUrls = extractImageUrls(parsedResult);

        if (currentStatus === AITaskStatus.PENDING) {
          setProgress((prev) => Math.max(prev, 20));
          return false;
        }

        if (currentStatus === AITaskStatus.PROCESSING) {
          if (imageUrls.length > 0) {
            setGeneratedImages(
              imageUrls.map((url, index) => ({
                id: `${task.id}-${index}`,
                url,
                provider: task.provider,
                model: task.model,
                prompt: task.prompt ?? undefined,
              }))
            );
            setProgress((prev) => Math.max(prev, 85));
          } else {
            setProgress((prev) => Math.min(prev + 10, 80));
          }
          return false;
        }

        if (currentStatus === AITaskStatus.SUCCESS) {
          if (imageUrls.length === 0) {
            toast.error('The provider returned no images. Please retry.');
          } else {
            const cpInfo = (data as any).coloringPage || null;
            setGeneratedImages(
              imageUrls.map((url, index) => ({
                id: `${task.id}-${index}`,
                url,
                provider: task.provider,
                model: task.model,
                prompt: task.prompt ?? undefined,
                coloringPage: cpInfo || undefined,
              }))
            );
            if (cpInfo) {
              setColoringPageInfo(cpInfo);
            }
            toast.success('Image generated successfully');
          }

          setProgress(100);
          resetTaskState();
          return true;
        }

        if (currentStatus === AITaskStatus.FAILED) {
          const errorMessage =
            parsedResult?.errorMessage || 'Generate image failed';
          toast.error(errorMessage);
          resetTaskState();

          fetchUserCredits();

          return true;
        }

        setProgress((prev) => Math.min(prev + 5, 95));
        return false;
      } catch (error: any) {
        console.error('Error polling image task:', error);
        toast.error(`Query task failed: ${error.message}`);
        resetTaskState();

        fetchUserCredits();

        return true;
      }
    },
    [generationStartTime, resetTaskState]
  );

  useEffect(() => {
    if (!taskId || !isGenerating) {
      return;
    }

    let cancelled = false;

    const tick = async () => {
      if (!taskId) {
        return;
      }
      const completed = await pollTaskStatus(taskId);
      if (completed) {
        cancelled = true;
      }
    };

    tick();

    const interval = setInterval(async () => {
      if (cancelled || !taskId) {
        clearInterval(interval);
        return;
      }
      const completed = await pollTaskStatus(taskId);
      if (completed) {
        clearInterval(interval);
      }
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [taskId, isGenerating, pollTaskStatus]);

  const handleGenerate = async () => {
    // Immediate auth check — show sign-in modal right away, no progress bar
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    if (remainingCredits < currentCostCredits) {
      toast.error('Insufficient credits. Please top up to keep creating.');
      return;
    }

    const trimmedPrompt = prompt.trim();
    // For image-to-image mode, prompt is optional (will use default prompt in backend)
    if (!trimmedPrompt && isTextToImageMode) {
      toast.error('Please enter a prompt before generating.');
      return;
    }

    if (!provider || !model) {
      toast.error('Provider or model is not configured correctly.');
      return;
    }

    if (!isTextToImageMode && referenceImageUrls.length === 0) {
      toast.error('Please upload reference images before generating.');
      return;
    }

    let currentProvider = provider;
    let currentModel = model;

    // Default overrides
    if (isTextToImageMode) {
      currentProvider = 'siliconflow';
      currentModel = 'Tongyi-MAI/Z-Image-Turbo';
    } else {
      currentProvider = 'runware';
      currentModel = 'runware:400@2';
    }

    // Start generating — show spinner but no progress yet
    setIsGenerating(true);
    setProgress(0);
    setTaskStatus(AITaskStatus.PENDING);
    setGeneratedImages([]);
    setGenerationStartTime(Date.now());

    try {
      const options: any = {};

      if (!isTextToImageMode) {
        options.image_input = referenceImageUrls;
      }

      const resp = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaType: AIMediaType.IMAGE,
          scene: isTextToImageMode ? 'text-to-image' : 'image-to-image',
          provider: currentProvider,
          model: currentModel,
          prompt: trimmedPrompt,
          options,
        }),
      });

      if (!resp.ok) {
        throw new Error(`request failed with status: ${resp.status}`);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message || 'Failed to create an image task');
      }

      // API accepted the request — now show progress
      setProgress(15);

      // ── Feature 2: Handle cached result ──
      if (data.cached && data.coloringPage) {
        const cachedImageUrl = data.coloringPage.imageUrl;
        setGeneratedImages([{
          id: `cached-${data.coloringPage.id}`,
          url: cachedImageUrl,
          provider: currentProvider,
          model: currentModel,
          prompt: trimmedPrompt,
          coloringPage: data.coloringPage,
        }]);
        setColoringPageInfo(data.coloringPage);
        toast.success('Found cached result — no credits consumed!');
        setProgress(100);
        resetTaskState();
        return;
      }

      const newTaskId = data?.id;
      if (!newTaskId) {
        throw new Error('Task id missing in response');
      }

      // ── Feature 1 & 3: Handle sync provider success with coloring page ──
      if (data.status === AITaskStatus.SUCCESS && data.taskInfo) {
        const parsedResult = parseTaskResult(data.taskInfo);
        const imageUrls = extractImageUrls(parsedResult);

        if (imageUrls.length > 0) {
          const cpInfo = data.coloringPage || null;
          setGeneratedImages(
            imageUrls.map((url, index) => ({
              id: `${newTaskId}-${index}`,
              url,
              provider: currentProvider,
              model: currentModel,
              prompt: trimmedPrompt,
              coloringPage: cpInfo || undefined,
            }))
          );
          if (cpInfo) {
            setColoringPageInfo(cpInfo);
          }
          toast.success('Image generated successfully');
          setProgress(100);
          resetTaskState();
          await fetchUserCredits();
          return;
        }
      }

      setTaskId(newTaskId);
      setProgress(25);

      await fetchUserCredits();
    } catch (error: any) {
      console.error('Failed to generate image:', error);
      toast.error(`Failed to generate image: ${error.message}`);
      resetTaskState();
    }
  };

  const handleDownloadImage = async (image: GeneratedImage) => {
    if (!image.url) {
      return;
    }

    try {
      setDownloadingImageId(image.id);
      // fetch image via proxy
      const resp = await fetch(
        `/api/proxy/file?url=${encodeURIComponent(image.url)}`
      );
      if (!resp.ok) {
        throw new Error('Failed to fetch image');
      }

      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${image.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
      toast.success('Image downloaded');
    } catch (error) {
      console.error('Failed to download image:', error);
      toast.error('Failed to download image');
    } finally {
      setDownloadingImageId(null);
    }
  };

  return (
    <section className={cn('py-10 md:py-16', className)}>
      <div className="container">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <Card className="rounded-2xl border-2 border-border/60 bg-white shadow-sm overflow-hidden">
                <CardHeader className="bg-white py-1.5 px-4">
                  {srOnlyTitle && <h2 className="sr-only">{srOnlyTitle}</h2>}
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                    <span className="text-primary"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wand-2 size-4"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" /><path d="m14 7 3 3" /><path d="M5 6v4" /><path d="M19 14v4" /><path d="M10 2v2" /><path d="M7 8H3" /><path d="M21 16h-4" /><path d="M11 3H9" /></svg></span>
                    Describe the image you want
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  <div className="relative">
                    <Textarea
                      id="image-prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., a cute bunny hopping in the garden, surrounded by butterflies..."
                      className="min-h-20 rounded-2xl bg-muted/30 border-primary/30 p-3 shadow-inner focus-visible:ring-primary/20 resize-none text-sm w-full"
                    />
                  </div>
                  <div className="text-muted-foreground flex items-center justify-end text-xs mt-1 gap-2">
                    {isPromptTooLong && (
                      <span className="text-destructive">
                        {t('form.prompt_too_long')}
                      </span>
                    )}
                    <span>
                      {promptLength} / {MAX_PROMPT_LENGTH}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-foreground/60">Quick select:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Cute Kitten', 'Magic Castle', 'Undersea World', 'Space Adventure', 'Forest Sprite', 'Dinosaur'].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setPrompt(tag)}
                          className="bg-accent/70 text-accent-foreground hover:bg-accent px-3 py-1 rounded-full text-xs font-medium transition-colors border border-transparent hover:border-accent-foreground/10 shadow-sm"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-2 border-border/60 bg-white shadow-sm overflow-hidden">
                <CardHeader className="bg-white py-1.5 px-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                    <span className="text-secondary"><ImageIcon className="size-4" /></span>
                    Or upload an image
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  <ImageUploader
                    title=""
                    allowMultiple={false}
                    maxImages={1}
                    maxSizeMB={maxSizeMB}
                    onChange={handleReferenceImagesChange}
                  />
                  {hasReferenceUploadError && (
                    <p className="text-destructive text-xs mt-1 text-center">
                      {t('form.some_images_failed_to_upload')}
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-3 relative">
                {/* New user bonus badge - show when not logged in */}
                {!user && isMounted && showBonusBadge && (
                  <div className="absolute -top-12 right-0 z-10 animate-bounce">
                    <div className="px-3 py-1.5 rounded-full shadow-md flex items-center gap-2 text-sm font-medium border" style={{ backgroundColor: '#F3CECB', color: '#1a1a1a', borderColor: '#e0b8b5' }}>
                      <Gift className="h-4 w-4" />
                      <span>{t('new_user_bonus')}</span>
                      <button
                        onClick={() => setShowBonusBadge(false)}
                        className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {!isMounted ? (
                  <Button className="w-full rounded-full py-4 text-base font-medium shadow-md shadow-primary/20" disabled size="lg">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('loading')}
                  </Button>
                ) : isCheckSign ? (
                  <Button className="w-full rounded-full py-4 text-base font-medium shadow-md shadow-primary/20" disabled size="lg">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('checking_account')}
                  </Button>
                ) : user ? (
                  <Button
                    size="lg"
                    className="w-full rounded-full py-4 text-base font-medium shadow-md shadow-primary/20 hover:shadow-lg transition-all"
                    onClick={handleGenerate}
                    disabled={
                      isGenerating ||
                      (isTextToImageMode && !prompt.trim()) ||
                      isPromptTooLong ||
                      isReferenceUploading ||
                      hasReferenceUploadError
                    }
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('generating')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {t('generate')}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="w-full rounded-full py-4 text-base font-medium shadow-md shadow-primary/20 hover:shadow-lg transition-all"
                    onClick={() => setIsShowSignModal(true)}
                  >
                    <User className="mr-2 h-4 w-4" />
                    {t('sign_in_to_generate')}
                  </Button>
                )}

                {!isMounted ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary">
                      {t('credits_cost', { credits: currentCostCredits })}
                    </span>
                    <span>{t('credits_remaining', { credits: 0 })}</span>
                  </div>
                ) : user && remainingCredits > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary">
                      {t('credits_cost', { credits: currentCostCredits })}
                    </span>
                    <span>
                      {t('credits_remaining', { credits: remainingCredits })}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-primary">
                        {t('credits_cost', { credits: currentCostCredits })}
                      </span>
                      <span>
                        {t('credits_remaining', { credits: remainingCredits })}
                      </span>
                    </div>
                    <Link href="/pricing">
                      <Button variant="outline" className="w-full py-4 text-base rounded-full" size="lg">
                        <CreditCard className="mr-2 h-4 w-4" />
                        {t('buy_credits')}
                      </Button>
                    </Link>
                  </div>
                )}

                {isGenerating && (
                  <div className="space-y-2 rounded-lg border p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('progress')}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                    {taskStatusLabel && (
                      <p className="text-muted-foreground text-center text-xs">
                        {taskStatusLabel}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Card className="rounded-2xl border-2 border-border/60 bg-white shadow-sm sm:p-1 h-full">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                  <span className="text-secondary"><ImageIcon className="h-4 w-4" /></span>
                  {t('generated_images')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4 h-full flex flex-col">
                {generatedImages.length > 0 ? (
                  <div
                    className={
                      generatedImages.length === 1
                        ? 'grid grid-cols-1 gap-6'
                        : 'grid gap-6 sm:grid-cols-2'
                    }
                  >
                    {generatedImages.map((image) => (
                      <div key={image.id} className="space-y-3">
                        <div
                          className={
                            generatedImages.length === 1
                              ? 'relative aspect-square overflow-hidden rounded-lg border bg-muted/20'
                              : 'relative aspect-square overflow-hidden rounded-lg border bg-muted/20'
                          }
                        >
                          <LazyImage
                            src={image.url}
                            alt={image.prompt || 'Generated image'}
                            className="h-full w-full object-contain bg-muted/10"
                          />

                          <div className="absolute right-2 bottom-2 flex gap-1 text-sm">
                            {/* Feature 3: Color This Page button */}
                            {image.coloringPage && (
                              <Link
                                href={`/generated/${image.coloringPage.id}`}
                              >
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="bg-primary/90 hover:bg-primary text-white shadow-lg backdrop-blur-sm"
                                >
                                  <Palette className="mr-1 h-4 w-4" />
                                  Color It
                                </Button>
                              </Link>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="backdrop-blur-sm"
                              onClick={() => handleDownloadImage(image)}
                              disabled={downloadingImageId === image.id}
                            >
                              {downloadingImageId === image.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        {/* Feature 4: Show category badge */}
                        {image.coloringPage && (
                          <div className="flex items-center gap-2">
                            <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
                              {image.coloringPage.category}
                            </span>
                            <span className="text-muted-foreground truncate text-xs">
                              {image.coloringPage.title}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 px-6 text-center rounded-[2rem] bg-[#f2f8da] flex-1 min-h-[300px] relative overflow-hidden">
                    <div className="relative w-full aspect-square max-h-[340px] mb-6 p-2">
                      <div className="absolute inset-0 border-[3px] border-dashed border-[#2c3f30] rounded-xl pointer-events-none z-20" style={{ transform: 'rotate(-1deg)' }}></div>
                      <div className="absolute inset-0 border-[3px] border-dashed border-[#2c3f30] rounded-xl pointer-events-none z-20" style={{ transform: 'rotate(1deg)' }}></div>
                      <div className="relative w-full h-full rounded-xl overflow-hidden group border border-[#2c3f30]">
                        <img src={activePreview.photo} className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300 group-hover:opacity-0" alt="Original Photo" />
                        <img src={activePreview.lineart} className="absolute inset-0 w-full h-full object-cover bg-white" alt="Coloring Page" />
                      </div>
                      <button className="absolute -top-1 -right-1 z-30 bg-[#f87864] text-white rounded-full p-1.5 shadow-md hover:bg-red-500 hover:scale-105 transition-transform border border-white">
                        <X className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>

                    <div className="w-full text-left font-[var(--font-sans)] text-[#8dbd9d] text-[22px] font-semibold mb-4 leading-snug">
                      No image?<br />
                      Try one of these:
                    </div>

                    <div className="flex gap-3 justify-start w-full overflow-x-auto pb-2 px-1">
                      {PREVIEW_PAIRS.map(pair => (
                        <button
                          key={pair.id}
                          onClick={() => setActivePreviewId(pair.id)}
                          className={`relative flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden shadow-sm transition-transform hover:scale-105 ${activePreviewId === pair.id ? 'ring-4 ring-[#70abf0] ring-offset-2 ring-offset-[#f2f8da]' : ''}`}
                        >
                          <img src={pair.photo} className="w-full h-full object-cover rounded-2xl" alt={pair.title} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
