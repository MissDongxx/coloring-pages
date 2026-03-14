/**
 * Pinterest API Provider
 */

import { envConfigs } from '@/config';
import type { PinterestConfigs, PinterestTokenResponse, CreatePinParams, PinResponse, BoardResponse } from './types';

export class PinterestProvider {
    configs: PinterestConfigs;
    private accessToken: string | null = null;
    // Store the current refresh token (it rotates when we refresh)
    private currentRefreshToken: string;
    // Store expiration time to avoid 401s when possible
    private tokenExpiresAt: number = 0;
    private baseUrl: string;
    // Callback to persist rotated tokens
    private onTokenRefresh?: (tokens: { accessToken: string; refreshToken?: string; expiresIn?: number }) => Promise<void>;

    constructor(configs: PinterestConfigs, useSandbox: boolean = false, onTokenRefresh?: (tokens: { accessToken: string; refreshToken?: string; expiresIn?: number }) => Promise<void>) {
        this.configs = configs;
        this.currentRefreshToken = configs.refreshToken;
        this.baseUrl = useSandbox ? 'https://api-sandbox.pinterest.com/v5' : 'https://api.pinterest.com/v5';
        this.onTokenRefresh = onTokenRefresh;

        // If a static access token is provided, use it
        if (this.configs.accessToken) {
            this.accessToken = this.configs.accessToken;
            // Initially, we treat it as valid but we'll handle 401s if it's already expired
            this.tokenExpiresAt = Date.now() + 1000 * 60 * 60; // Assume 1 hour default
        }
    }

    /**
     * Internal helper to make API calls with automatic token refresh and retry on 401.
     */
    private async callApi<T>(path: string, options: RequestInit = {}): Promise<T> {
        // Ensure we have an active token before attempting
        if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
            await this.refreshAccessToken();
        }

        const makeRequest = async () => {
            const url = path.startsWith('http') ? path : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
            return fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    Authorization: `Bearer ${this.accessToken}`,
                },
            });
        };

        let response = await makeRequest();

        // If 401, refresh token and retry ONCE
        if (response.status === 401) {
            console.warn(`⚠️ Pinterest API returned 401. Attempting token refresh and retry... Path: ${path}`);
            await this.refreshAccessToken();
            response = await makeRequest();
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Pinterest API Error (${response.status}): ${errorText}`);
        }

        return (await response.json()) as T;
    }

    /**
     * Refresh the access token using the stored refresh token.
     * Pinterest rotates refresh tokens, so we update it when we get a new one.
     */
    async refreshAccessToken(): Promise<string> {
        console.log('🔄 Pinterest: Refreshing access token...');
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
                refresh_token: this.currentRefreshToken,
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

        let newRefreshToken: string | undefined;
        // Pinterest rotates refresh tokens - update the stored one
        if (data.refresh_token) {
            this.currentRefreshToken = data.refresh_token;
            newRefreshToken = data.refresh_token;
            console.log('✅ Pinterest: Refresh token rotated successfully');
        }

        // Trigger persistence callback if provided
        if (this.onTokenRefresh) {
            await this.onTokenRefresh({
                accessToken: this.accessToken,
                refreshToken: newRefreshToken,
                expiresIn: data.expires_in,
            }).catch(err => console.error('❌ Pinterest: Failed to persist refreshed tokens:', err));
        }

        return this.accessToken;
    }

    /**
     * Get all boards for the authenticated user.
     */
    async getBoards(): Promise<BoardResponse[]> {
        const data = await this.callApi<{ items: BoardResponse[] }>('/boards');
        return data.items;
    }

    /**
     * Create a new board.
     */
    async createBoard(name: string, description: string = ''): Promise<BoardResponse> {
        return this.callApi<BoardResponse>('/boards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                description: description,
                privacy: 'PUBLIC',
            }),
        });
    }

    /**
     * Find a board by name or create it if it doesn't exist.
     */
    async getOrCreateBoardByName(name: string): Promise<string> {
        let boards = await this.getBoards();
        let existingBoard = boards.find(b => b.name.toLowerCase() === name.toLowerCase());

        if (existingBoard) {
            return existingBoard.id;
        }

        try {
            const newBoard = await this.createBoard(name, `Coloring pages about ${name}`);
            return newBoard.id;
        } catch (error: any) {
            // Error code 58 means "Board already exists"
            if (error.message.includes('"code":58') || error.message.includes('already have a board')) {
                console.log(`⏳ 看板 "${name}" 已存在但未在列表中显示。正在等待同步并重试...`);
                await new Promise(resolve => setTimeout(resolve, 3000));

                boards = await this.getBoards();
                existingBoard = boards.find(b => b.name.toLowerCase() === name.toLowerCase());

                if (existingBoard) {
                    return existingBoard.id;
                }
            }
            throw error;
        }
    }

    /**
     * Create a new pin on a specified board.
     */
    async createPin(params: CreatePinParams): Promise<PinResponse> {
        return this.callApi<PinResponse>('/pins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    }
}

export function createPinterestProvider(
    configs: PinterestConfigs, 
    useSandbox: boolean = false,
    onTokenRefresh?: (tokens: { accessToken: string; refreshToken?: string; expiresIn?: number }) => Promise<void>
): PinterestProvider {
    return new PinterestProvider(configs, useSandbox, onTokenRefresh);
}
