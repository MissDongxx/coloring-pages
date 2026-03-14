/**
 * Pinterest API extension types
 */

export interface PinterestConfigs {
    appId: string;
    appSecret: string;
    refreshToken: string;
    accessToken?: string; // Optional static token for sandbox/unauthenticated testing
}

export interface PinterestTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    refresh_token?: string; // Pinterest rotates refresh tokens
    refresh_token_expires_at?: number;
    refresh_token_expires_in?: number;
}

export interface CreatePinParams {
    boardId: string;
    title: string;
    description: string;
    link: string;
    imageUrl: string;
    altText?: string;
}

export interface BoardResponse {
    id: string;
    name: string;
    description?: string;
    privacy: 'PUBLIC' | 'PROTECTED' | 'SECRET';
}

export interface PinResponse {
    id: string;
    created_at?: string;
    link?: string;
    title?: string;
    description?: string;
}
