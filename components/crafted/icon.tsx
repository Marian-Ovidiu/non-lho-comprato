import {
  ArrowUp,
  Bike,
  Camera,
  Check,
  Cigarette,
  Coffee,
  Delete,
  GraduationCap,
  Home,
  Martini,
  PiggyBank,
  Plane,
  Receipt,
  Search,
  Shield,
  ShoppingBag,
  Target,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type CraftedIconName =
  | "coffee"
  | "bag"
  | "fork"
  | "bike"
  | "camera"
  | "flame"
  | "graduation"
  | "home"
  | "piggy"
  | "target"
  | "arrowUp"
  | "plane"
  | "shield"
  | "glass"
  | "search"
  | "receipt"
  | "check"
  | "cig"
  | "del";

type CraftedIconProps = {
  name: CraftedIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

const LUCIDE_MAP: Record<
  Exclude<CraftedIconName, "flame">,
  LucideIcon
> = {
  coffee: Coffee,
  bag: ShoppingBag,
  fork: Utensils,
  bike: Bike,
  camera: Camera,
  graduation: GraduationCap,
  home: Home,
  piggy: PiggyBank,
  target: Target,
  arrowUp: ArrowUp,
  plane: Plane,
  shield: Shield,
  glass: Martini,
  search: Search,
  receipt: Receipt,
  check: Check,
  cig: Cigarette,
  del: Delete,
};

function CraftedFlameIcon({
  size,
  strokeWidth,
  className,
}: {
  size: number;
  strokeWidth: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.6c.4 2.4 2.9 3.6 2.9 6.6A4.9 4.9 0 0 1 12 13.7a4.9 4.9 0 0 1-2.9-4.5c0-.2 0-.5.1-.8.5.7 1.1 1 1.7 1.1-.5-1.9.3-3.8 1.1-6.9Z" />
      <path d="M8.4 13a5.6 5.6 0 1 0 7.2 0" />
    </svg>
  );
}

export function CraftedIcon({
  name,
  size = 22,
  strokeWidth = 1.6,
  className,
}: CraftedIconProps) {
  if (name === "flame") {
    return (
      <CraftedFlameIcon
        size={size}
        strokeWidth={strokeWidth}
        className={cn("shrink-0 text-current", className)}
      />
    );
  }

  const LucideComponent = LUCIDE_MAP[name];

  return (
    <LucideComponent
      size={size}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    />
  );
}
