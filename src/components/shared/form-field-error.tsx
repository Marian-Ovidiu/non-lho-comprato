export function FormFieldError({
  message,
  className = "mt-2 text-sm",
  id,
}: {
  message?: string;
  className?: string;
  id?: string;
}) {
  if (!message) {
    return null;
  }

  return <p id={id} className={`${className} text-destructive`}>{message}</p>;
}
