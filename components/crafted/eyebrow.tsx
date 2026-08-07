import { cn } from "@/lib/utils";

import { Label } from "./label";

/**
 * Etichetta di sezione: stessa Label dell'app, ma con la variante
 * `.nlc-eyebrow` — corpo 11px, tracking più stretto e colore un gradino sopra,
 * perché il maiuscoletto originale non reggeva né su vetro né in cima a una
 * colonna di movimenti. La tinta si cambia via `--eyebrow-ink`, non con le
 * utility di testo: la regola sta fuori dai layer e vincerebbe comunque.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <Label className={cn("nlc-eyebrow", className)}>{children}</Label>;
}
