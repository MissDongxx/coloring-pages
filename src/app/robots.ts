import { MetadataRoute } from 'next';

import { envConfigs } from '@/config';

export default function robots(): MetadataRoute.Robots {
  const appUrl = envConfigs.app_url;

  // Remove trailing slash to avoid double slashes
  const baseUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/*?*q=',
        '/settings/*',
        '/activity/*',
        '/admin/*',
        '/api/*',
      ],
    },
    sitemap: `${baseUrl}/sitemap`,
  };
}

