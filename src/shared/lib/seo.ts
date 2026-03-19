import { getTranslations, setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale, locales } from '@/config/locale';
import { joinUrl } from './utils';

// get metadata for page component
export function getMetadata(
  options: {
    title?: string;
    description?: string;
    keywords?: string;
    metadataKey?: string;
    canonicalUrl?: string; // relative path or full url
    imageUrl?: string;
    appName?: string;
    noIndex?: boolean;
  } = {}
) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    setRequestLocale(locale);

    // passed metadata
    const passedMetadata = {
      title: options.title,
      description: options.description,
      keywords: options.keywords,
    };

    // default metadata
    const defaultMetadata = await getTranslatedMetadata(
      defaultMetadataKey,
      locale
    );

    // translated metadata
    let translatedMetadata: any = {};
    if (options.metadataKey) {
      translatedMetadata = await getTranslatedMetadata(
        options.metadataKey,
        locale
      );
    }

    // canonical url
    const canonicalUrl = await getCanonicalUrl(
      options.canonicalUrl || '',
      locale || ''
    );

    const title =
      passedMetadata.title || translatedMetadata.title || defaultMetadata.title;
    const description =
      passedMetadata.description ||
      translatedMetadata.description ||
      defaultMetadata.description;

    // image url
    let imageUrl = options.imageUrl || envConfigs.app_preview_image;
    if (!imageUrl.startsWith('http')) {
      imageUrl = joinUrl(envConfigs.app_url, imageUrl);
    }

    // app name
    let appName = options.appName;
    if (!appName) {
      appName = envConfigs.app_name || '';
    }

    // Build hreflang links for all locales
    const urlPath = (options.canonicalUrl || '').replace(/^\/+/, '');
    const languages: Record<string, string> = {};

    // Add x-default (points to default locale version)
    const defaultLocaleUrl = joinUrl(envConfigs.app_url, urlPath);
    languages['x-default'] = defaultLocaleUrl;

    // Add all locale versions
    for (const locale of locales) {
      const localeUrl =
        locale === defaultLocale
          ? joinUrl(envConfigs.app_url, urlPath)
          : joinUrl(envConfigs.app_url, locale, urlPath);
      languages[locale] = localeUrl;
    }

    return {
      title:
        passedMetadata.title ||
        translatedMetadata.title ||
        defaultMetadata.title,
      description:
        passedMetadata.description ||
        translatedMetadata.description ||
        defaultMetadata.description,
      keywords:
        passedMetadata.keywords ||
        translatedMetadata.keywords ||
        defaultMetadata.keywords,
      alternates: {
        canonical: canonicalUrl,
        languages: languages,
      },

      openGraph: {
        type: 'website',
        locale: locale,
        url: canonicalUrl,
        title,
        description,
        siteName: appName,
        images: [imageUrl.toString()],
      },

      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl.toString()],
        site: envConfigs.app_url,
      },

      robots: {
        index: options.noIndex ? false : true,
        follow: options.noIndex ? false : true,
      },
    };
  };
}

const defaultMetadataKey = 'common.metadata';

async function getTranslatedMetadata(metadataKey: string, locale: string) {
  setRequestLocale(locale);
  const t = await getTranslations(metadataKey);

  return {
    title: t.has('title') ? t('title') : '',
    description: t.has('description') ? t('description') : '',
    keywords: t.has('keywords') ? t('keywords') : '',
  };
}

async function getCanonicalUrl(canonicalUrl: string, locale: string) {
  // Remove leading slash from canonicalUrl to avoid double slashes
  const urlPath = (canonicalUrl || '/').replace(/^\/+/, '');
  const localePart = !locale || locale === defaultLocale ? '' : locale;

  let finalUrl = joinUrl(envConfigs.app_url, localePart, urlPath);

  if (locale !== defaultLocale && finalUrl.endsWith('/')) {
    finalUrl = finalUrl.slice(0, -1);
  }

  return finalUrl;
}

// Helper function to generate hreflang languages object
// Can be used by pages that have their own generateMetadata function
export function getHreflangLanguages(urlPath: string = ''): Record<string, string> {
  const languages: Record<string, string> = {};
  const cleanPath = urlPath.replace(/^\/+/, '');

  // Add x-default (points to default locale version)
  const defaultLocaleUrl = joinUrl(envConfigs.app_url, cleanPath);
  languages['x-default'] = defaultLocaleUrl;

  // Add all locale versions
  for (const locale of locales) {
    const localeUrl =
      locale === defaultLocale
        ? joinUrl(envConfigs.app_url, cleanPath)
        : joinUrl(envConfigs.app_url, locale, cleanPath);
    languages[locale] = localeUrl;
  }

  return languages;
}
