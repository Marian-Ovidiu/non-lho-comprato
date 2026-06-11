"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

import { useCountUp } from "./use-count-up";

type CraftedOdometerProps = {
  value: number;
  className?: string;
  integerClassName?: string;
  fractionWrapperClassName?: string;
  fractionClassName?: string;
  suffixClassName?: string;
  suffix?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  duration?: number;
  startOnMount?: boolean;
};

function formatParts(
  value: number,
  minimumFractionDigits: number,
  maximumFractionDigits: number,
) {
  const formatter = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits,
    maximumFractionDigits,
  });
  const formatted = formatter.format(Math.abs(value));
  const [integerPart = "0", fractionPart = ""] = formatted.split(",");

  return {
    formatted,
    integerPart,
    fractionPart,
    isNegative: value < 0,
  };
}

function OdometerCharacter({ char }: { char: string }) {
  if (!/\d/.test(char)) {
    return (
      <span className="inline-block min-w-[0.32em] text-center" aria-hidden="true">
        {char}
      </span>
    );
  }

  const digit = Number(char);

  return (
    <span
      className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-bottom"
      aria-hidden="true"
    >
      <span
        className="nlc-odo-column absolute left-0 top-0 flex flex-col"
        style={{ transform: `translateY(-${digit * 10}%)` }}
      >
        {Array.from({ length: 10 }, (_, index) => (
          <span key={index} className="block h-[1em] leading-[1em]">
            {index}
          </span>
        ))}
      </span>
    </span>
  );
}

function OdometerText({ value }: { value: string }) {
  return (
    <>
      {value.split("").map((char, index) => (
        <OdometerCharacter key={index} char={char} />
      ))}
    </>
  );
}

export function CraftedOdometer({
  value,
  className,
  integerClassName,
  fractionWrapperClassName,
  fractionClassName,
  suffixClassName,
  suffix = "€",
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
  duration,
  startOnMount,
}: CraftedOdometerProps) {
  const displayValue = useCountUp(value, {
    duration,
    precision: maximumFractionDigits,
    startOnMount,
  });
  const parts = useMemo(
    () => formatParts(displayValue, minimumFractionDigits, maximumFractionDigits),
    [displayValue, maximumFractionDigits, minimumFractionDigits],
  );
  const accessibleValue = `${parts.isNegative ? "-" : ""}${parts.formatted}${suffix}`;

  return (
    <span
      className={cn(
        "relative inline-flex items-start gap-1.5 overflow-hidden font-num",
        className,
      )}
      aria-label={accessibleValue}
    >
      <span className="sr-only">{accessibleValue}</span>
      <span
        className={cn("inline-flex leading-none", integerClassName)}
        aria-hidden="true"
      >
        {parts.isNegative ? <span className="mr-1">-</span> : null}
        <OdometerText value={parts.integerPart} />
      </span>
      {(parts.fractionPart || suffix) ? (
        <span
          className={cn("inline-flex items-baseline gap-0", fractionWrapperClassName)}
          aria-hidden="true"
        >
          {parts.fractionPart ? (
            <span className={cn("inline-flex", fractionClassName)}>
              ,<OdometerText value={parts.fractionPart} />
            </span>
          ) : null}
          {suffix ? (
            <span className={cn("inline-flex", suffixClassName)}>{suffix}</span>
          ) : null}
        </span>
      ) : null}
      <span key={parts.formatted} className="nlc-odo-shine go" aria-hidden="true" />
    </span>
  );
}
