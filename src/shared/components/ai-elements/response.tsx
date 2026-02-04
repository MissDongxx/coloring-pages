"use client";

import dynamic from "next/dynamic";
import { cn } from "@/shared/lib/utils";
import { type ComponentProps, memo } from "react";

// 动态导入 Streamdown 以减少初始 bundle 大小
const Streamdown = dynamic(
  () => import("streamdown").then((mod) => mod.Streamdown),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse h-4 bg-muted rounded" />
  }
);

type ResponseProps = {
  className?: string;
  children?: string | null;
  [key: string]: any;
};

export const Response = memo(
  ({ className, children, ...props }: ResponseProps) => {
    const StreamdownComponent = Streamdown as any;
    return (
      <StreamdownComponent
        className={cn(
          "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          className
        )}
        {...props}
      >
        {children}
      </StreamdownComponent>
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";