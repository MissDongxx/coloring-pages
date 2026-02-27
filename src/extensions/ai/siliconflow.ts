import { getUuid } from '@/shared/lib/hash';
import { saveFiles } from '.';
import {
  AIConfigs,
  AIFile,
  AIGenerateParams,
  AIImage,
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
} from './types';

export interface SiliconflowConfigs extends AIConfigs {
  apiKey: string;
  customStorage?: boolean;
}

export class SiliconflowProvider implements AIProvider {
  readonly name = 'siliconflow';
  configs: SiliconflowConfigs;

  constructor(configs: SiliconflowConfigs) {
    this.configs = configs;
  }

  async generate({ params }: { params: AIGenerateParams }): Promise<AITaskResult> {
    const { mediaType, model, prompt, options } = params;

    if (mediaType !== AIMediaType.IMAGE) {
      throw new Error('Siliconflow currently only supports IMAGE mediaType locally');
    }

    if (!model) {
      throw new Error('model is required');
    }

    if (!prompt) {
      throw new Error('prompt is required');
    }

    const taskId = getUuid();

    let finalPrompt = prompt;
    let finalOptions = { ...options };

    if (model === 'Tongyi-MAI/Z-Image-Turbo') {
      finalPrompt = `${prompt},classic style, white background coloring page, contrast black and white, thin thickness lines playful design`;
    }

    // As SiliconFlow is typically synchronous for images, we just call the API directly and return success if it works.
    // Retry up to 2 times for transient 500 errors.
    const MAX_RETRIES = 2;
    const RETRY_DELAY_MS = 2000;

    try {
      const requestBody = {
        model,
        prompt: finalPrompt,
        image_size: finalOptions?.image_size || '1024x1024',
        num_inference_steps: finalOptions?.num_inference_steps || 20,
        batch_size: 1,
        ...finalOptions
      };
      console.log('Siliconflow request:', JSON.stringify(requestBody));
      console.log('Siliconflow API Key (masked):', this.configs.apiKey ? `${this.configs.apiKey.substring(0, 6)}...${this.configs.apiKey.substring(this.configs.apiKey.length - 4)}` : 'NOT SET');

      let response: Response | null = null;
      let lastError = '';

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          console.log(`Siliconflow retry attempt ${attempt}/${MAX_RETRIES} after ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }

        response = await fetch('https://api.siliconflow.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.configs.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          break; // Success
        }

        // Parse error
        let errorMsg = response.statusText;
        try {
          const body = await response.json();
          errorMsg = body.error?.message || body.error || body.message || errorMsg;
        } catch (e) { }
        lastError = `Siliconflow API error: ${response.status} ${errorMsg}`;
        console.error(lastError);

        // Only retry on 500/502/503/504 errors
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          continue;
        }

        throw new Error(lastError);
      }

      if (!response || !response.ok) {
        throw new Error(lastError || 'Siliconflow request failed');
      }

      const data = await response.json();
      console.log('Siliconflow response:', JSON.stringify(data));

      let images: AIImage[] = [];
      if (data.images && data.images.length > 0) {
        images = data.images.map((img: any) => ({
          id: getUuid(),
          createTime: new Date(),
          imageUrl: img.url,
        }));
      } else if (data.data && data.data.length > 0) {
        // Handle OpenAI format
        images = data.data.map((img: any) => ({
          id: getUuid(),
          createTime: new Date(),
          imageUrl: img.url,
        }));
      } else {
        console.error('Siliconflow returned no images. Response:', JSON.stringify(data));
        throw new Error('No image returned from Siliconflow');
      }

      // Verify at least one image has a valid URL
      const validImages = images.filter(img => img.imageUrl && img.imageUrl.length > 0);
      if (validImages.length === 0) {
        console.error('Siliconflow returned images but no valid URLs:', JSON.stringify(images));
        throw new Error('No valid image URL returned from Siliconflow');
      }

      return {
        taskStatus: AITaskStatus.SUCCESS,
        taskId,
        taskInfo: {
          images,
          status: AITaskStatus.SUCCESS,
          createTime: new Date(),
        },
        taskResult: JSON.stringify(data)
      };
    } catch (e: any) {
      console.error('Siliconflow generation failed:', e.message);
      throw e;
    }
  }

  // Siliconflow is synchronous — results are returned directly from generate().
  // query() should not be called, but if it is, we should not overwrite the stored data.
  // Return undefined to signal that the caller should use the stored task data.
  async query({ taskId }: { taskId: string }): Promise<AITaskResult> {
    // Return the previous status without any taskInfo/taskResult
    // so the query route will not overwrite the stored data
    return {
      taskId,
      taskStatus: AITaskStatus.SUCCESS,
      taskInfo: undefined,
      taskResult: undefined,
    };
  }
}
