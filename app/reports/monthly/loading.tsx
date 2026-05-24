import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="space-y-5 sm:space-y-6">
      <section className="rounded-3xl border border-border/70 bg-surface/70 p-3.5 shadow-sm sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-7 w-44 rounded-lg" />
            <Skeleton className="h-4 w-full max-w-[32rem] rounded-lg" />
          </div>
          <Skeleton className="h-10 w-40 rounded-2xl" />
        </div>
      </section>

      <section className="space-y-4">
        <Card className="border-border shadow-sm dark:border-border">
          <CardHeader className="space-y-2 p-4 pb-3 sm:p-5">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0 sm:p-5">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="border-border shadow-sm dark:border-border">
                  <CardHeader className="space-y-2 p-4 pb-3 sm:p-5" />
                  <CardContent className="space-y-3 p-4 pt-0 sm:p-5">
                    <Skeleton className="h-6 w-28 rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-2xl" />
                    <Skeleton className="h-10 w-full rounded-2xl" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Skeleton className="h-72 w-full rounded-3xl" />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
