export function FormFieldError({
  message,
  className = "mt-2 text-sm",
}: {
  message?: string;
  className?: string;
}) {
  if (!message) {
    return null;
  }

  return <p className={`${className} text-destructive`}>{message}</p>;
}
