"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Check, Loader2, Share2 } from "lucide-react";

import { Serif } from "@/components/crafted";
import { NlcMark } from "@/src/components/brand/nlc-mark";
import { completeWorkspaceSetupAction, generateOpenInviteAction } from "@/src/actions/workspace";
import { useTranslations } from "@/src/components/language/language-context";
import { cn } from "@/lib/utils";

type CraftedOnboardingScreenProps = {
  defaultTimezone: string;
  defaultCurrency: string;
  defaultLanguage: string;
  /** Un workspace condiviso ha gia' un partner: il passo invito si salta. */
  canInvite: boolean;
};

const TOTAL_STEPS = 3;

function StepDots({ current }: { current: number }) {
  return (
    <div className="mt-6 flex justify-center gap-1.5" aria-hidden="true">
      {Array.from({ length: TOTAL_STEPS }, (_, index) => (
        <span
          key={index}
          className={cn(
            "size-1.5 rounded-full transition-colors",
            index === current ? "bg-accent" : "bg-accent/25",
          )}
        />
      ))}
    </div>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15.5px] font-bold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex h-11 w-full items-center justify-center text-[14px] font-medium text-ink-3 transition-colors hover:text-foreground"
    >
      {children}
    </button>
  );
}

/**
 * Ingresso di una persona nuova. Tre passi, in quest'ordine:
 *
 * 1. cosa fa l'app — prima non veniva mai detto;
 * 2. l'invito al partner — e' il punto in cui il prodotto diventa quello che
 *    promette, e va offerto presto perche' l'altra persona ci mette del tempo
 *    ad accettare;
 * 3. il primo movimento — vale piu' di qualunque spiegazione.
 *
 * Fuso, valuta e lingua non vengono chiesti: hanno default sensati e il fuso
 * si rileva dal browser. Chiedere impostazioni prima di aver mostrato qualcosa
 * e' chiedere di pagare prima di aver visto il prodotto.
 */
export function CraftedOnboardingScreen({
  defaultTimezone,
  defaultCurrency,
  defaultLanguage,
  canInvite,
}: CraftedOnboardingScreenProps) {
  const t = useTranslations();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invitePending, startInvite] = useTransition();
  const [leaving, startLeaving] = useTransition();

  function finish(destination: string) {
    startLeaving(async () => {
      // Il setup viene chiuso qui con i default rilevati, così la home non
      // accoglie chi arriva con un modulo di preferenze.
      const formData = new FormData();
      formData.set(
        "timezone",
        Intl.DateTimeFormat().resolvedOptions().timeZone || defaultTimezone,
      );
      formData.set("currency", defaultCurrency);
      formData.set("language", defaultLanguage);

      const result = await completeWorkspaceSetupAction(formData);

      if (!result.success) {
        // Un fuso non riconosciuto non deve bloccare l'ingresso: si riprova
        // con quello del workspace, che è sempre valido.
        formData.set("timezone", defaultTimezone);
        await completeWorkspaceSetupAction(formData);
      }

      router.push(destination);
    });
  }

  function handleInvite() {
    startInvite(async () => {
      setInviteError(null);
      const result = await generateOpenInviteAction();

      if (!result.success || !result.inviteUrl) {
        setInviteError(result.message);
        return;
      }

      setInviteUrl(result.inviteUrl);

      if (navigator.share) {
        try {
          await navigator.share({
            title: t.onboarding.inviteShareTitle,
            url: result.inviteUrl,
          });
        } catch {
          // condivisione annullata: il link resta a schermo
        }
      } else if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(result.inviteUrl);
        } catch {
          // alcuni browser negano la scrittura senza permesso esplicito
        }
      }
    });
  }

  const steps = [
    <div key="value">
      <Serif className="text-[clamp(1.75rem,8vw,2.25rem)] leading-snug text-foreground">
        {t.onboarding.valueTitle}
      </Serif>
      <p className="mt-4 max-w-[340px] text-[15px] leading-relaxed text-ink-3">
        {t.onboarding.valueLede}
      </p>
      <ul className="mt-6 space-y-3">
        {[
          t.onboarding.valuePointOne,
          t.onboarding.valuePointTwo,
          t.onboarding.valuePointThree,
        ].map((point) => (
          <li key={point} className="flex items-start gap-3">
            <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
            <span className="text-[14.5px] leading-snug text-muted-foreground">{point}</span>
          </li>
        ))}
      </ul>
    </div>,

    <div key="invite">
      <Serif className="text-[clamp(1.75rem,8vw,2.25rem)] leading-snug text-foreground">
        {t.onboarding.inviteTitle}
      </Serif>
      <p className="mt-4 max-w-[340px] text-[15px] leading-relaxed text-ink-3">
        {t.onboarding.inviteLede}
      </p>
      {inviteUrl ? (
        <div className="mt-6 rounded-[var(--r-control)] border border-line bg-surface-muted px-3 py-3">
          <p className="text-[13px] font-medium text-foreground">
            {t.onboarding.inviteCopied}
          </p>
          <p className="mt-1 break-all text-[11px] leading-4 text-ink-3">{inviteUrl}</p>
        </div>
      ) : null}
      {inviteError ? (
        <p className="mt-4 text-[13px] text-destructive" role="alert">
          {inviteError}
        </p>
      ) : null}
    </div>,

    <div key="first-entry">
      <Serif className="text-[clamp(1.75rem,8vw,2.25rem)] leading-snug text-foreground">
        {t.onboarding.firstEntryTitle}
      </Serif>
      <p className="mt-4 max-w-[340px] text-[15px] leading-relaxed text-ink-3">
        {t.onboarding.firstEntryLede}
      </p>
    </div>,
  ];

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background px-6 pb-8 pt-10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <NlcMark size={20} />
          <span className="text-[13px] font-semibold tracking-[0.02em] text-muted-foreground">
            Non l&apos;ho comprato
          </span>
        </div>
        <span className="text-[11px] tracking-[0.05em] text-ink-3">
          {t.onboarding.stepLabel(step + 1, TOTAL_STEPS)}
        </span>
      </div>

      <div className="mb-8 mt-auto">{steps[step]}</div>

      {step === 0 ? (
        <PrimaryButton onClick={() => setStep(canInvite ? 1 : 2)}>
          {t.onboarding.valueContinue}
          <ArrowRight className="size-4" aria-hidden="true" />
        </PrimaryButton>
      ) : null}

      {step === 1 ? (
        <>
          {inviteUrl ? (
            <PrimaryButton onClick={() => setStep(2)}>
              {t.onboarding.inviteContinue}
              <ArrowRight className="size-4" aria-hidden="true" />
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={handleInvite} disabled={invitePending}>
              {invitePending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {t.onboarding.inviteGenerating}
                </>
              ) : (
                <>
                  <Share2 className="size-4" aria-hidden="true" />
                  {t.onboarding.inviteButton}
                </>
              )}
            </PrimaryButton>
          )}
          <SecondaryButton onClick={() => setStep(2)}>
            {t.onboarding.inviteSkip}
          </SecondaryButton>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <PrimaryButton
            onClick={() => finish("/entries/new?returnTo=%2F%3Fwelcome%3D1")}
            disabled={leaving}
          >
            {leaving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {t.onboarding.firstEntryButton}
          </PrimaryButton>
          <SecondaryButton onClick={() => finish("/?welcome=1")}>
            {t.onboarding.firstEntrySkip}
          </SecondaryButton>
        </>
      ) : null}

      <StepDots current={step} />
    </main>
  );
}
