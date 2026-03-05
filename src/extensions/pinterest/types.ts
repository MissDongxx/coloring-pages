/**
 * Pinterest API extension types
 */

export interface PinterestConfigs {
    appId: string;
    appSecret: string;
    refreshToken: string;
}

export interface PinterestTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

export interface CreatePinParams {
    boardId: string;
    title: string;
    description: string;
    link: string;
    imageUrl: string;
}

export interface PinResponse {
    id: string;
    created_at?: string;
    link?: string;
    title?: string;
    description?: string;
}
