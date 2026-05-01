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
    <Card className="border-dashed bg-white/80">
      <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {icon ? (
            <div className="rounded-2xl bg-zinc-100 p-2.5 text-zinc-700">
              {icon}
            </div>
          ) : null}

          <div className="space-y-2">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
              {title}
            </h3>
            <p className="max-w-xl text-sm leading-6 text-zinc-600">
              {description}
            </p>
            {note ? <p className="text-xs text-zinc-500">{note}</p> : null}
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
