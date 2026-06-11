"use client";

import { createElement } from "react";
import type {
  ComponentPropsWithoutRef,
  ElementType,
  MouseEvent,
  ReactNode,
} from "react";

import { cn } from "@/lib/utils";
import { triggerHaptic, type HapticPreset } from "@/src/lib/haptics";

type PressableProps<T extends ElementType> = {
  as?: T;
  haptic?: HapticPreset | null;
  className?: string;
  children?: ReactNode;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "as" | "children" | "className" | "onClick"
>;

export function Pressable<T extends ElementType = "button">({
  as,
  haptic = "subtle",
  className,
  onClick,
  children,
  ...rest
}: PressableProps<T>) {
  const Tag = (as ?? "button") as ElementType;

  function handleClick(event: MouseEvent<HTMLElement>) {
    if (haptic) {
      triggerHaptic(haptic);
    }

    if (onClick) {
      (onClick as (event: MouseEvent<HTMLElement>) => void)(event);
    }
  }

  return createElement(
    Tag,
    {
      className: cn("nlc-press", className),
      onClick: handleClick,
      ...rest,
    },
    children,
  );
}
