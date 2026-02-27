import { envConfigs } from '@/config';
import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import { getUuid } from '@/shared/lib/hash';
import {
  checkPromptCache,
  createColoringPageFromGenerated,
} from '@/shared/lib/coloring-helper';
import { respData, respErr } from '@/shared/lib/resp';
import { createAITask, NewAITask } from '@/shared/models/ai_task';
import { getRemainingCredits } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';
import { ColoringPageStatus } from '@/shared/models/coloring_page';

/**
 * Extract image URLs from task info for R2 upload
 */
function extractImageUrlsFromTaskInfo(taskInfo: any): string[] {
  if (!taskInfo) return [];

  const images = taskInfo.images ?? taskInfo.output ?? taskInfo.data;
  if (!images) return [];

  if (typeof images === 'string') return [images];

  if (Array.isArray(images)) {
    return images
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object') {
          return item.url ?? item.uri ?? item.image ?? item.src ?? item.imageUrl;
        }
        return null;
      })
      .filter(Boolean) as string[];
  }

  if (typeof images === 'object') {
    const url = images.url ?? images.uri ?? images.image ?? images.src ?? images.imageUrl;
    return url ? [url] : [];
  }

  return [];
}

export async function POST(request: Request) {
  try {
    let { provider, mediaType, model, prompt, options, scene } =
      await request.json();

    if (!provider || !mediaType || !model) {
      throw new Error('invalid params');
    }

    // For image-to-image mode, prompt is optional (will use default prompt in provider)
    const isImageToImage = mediaType === AIMediaType.IMAGE && scene === 'image-to-image';
    const hasImageInput = options?.image_input && options.image_input.length > 0;

    if (!prompt && !isImageToImage) {
      throw new Error('prompt is required for text-to-image mode');
    }

    // For image-to-image mode without prompt, require image_input
    if (isImageToImage && !prompt && !hasImageInput) {
      throw new Error('prompt or reference image is required');
    }

    // Auth check FIRST — reject unauthenticated users immediately
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // ── Feature 2: Prompt Cache Check ──
    // For text-to-image, check if same prompt already has a cached result
    if (
      mediaType === AIMediaType.IMAGE &&
      scene === 'text-to-image' &&
      prompt
    ) {
      const cachedPage = await checkPromptCache(prompt);
      if (cachedPage) {
        // Return cached result — no credits consumed
        return respData({
          id: `cache-${cachedPage.id}`,
          status: AITaskStatus.SUCCESS,
          cached: true,
          coloringPage: {
            id: cachedPage.id,
            slug: cachedPage.slug,
            title: cachedPage.title,
            category: cachedPage.category,
            imageUrl: cachedPage.imageUrl,
          },
          taskInfo: JSON.stringify({
            images: [{ imageUrl: cachedPage.imageUrl }],
          }),
        });
      }
    }

    const aiService = await getAIService();

    // check generate type
    if (!aiService.getMediaTypes().includes(mediaType)) {
      throw new Error('invalid mediaType');
    }

    // check ai provider
    const aiProvider = aiService.getProvider(provider);
    if (!aiProvider) {
      throw new Error('invalid provider');
    }

    // todo: get cost credits from settings
    let costCredits = 2;

    if (mediaType === AIMediaType.IMAGE) {
      // generate image
      if (scene === 'image-to-image') {
        costCredits = 4;
      } else if (scene === 'text-to-image') {
        costCredits = 2;
      } else {
        throw new Error('invalid scene');
      }
    } else if (mediaType === AIMediaType.VIDEO) {
      // generate video
      if (scene === 'text-to-video') {
        costCredits = 6;
      } else if (scene === 'image-to-video') {
        costCredits = 8;
      } else if (scene === 'video-to-video') {
        costCredits = 10;
      } else {
        throw new Error('invalid scene');
      }
    } else if (mediaType === AIMediaType.MUSIC) {
      // generate music
      costCredits = 10;
      scene = 'text-to-music';
    } else {
      throw new Error('invalid mediaType');
    }

    // check credits
    const remainingCredits = await getRemainingCredits(user.id);
    if (remainingCredits < costCredits) {
      throw new Error('insufficient credits');
    }

    const callbackUrl = `${envConfigs.app_url}/api/ai/notify/${provider}`;

    const params: any = {
      mediaType,
      model,
      prompt,
      callbackUrl,
      options,
    };

    // generate content
    let result;
    try {
      result = await aiProvider.generate({ params });
    } catch (genError: any) {
      console.error('AI generation error:', genError.message);
      throw new Error(genError.message || 'Image generation failed');
    }

    if (!result?.taskId) {
      throw new Error(
        `ai generate failed, mediaType: ${mediaType}, provider: ${provider}, model: ${model}`
      );
    }

    // For synchronous providers that return SUCCESS immediately (e.g. Siliconflow),
    // verify that the result actually contains images before consuming credits.
    if (result.taskStatus === AITaskStatus.SUCCESS) {
      const hasImages = result.taskInfo?.images && result.taskInfo.images.length > 0
        && result.taskInfo.images.some((img: any) => img.imageUrl);
      if (!hasImages) {
        throw new Error('Generation completed but no images were returned');
      }
    }

    // create ai task (this also consumes credits in a transaction)
    const newAITask: NewAITask = {
      id: getUuid(),
      userId: user.id,
      mediaType,
      provider,
      model,
      prompt,
      scene,
      options: options ? JSON.stringify(options) : null,
      status: result.taskStatus,
      costCredits,
      taskId: result.taskId,
      taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
      taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
    };
    await createAITask(newAITask);

    // ── Feature 1 & 4: Upload to R2 + Auto-categorize (for sync providers) ──
    // If generation succeeded immediately (sync provider), upload to R2 and create coloring page
    let coloringPageData = null;
    if (
      result.taskStatus === AITaskStatus.SUCCESS &&
      mediaType === AIMediaType.IMAGE &&
      (scene === 'text-to-image' || scene === 'image-to-image')
    ) {
      const imageUrls = extractImageUrlsFromTaskInfo(result.taskInfo);
      if (imageUrls.length > 0) {
        try {
          // For image-to-image, use DRAFT status (private to user)
          // For text-to-image, use PUBLISHED status (public)
          const pageStatus = scene === 'image-to-image'
            ? ColoringPageStatus.DRAFT
            : ColoringPageStatus.PUBLISHED;

          // Use a default prompt for image-to-image if none provided
          const finalPrompt = prompt || 'coloring book page, white background';

          const pageResult = await createColoringPageFromGenerated({
            userId: user.id,
            prompt: finalPrompt,
            imageUrl: imageUrls[0],
            status: pageStatus,
            // Pass task ID as unique ID for image-to-image to avoid conflicts
            uniqueId: scene === 'image-to-image' ? newAITask.id : undefined,
          });
          if (pageResult.success && pageResult.coloringPage) {
            coloringPageData = {
              id: pageResult.coloringPage.id,
              slug: pageResult.coloringPage.slug,
              title: pageResult.coloringPage.title,
              category: pageResult.coloringPage.category,
              imageUrl: pageResult.coloringPage.imageUrl,
            };
          }
        } catch (e) {
          // Non-blocking: log but don't fail the generation
          console.error('[generate] Failed to create coloring page:', e);
        }
      }
    }

    return respData({
      ...newAITask,
      coloringPage: coloringPageData,
    });
  } catch (e: any) {
    console.log('generate failed', e);
    return respErr(e.message);
  }
}
