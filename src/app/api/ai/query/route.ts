import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import { createColoringPageFromGenerated } from '@/shared/lib/coloring-helper';
import { respData, respErr } from '@/shared/lib/resp';
import {
  findAITaskById,
  UpdateAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';

/**
 * Extract image URLs from task info
 */
function extractImageUrlsFromTaskInfo(taskInfoStr: string | null): string[] {
  if (!taskInfoStr) return [];
  try {
    const taskInfo = JSON.parse(taskInfoStr);
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
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const { taskId } = await req.json();
    if (!taskId) {
      return respErr('invalid params');
    }

    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const task = await findAITaskById(taskId);
    if (!task || !task.taskId) {
      return respErr('task not found');
    }

    if (task.userId !== user.id) {
      return respErr('no permission');
    }

    const aiService = await getAIService();
    const aiProvider = aiService.getProvider(task.provider);
    if (!aiProvider) {
      return respErr('invalid ai provider');
    }

    const result = await aiProvider?.query?.({
      taskId: task.taskId,
      mediaType: task.mediaType,
      model: task.model,
    });

    if (!result?.taskStatus) {
      return respErr('query ai task failed');
    }

    // update ai task — only overwrite taskInfo/taskResult if the provider returned new data
    // Synchronous providers (like Siliconflow) return undefined taskInfo/taskResult from query()
    // because the real data was already stored during generate(). We must not overwrite it.
    const updateAITask: UpdateAITask = {
      status: result.taskStatus,
      creditId: task.creditId, // credit consumption record id
    };

    // Only update taskInfo if the provider returned actual new data
    if (result.taskInfo !== undefined && result.taskInfo !== null) {
      updateAITask.taskInfo = JSON.stringify(result.taskInfo);
    }
    // Only update taskResult if the provider returned actual new data
    if (result.taskResult !== undefined && result.taskResult !== null) {
      updateAITask.taskResult = JSON.stringify(result.taskResult);
    }

    const hasTaskInfoChanged = updateAITask.taskInfo !== undefined && updateAITask.taskInfo !== task.taskInfo;
    const hasStatusChanged = updateAITask.status !== task.status;
    if (hasTaskInfoChanged || hasStatusChanged) {
      await updateAITaskById(task.id, updateAITask);
    }

    task.status = updateAITask.status || task.status || '';
    task.taskInfo = updateAITask.taskInfo ?? task.taskInfo ?? null;
    task.taskResult = updateAITask.taskResult ?? task.taskResult ?? null;

    // ── Feature 1 & 4: Upload to R2 + Create coloring page for async providers ──
    // When task completes successfully, upload image to R2 and create coloring page
    let coloringPageData = null;
    if (
      result.taskStatus === AITaskStatus.SUCCESS &&
      task.mediaType === 'image' &&
      task.scene === 'text-to-image' &&
      task.prompt
    ) {
      const taskInfoStr = updateAITask.taskInfo ?? task.taskInfo;
      const imageUrls = extractImageUrlsFromTaskInfo(taskInfoStr);

      if (imageUrls.length > 0) {
        try {
          const pageResult = await createColoringPageFromGenerated({
            userId: task.userId,
            prompt: task.prompt,
            imageUrl: imageUrls[0],
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
          // Non-blocking
          console.error('[query] Failed to create coloring page:', e);
        }
      }
    }

    return respData({
      ...task,
      coloringPage: coloringPageData,
    });
  } catch (e: any) {
    console.log('ai query failed', e);
    return respErr(e.message);
  }
}
