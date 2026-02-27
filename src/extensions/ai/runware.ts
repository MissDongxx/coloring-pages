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

export interface RunwareConfigs extends AIConfigs {
    apiKey: string;
    customStorage?: boolean;
}

export class RunwareProvider implements AIProvider {
    readonly name = 'runware';
    configs: RunwareConfigs;

    constructor(configs: RunwareConfigs) {
        this.configs = configs;
    }

    async generate({ params }: { params: AIGenerateParams }): Promise<AITaskResult> {
        const { mediaType, model, prompt, options } = params;

        if (mediaType !== AIMediaType.IMAGE) {
            throw new Error('Runware currently only supports IMAGE mediaType locally');
        }

        if (!model) {
            throw new Error('model is required');
        }

        const taskId = getUuid();

        let finalPrompt = prompt;
        let finalOptions = { ...options };

        // For image-to-image mode, always add the coloring page prompt
        const hasImageInput = options?.image_input && options.image_input.length > 0;
        if (hasImageInput) {
            const defaultPrompt = 'Coloring book page, black-and-white, simple design, easy to color. Plain white background.';
            // Append default prompt to user's prompt (if any)
            finalPrompt = finalPrompt ? `${finalPrompt}, ${defaultPrompt}` : defaultPrompt;
        }

        if (!finalPrompt) {
            throw new Error('prompt is required');
        }

        // Only add model-specific prompt for text-to-image mode (not image-to-image)
        if (model === 'runware:400@2' && !hasImageInput) {
            finalPrompt = `${finalPrompt}, classic style, white background coloring page, contrast black and white, thin thickness lines playful design`;
        }

        const MAX_RETRIES = 2;
        const RETRY_DELAY_MS = 2000;

        try {
            // Build request body based on mode
            const requestBodyItem: any = {
                taskType: 'imageInference',
                taskUUID: taskId,
                positivePrompt: finalPrompt,
                model: model,
                width: finalOptions?.width || 1024,
                height: finalOptions?.height || 1024,
                numberResults: 1,
                outputType: ['dataURI', 'URL'],
                CFGScale: 3.5,
                scheduler: 'FlowMatchEulerDiscreteScheduler',
                acceleration: 'high',
                outputQuality: 85,
                includeCost: true,
            };

            // For image-to-image mode, use inputs.referenceImages format
            if (hasImageInput && finalOptions?.image_input && finalOptions.image_input.length > 0) {
                requestBodyItem.inputs = {
                    referenceImages: finalOptions.image_input
                };
            }

            const requestBody = [requestBodyItem];

            console.log('Runware request:', JSON.stringify(requestBody, null, 2));

            let response: Response | null = null;
            let lastError = '';

            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                if (attempt > 0) {
                    console.log(`Runware retry attempt ${attempt}/${MAX_RETRIES} after ${RETRY_DELAY_MS}ms...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                }

                response = await fetch('https://api.runware.ai/v1', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.configs.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    break;
                }

                let errorMsg = response.statusText;
                try {
                    const body = await response.json();
                    errorMsg = body.error?.message || body.error || body.message || errorMsg;
                } catch (e) { }
                lastError = `Runware API error: ${response.status} ${errorMsg}`;
                console.error(lastError);

                if (response.status >= 500 && attempt < MAX_RETRIES) {
                    continue;
                }

                throw new Error(lastError);
            }

            if (!response || !response.ok) {
                throw new Error(lastError || 'Runware request failed');
            }

            const data = await response.json();
            console.log('Runware response:', JSON.stringify(data));

            let images: AIImage[] = [];

            const errors = data.data?.filter((item: any) => item.error === true);
            if (errors && errors.length > 0) {
                throw new Error(`Runware error: ${errors[0].errorMessage}`);
            }

            const results = data.data?.filter((item: any) => item.taskType === 'imageInference');

            if (results && results.length > 0) {
                images = results.map((item: any) => ({
                    id: getUuid(),
                    createTime: new Date(),
                    imageUrl: item.imageURL,
                }));
            } else {
                console.error('Runware returned no images. Response:', JSON.stringify(data));
                throw new Error('No image returned from Runware');
            }

            const validImages = images.filter(img => img.imageUrl && img.imageUrl.length > 0);
            if (validImages.length === 0) {
                console.error('Runware returned images but no valid URLs:', JSON.stringify(images));
                throw new Error('No valid image URL returned from Runware');
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
            console.error('Runware generation failed:', e.message);
            throw e;
        }
    }

    async query({ taskId }: { taskId: string }): Promise<AITaskResult> {
        return {
            taskId,
            taskStatus: AITaskStatus.SUCCESS,
            taskInfo: undefined,
            taskResult: undefined,
        };
    }
}
