import { Serif } from "@/components/crafted";

type CraftedInviteMessageProps = {
  title: string;
  context?: string;
  message: string;
};

export function CraftedInviteMessage({ title, context, message }: CraftedInviteMessageProps) {
  return (
    <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
      <h1 className="text-[clamp(1.75rem,8vw,2.25rem)] font-semibold tracking-[-0.03em]">
        {title}
      </h1>
      {context ? (
        <Serif className="mt-3 block max-w-lg text-sm leading-6 text-muted-foreground">
          {context}
        </Serif>
      ) : null}
      <p className="mt-5 border-y border-line py-4 text-sm leading-6 text-ink-3">{message}</p>
    </section>
  );
}
