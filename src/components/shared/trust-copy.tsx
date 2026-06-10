import type { CSSProperties } from "react";

export const TRUST_COPY = "Dati nel tuo workspace · Niente pubblicità";

export function TrustCopy({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p className={className} style={style}>
      {TRUST_COPY}
    </p>
  );
}
