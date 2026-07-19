import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "div" | "article";
  children: ReactNode;
}

export function GlassCard({
  as: Tag = "section",
  className,
  children,
  ...rest
}: GlassCardProps) {
  return (
    <Tag
      className={cn(
        "glass-panel rounded-[2rem] p-6 md:p-8 transition-all duration-300",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
