/**
 * Pinterest API Provider
 */

import { envConfigs } from '@/config';
import type { PinterestConfigs, PinterestTokenResponse, CreatePinParams, PinResponse, BoardResponse } from './types';

// Callback type for persisting rotated tokens
export type TokenPersistenceCallback = (tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}) => Promise<void> | void;

export class PinterestProvider {
    configs: PinterestConfigs;
    private accessToken: string | null = null;
    // Store the current refresh token (it rotates when we refresh)
    private currentRefreshToken: string;
    // Store expiration time to avoid 401s when possible
    private tokenExpiresAt: number = 0;
    private baseUrl: string;
    // Callback to persist rotated tokens
    private onTokenRefresh?: TokenPersistenceCallback;

    constructor(configs: PinterestConfigs, useSandbox: boolean = false, onTokenRefresh?: TokenPersistenceCallback) {
        this.configs = configs;
        this.currentRefreshToken = configs.refreshToken;
        this.baseUrl = useSandbox ? 'https://api-sandbox.pinterest.com/v5' : 'https://api.pinterest.com/v5';
        this.onTokenRefresh = onTokenRefresh;

        // If a static access token is provided (e.g. for sandbox), use it directly
        if (this.configs.accessToken) {
            this.accessToken = this.configs.accessToken;
            this.tokenExpiresAt = Date.now() + 1000 * 60 * 60 * 24 * 365; // Assume 1 year for static token
        }
    }

    /**
     * Refresh the access token using the stored refresh token.
     * Pinterest rotates refresh tokens, so we update it when we get a new one.
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

        // Pinterest rotates refresh tokens - update the stored one
        if (data.refresh_token) {
            this.currentRefreshToken = data.refresh_token;
            console.log('Pinterest refresh token rotated successfully');

            // Persist the rotated tokens to storage via callback
            if (this.onTokenRefresh) {
                try {
                    await this.onTokenRefresh({
                        accessToken: this.accessToken,
                        refreshToken: this.currentRefreshToken,
                        expiresAt: this.tokenExpiresAt,
                    });
                    console.log('Pinterest tokens persisted successfully');
                } catch (error: any) {
                    console.error('Failed to persist Pinterest tokens:', error);
                    // Don't throw - the token rotation succeeded, just persistence failed
                }
            }
        }

        return this.accessToken;
    }

    /**
     * Get all boards for the authenticated user.
     */
    async getBoards(): Promise<BoardResponse[]> {
        if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
            await this.refreshAccessToken();
        }

        const response = await fetch(`${this.baseUrl}/boards`, {
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch Pinterest boards: ${response.status} - ${errorText}`);
        }

        const data = await response.json() as { items: BoardResponse[] };
        return data.items;
    }

    /**
     * Create a new board.
     */
    async createBoard(name: string, description: string = ''): Promise<BoardResponse> {
        if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
            await this.refreshAccessToken();
        }

        const response = await fetch(`${this.baseUrl}/boards`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                description: description,
                privacy: 'PUBLIC',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create Pinterest board "${name}": ${response.status} - ${errorText}`);
        }

        return await response.json() as BoardResponse;
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
            // If it exists but wasn't in the list, it's likely due to API latency or a cached/synced view.
            if (error.message.includes('"code":58') || error.message.includes('already have a board')) {
                console.log(`⏳ 看板 "${name}" 已存在但未在列表中显示。正在等待同步并重试...`);
                // Wait for a few seconds and try fetching the list again
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
        if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
            await this.refreshAccessToken();
        }

        const response = await fetch(`${this.baseUrl}/pins`, {
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
        const response = await fetch(`${this.baseUrl}/pins`, {
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

export function createPinterestProvider(onTokenRefresh?: TokenPersistenceCallback): PinterestProvider {
    return new PinterestProvider({
        appId: envConfigs.pinterest_app_id,
        appSecret: envConfigs.pinterest_app_secret,
        refreshToken: envConfigs.pinterest_refresh_token,
        accessToken: process.env.PINTEREST_SANDBOX_TOKEN || process.env.PINTEREST_ACCESS_TOKEN,
    }, process.env.PINTEREST_USE_SANDBOX === 'true', onTokenRefresh);
}
