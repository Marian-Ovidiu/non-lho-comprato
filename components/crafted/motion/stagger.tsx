"use client";

import { Children, createElement } from "react";
import type {
  ComponentPropsWithoutRef,
  ElementType,
  ReactNode,
} from "react";

import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";

type StaggerProps<T extends ElementType> = {
  as?: T;
  className?: string;
  itemClassName?: string;
  staggerMs?: number;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function Stagger<T extends ElementType = "div">({
  as,
  className,
  itemClassName,
  staggerMs = 46,
  children,
  ...rest
}: StaggerProps<T>) {
  const Tag = (as ?? "div") as ElementType;

  return createElement(
    Tag,
    {
      className,
      ...rest,
    },
    Children.toArray(children).map((child, index) => (
      <Reveal
        key={index}
        delay={index * staggerMs}
        className={cn(itemClassName)}
      >
        {child}
      </Reveal>
    )),
  );
}
