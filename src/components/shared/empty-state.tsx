import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  action?: ReactNode;
  icon?: ReactNode;
  note?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  action,
  icon,
  note,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed bg-surface/80 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 sm:p-5.5">
        <div className="flex items-start gap-3.5">
          {icon ? (
            <div className="rounded-2xl bg-surface-muted p-2 text-foreground">
              {icon}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {title}
            </h3>
            <p className="max-w-lg text-sm leading-6 text-muted-text">
              {description}
            </p>
            {note ? <p className="text-xs text-muted-text">{note}</p> : null}
          </div>
        </div>

        {action ? (
          action
        ) : actionLabel && actionHref ? (
          <Button asChild className="w-full sm:w-auto">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
