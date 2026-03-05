import { betterAuth, BetterAuthOptions } from 'better-auth';

import { getAllConfigs } from '@/shared/models/config';

import { getAuthOptions } from './config';

// Cache auth instance to avoid repeated initialization
let authInstanceCache: ReturnType<typeof betterAuth> | null = null;
let authCacheTime = 0;
const AUTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// get auth instance in server side
export async function getAuth() {
  const now = Date.now();

  // Return cached instance if still valid
  if (authInstanceCache && now - authCacheTime < AUTH_CACHE_TTL) {
    return authInstanceCache;
  }

  // get configs from db and env
  const configs = await getAllConfigs();

  const authOptions = await getAuthOptions(configs);

  authInstanceCache = betterAuth(authOptions as BetterAuthOptions);
  authCacheTime = now;

  return authInstanceCache;
}
