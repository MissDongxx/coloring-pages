import React from 'react';
import type { MDXComponents } from 'mdx/types';
import { cn } from '@/shared/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';

// Custom link component with nofollow for external links
const CustomLink = ({
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const isExternal = href?.startsWith('http') || href?.startsWith('//');

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="text-primary hover:underline"
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <a href={href} className="text-primary hover:underline" {...props}>
      {children}
    </a>
  );
};

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    a: CustomLink,
    img: (props: React.ComponentProps<'img'>) => {
      const { src } = props;
      const imageSrc =
        typeof src === 'object' && src !== null && 'src' in src
          ? (src as any).src
          : src;

      return (
        <img
          {...props}
          src={imageSrc}
          className={cn('rounded-lg border', props.className)}
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      );
    },
    h1: (props) => <h1 className="mt-2 scroll-m-20 text-4xl font-bold tracking-tight" {...props} />,
    h2: (props) => <h2 className="mt-10 scroll-m-20 border-b pb-1 text-3xl font-semibold tracking-tight first:mt-0" {...props} />,
    h3: (props) => <h3 className="mt-8 scroll-m-20 text-2xl font-semibold tracking-tight" {...props} />,
    h4: (props) => <h4 className="mt-8 scroll-m-20 text-xl font-semibold tracking-tight" {...props} />,
    p: (props) => <p className="leading-7 [&:not(:first-child)]:mt-6" {...props} />,
    ul: (props) => <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props} />,
    ol: (props) => <ol className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props} />,
    li: (props) => <li className="leading-7" {...props} />,
    blockquote: (props) => <blockquote className="mt-6 border-l-2 pl-6 italic" {...props} />,
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
    ...components,
  };
}

export const useMDXComponents = getMDXComponents;
