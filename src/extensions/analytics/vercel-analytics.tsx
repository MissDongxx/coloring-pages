import { ReactNode } from 'react';

import { Analytics } from '@vercel/analytics/react';

import { AnalyticsConfigs, AnalyticsProvider } from '.';

/**
 * Vercel analytics configs
 * @docs https://vercel.com/analytics
 */
export interface VercelAnalyticsConfigs extends AnalyticsConfigs {
  mode?: 'auto' | 'production' | 'development'; // when to enable analytics
}

/**
 * Vercel analytics provider
 * @website https://vercel.com/analytics
 */
export class VercelAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'vercel-analytics';

  configs: VercelAnalyticsConfigs;

  constructor(configs: VercelAnalyticsConfigs = {}) {
    this.configs = configs;
  }

  shouldEnable(): boolean {
    const { mode = 'production' } = this.configs;
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';

    switch (mode) {
      case 'auto':
        return true;
      case 'production':
        return isProduction;
      case 'development':
        return isDevelopment;
      default:
        return true;
    }
  }

  getBodyScripts(): ReactNode {
    if (!this.shouldEnable()) {
      return null;
    }

    return <Analytics />;
  }
}
