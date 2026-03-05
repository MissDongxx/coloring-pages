/**
 * Pinterest API Provider
 */

import { envConfigs } from '@/config';
import type { PinterestConfigs, PinterestTokenResponse, CreatePinParams, PinResponse } from './types';

export class PinterestProvider {
    configs: PinterestConfigs;
    private accessToken: string | null = null;
    // Store expiration time to avoid 401s when possible
    private tokenExpiresAt: number = 0;

    constructor(configs: PinterestConfigs) {
        this.configs = configs;
    }

    /**
     * Refresh the access token using the stored refresh token.
     */
    async refreshAccessToken(): Promise<string> {
        const authString = Buffer.from(
            `${this.configs.appId}:${this.configs.appSecret}`
        ).toString('base64');

        const response = await fetch('https://api.pinterest.com/v5/oauth/token', {
            method: 'POST',
            headers: {
                Authorization: `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: this.configs.refreshToken,
            }).toString(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to refresh Pinterest token: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = (await response.json()) as PinterestTokenResponse;
        this.accessToken = data.access_token;
        // Buffer the expiration time by 60 seconds to be safe
        this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

        return this.accessToken;
    }

    /**
     * Create a new pin on a specified board.
     */
    async createPin(params: CreatePinParams): Promise<PinResponse> {
        if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
            await this.refreshAccessToken();
        }

        const response = await fetch('https://api.pinterest.com/v5/pins', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                board_id: params.boardId,
                title: params.title,
                description: params.description,
                link: params.link,
                media_source: {
                    source_type: 'image_url',
                    url: params.imageUrl,
                },
            }),
        });

        if (!response.ok) {
            // If unauthorized, token might have expired. Try to refresh and retry once.
            if (response.status === 401) {
                await this.refreshAccessToken();
                return this.retryCreatePin(params);
            }
            const errorText = await response.text();
            throw new Error(`Failed to create Pinterest pin: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return (await response.json()) as PinResponse;
    }

    private async retryCreatePin(params: CreatePinParams): Promise<PinResponse> {
        const response = await fetch('https://api.pinterest.com/v5/pins', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                board_id: params.boardId,
                title: params.title,
                description: params.description,
                link: params.link,
                media_source: {
                    source_type: 'image_url',
                    url: params.imageUrl,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create Pinterest pin on retry: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return (await response.json()) as PinResponse;
    }
}

export function createPinterestProvider(): PinterestProvider {
    return new PinterestProvider({
        appId: envConfigs.pinterest_app_id,
        appSecret: envConfigs.pinterest_app_secret,
        refreshToken: envConfigs.pinterest_refresh_token,
    });
}
