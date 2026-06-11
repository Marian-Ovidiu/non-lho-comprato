"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CraftedIcon } from "@/components/crafted";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/src/lib/haptics";

type PullToRefreshStatus = "idle" | "pulling" | "ready" | "refreshing" | "done" | "error";

type PullToRefreshProps = {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  className?: string;
  disabled?: boolean;
  threshold?: number;
};

type GestureState = {
  crossedThreshold: boolean;
  dragging: boolean;
  pullDistance: number;
  startX: number;
  startY: number;
  tracking: boolean;
};

const MAX_PULL_DISTANCE = 96;
const REFRESHING_DISTANCE = 64;
const DEFAULT_THRESHOLD = 72;
const COMPLETE_RESET_DELAY_MS = 620;
const ERROR_RESET_DELAY_MS = 920;

function createIdleGesture(): GestureState {
  return {
    crossedThreshold: false,
    dragging: false,
    pullDistance: 0,
    startX: 0,
    startY: 0,
    tracking: false,
  };
}

function isWindowScrolledToTop() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const scrollTop = document.scrollingElement?.scrollTop ?? document.documentElement.scrollTop;
  return window.scrollY <= 1 && scrollTop <= 1;
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], [data-pull-refresh-ignore='true']",
    ),
  );
}

function getDampedDistance(distance: number) {
  return Math.min(MAX_PULL_DISTANCE, distance * 0.56);
}

export function PullToRefresh({
  children,
  onRefresh,
  className,
  disabled = false,
  threshold = DEFAULT_THRESHOLD,
}: PullToRefreshProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<GestureState>(createIdleGesture());
  const onRefreshRef = useRef(onRefresh);
  const disabledRef = useRef(disabled);
  const isRefreshingRef = useRef(false);
  const resetTimerRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [status, setStatus] = useState<PullToRefreshStatus>("idle");
  const isGestureActive =
    status === "pulling" || status === "ready" || status === "refreshing";
  const progress = Math.min(1, pullDistance / threshold);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const resetGesture = useCallback(() => {
    gestureRef.current = createIdleGesture();
    setPullDistance(0);
    setStatus("idle");
  }, []);

  const runRefresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    setPullDistance(REFRESHING_DISTANCE);
    setStatus("refreshing");
    triggerHaptic("success");

    let nextStatus: PullToRefreshStatus = "done";

    try {
      await onRefreshRef.current();
    } catch (error) {
      console.error("Pull-to-refresh failed:", error);
      nextStatus = "error";
    }

    setStatus(nextStatus);

    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = window.setTimeout(
      () => {
        resetTimerRef.current = null;
        isRefreshingRef.current = false;
        resetGesture();
      },
      nextStatus === "error" ? ERROR_RESET_DELAY_MS : COMPLETE_RESET_DELAY_MS,
    );
  }, [resetGesture]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    function handleTouchStart(event: TouchEvent) {
      if (
        disabledRef.current ||
        isRefreshingRef.current ||
        event.touches.length !== 1 ||
        isInteractiveTarget(event.target) ||
        !isWindowScrolledToTop()
      ) {
        gestureRef.current = createIdleGesture();
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      gestureRef.current = {
        crossedThreshold: false,
        dragging: false,
        pullDistance: 0,
        startX: touch.clientX,
        startY: touch.clientY,
        tracking: true,
      };
    }

    function handleTouchMove(event: TouchEvent) {
      const gesture = gestureRef.current;
      const touch = event.touches[0];

      if (!gesture.tracking || !touch || disabledRef.current || isRefreshingRef.current) {
        return;
      }

      const deltaY = touch.clientY - gesture.startY;
      const deltaX = Math.abs(touch.clientX - gesture.startX);

      if (!gesture.dragging && deltaX > Math.abs(deltaY) * 1.25) {
        gestureRef.current = createIdleGesture();
        return;
      }

      if (deltaY <= 3) {
        if (gesture.dragging) {
          setPullDistance(0);
          setStatus("idle");
        }
        return;
      }

      if (!gesture.dragging && !isWindowScrolledToTop()) {
        gestureRef.current = createIdleGesture();
        return;
      }

      event.preventDefault();

      const nextDistance = getDampedDistance(deltaY);
      const nextStatus = nextDistance >= threshold ? "ready" : "pulling";

      if (nextStatus === "ready" && !gesture.crossedThreshold) {
        triggerHaptic("light");
      }

      gesture.dragging = true;
      gesture.crossedThreshold = nextStatus === "ready";
      gesture.pullDistance = nextDistance;

      setPullDistance(nextDistance);
      setStatus(nextStatus);
    }

    function handleTouchEnd() {
      const gesture = gestureRef.current;

      if (!gesture.tracking) {
        return;
      }

      const shouldRefresh = gesture.dragging && gesture.pullDistance >= threshold;
      gestureRef.current = createIdleGesture();

      if (shouldRefresh) {
        void runRefresh();
        return;
      }

      resetGesture();
    }

    function handleTouchCancel() {
      resetGesture();
    }

    root.addEventListener("touchstart", handleTouchStart, { passive: true });
    root.addEventListener("touchmove", handleTouchMove, { passive: false });
    root.addEventListener("touchend", handleTouchEnd);
    root.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      root.removeEventListener("touchstart", handleTouchStart);
      root.removeEventListener("touchmove", handleTouchMove);
      root.removeEventListener("touchend", handleTouchEnd);
      root.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [resetGesture, runRefresh, threshold]);

  const label = useMemo(() => {
    if (status === "ready") {
      return "Rilascia per aggiornare";
    }

    if (status === "refreshing") {
      return "Aggiorno…";
    }

    if (status === "done") {
      return "Aggiornato";
    }

    if (status === "error") {
      return "Riprova tra poco";
    }

    return "Tira per aggiornare";
  }, [status]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div
        aria-hidden={!isGestureActive && status === "idle"}
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center",
          "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
        )}
        style={{
          opacity: pullDistance > 0 || status !== "idle" ? 1 : 0,
          transform: `translate3d(0, ${Math.max(-18, pullDistance - 58)}px, 0)`,
        }}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-2 text-xs font-semibold text-foreground shadow-[0_12px_32px_rgba(0,0,0,0.14)] backdrop-blur-xl">
          <span className="relative inline-flex size-7 items-center justify-center rounded-full bg-surface-muted text-accent">
            <span
              className="absolute inset-0 rounded-full border border-accent/30"
              style={{ transform: `scale(${0.72 + progress * 0.28})` }}
            />
            <span
              className={cn(
                "relative transition-transform duration-150 motion-reduce:transition-none",
                status === "refreshing" && "motion-safe:animate-pulse",
              )}
              style={{
                transform: `scale(${0.86 + progress * 0.18}) rotate(${
                  status === "ready" ? -7 : 0
                }deg)`,
              }}
            >
              <CraftedIcon name="flame" size={15} strokeWidth={1.8} />
            </span>
          </span>
          <span>{label}</span>
        </div>
      </div>

      <div
        className={cn(
          "will-change-transform",
          status === "pulling" || status === "ready"
            ? "transition-none"
            : "transition-transform duration-200 ease-out motion-reduce:transition-none",
        )}
        style={{ transform: `translate3d(0, ${pullDistance}px, 0)` }}
      >
        {children}
      </div>
    </div>
  );
}
