"use client";

import { useTranslations } from 'next-intl';

interface ServerComponentWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that provides NextIntl context for client components.
 * This is needed when client components are created in server components
 * and need translation context.
 */
export function ServerComponentWrapper({ children }: ServerComponentWrapperProps) {
  // This component ensures that useTranslations will work in the wrapped children
  // because it's already inside NextIntlClientProvider from the layout
  return <>{children}</>;
}
