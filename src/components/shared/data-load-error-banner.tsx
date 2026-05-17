type DataLoadErrorBannerProps = {
  title: string;
  message: string;
};

export function DataLoadErrorBanner({ title, message }: DataLoadErrorBannerProps) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
    >
      <p className="font-medium text-destructive">{title}</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
    </section>
  );
}
