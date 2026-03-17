import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely joins a base URL and path segments, ensuring exactly one slash between them.
 */
export function joinUrl(base: string, ...paths: string[]): string {
  let url = base.replace(/\/+$/, '');
  for (const path of paths) {
    if (path) {
      url += '/' + path.replace(/^\/+/, '');
    }
  }
  return url;
}
