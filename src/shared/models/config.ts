import { revalidateTag, unstable_cache } from 'next/cache';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import { config } from '@/config/db/schema';
import {
  getAllSettingNames,
  publicSettingNames,
} from '@/shared/services/settings';

export type Config = typeof config.$inferSelect;
export type NewConfig = typeof config.$inferInsert;
export type UpdateConfig = Partial<Omit<NewConfig, 'name'>>;

export type Configs = Record<string, string>;

export const CACHE_TAG_CONFIGS = 'configs';

// Memory cache for getAllConfigs to avoid repeated database calls
let configsMemoryCache: Configs | null = null;
let configsCacheTime = 0;
const CONFIGS_MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export async function saveConfigs(configs: Record<string, string>) {
  const result = await db().transaction(async (tx: any) => {
    const configEntries = Object.entries(configs);
    const results: any[] = [];

    for (const [name, configValue] of configEntries) {
      const [upsertResult] = await tx
        .insert(config)
        .values({ name, value: configValue })
        .onConflictDoUpdate({
          target: config.name,
          set: { value: configValue },
        })
        .returning();

      results.push(upsertResult);
    }

    return results;
  });

  if (process.env.NEXT_RUNTIME) {
    try {
      revalidateTag(CACHE_TAG_CONFIGS, 'max');
    } catch (e) {
      // Silently fail in non-Next environments
    }
  }
  // Clear memory cache when configs are saved
  configsMemoryCache = null;

  return result;
}

export async function addConfig(newConfig: NewConfig) {
  const [result] = await db().insert(config).values(newConfig).returning();
  revalidateTag(CACHE_TAG_CONFIGS, 'max');
  // Clear memory cache when config is added
  configsMemoryCache = null;

  return result;
}

export const getConfigs = unstable_cache(
  async (): Promise<Configs> => {
    const configs: Record<string, string> = {};

    if (!envConfigs.database_url) {
      return configs;
    }

    const result = await db().select().from(config);
    if (!result) {
      return configs;
    }

    for (const config of result) {
      configs[config.name] = config.value ?? '';
    }

    return configs;
  },
  ['configs'],
  {
    revalidate: 3600,
    tags: [CACHE_TAG_CONFIGS],
  }
);

export async function getAllConfigs(): Promise<Configs> {
  const now = Date.now();

  // Return cached configs if still valid
  if (configsMemoryCache && now - configsCacheTime < CONFIGS_MEMORY_CACHE_TTL) {
    return configsMemoryCache;
  }

  let dbConfigs: Configs = {};

  // only get configs from db in server side
  if (typeof window === 'undefined' && envConfigs.database_url) {
    try {
      dbConfigs = await getConfigs();
    } catch (e) {
      console.log(`get configs from db failed:`, e);
      dbConfigs = {};
    }
  }

  const settingNames = await getAllSettingNames();
  settingNames.forEach((key) => {
    const upperKey = key.toUpperCase();
    // use env configs if available
    if (process.env[upperKey]) {
      dbConfigs[key] = process.env[upperKey] ?? '';
    } else if (process.env[key]) {
      dbConfigs[key] = process.env[key] ?? '';
    }
  });

  const configs = {
    ...envConfigs,
    ...dbConfigs,
  };

  // Update memory cache
  configsMemoryCache = configs;
  configsCacheTime = now;

  return configs;
}

export async function getPublicConfigs(): Promise<Configs> {
  let allConfigs = await getAllConfigs();

  const publicConfigs: Record<string, string> = {};

  // get public configs
  for (const key in allConfigs) {
    if (publicSettingNames.includes(key)) {
      publicConfigs[key] = String(allConfigs[key]);
    }
  }

  const configs = {
    ...publicConfigs,
  };

  return configs;
}
