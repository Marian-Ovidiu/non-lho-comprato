"use client";

import { createElement, useEffect, useState } from "react";
import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementType,
  ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type RevealProps<T extends ElementType> = {
  as?: T;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className" | "style">;

export function Reveal<T extends ElementType = "div">({
  as,
  delay = 0,
  className,
  style,
  children,
  ...rest
}: RevealProps<T>) {
  const [isIn, setIsIn] = useState(false);
  const Tag = (as ?? "div") as ElementType;

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setIsIn(true));
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return createElement(
    Tag,
    {
      className: cn("nlc-reveal", isIn && "is-in", className),
      style: {
        transitionDelay: isIn && delay > 0 ? `${delay}ms` : undefined,
        ...style,
      },
      ...rest,
    },
    children,
  );
}
