/**
 * Formazione dello spazio condiviso a partire da un invito.
 *
 * Un invito nasce dallo spazio privato di chi invita, perché al momento in cui
 * si manda il link non esiste ancora niente da condividere. Lo spazio comune
 * viene creato quando l'altra persona accetta: prima sarebbe uno spazio vuoto
 * in attesa di qualcuno che potrebbe non arrivare mai — ed è esattamente il
 * caso che i dati mostrano essere il più frequente.
 *
 * Senza questo passaggio chi accetta finirebbe dentro lo spazio privato
 * dell'invitante, che resta di tipo "privato" e conserva il nome del
 * proprietario: entrambi si ritroverebbero in uno spazio marcato Privato,
 * intestato all'indirizzo di chi ha invitato, e chi invita non avrebbe due
 * spazi tra cui passare.
 */

const MAX_WORKSPACE_NAME_LENGTH = 80;

/** Dal nome completo o dall'indirizzo tiene solo la parte che si usa parlando. */
export function toShortPersonLabel(
  name: string | null | undefined,
  email: string | null | undefined,
): string | null {
  const fromName = name?.trim();
  if (fromName) {
    return fromName.split(/\s+/u)[0] ?? null;
  }

  const fromEmail = email?.trim();
  if (fromEmail) {
    const local = fromEmail.split("@")[0]?.trim();
    return local ? local : null;
  }

  return null;
}

export function buildSharedWorkspaceName(
  inviter: { name?: string | null; email?: string | null },
  accepter: { name?: string | null; email?: string | null },
  fallback = "Spazio condiviso",
): string {
  const first = toShortPersonLabel(inviter.name, inviter.email);
  const second = toShortPersonLabel(accepter.name, accepter.email);

  if (!first || !second) {
    return fallback;
  }

  const name = `${first} e ${second}`;
  return name.length > MAX_WORKSPACE_NAME_LENGTH
    ? name.slice(0, MAX_WORKSPACE_NAME_LENGTH)
    : name;
}

type PairingTx = {
  workspace: {
    create: (args: {
      data: { name: string; kind: "shared"; ownerUserId: string };
    }) => Promise<{ id: string; name: string; kind: string }>;
  };
  workspaceMember: {
    create: (args: {
      data: {
        workspaceId: string;
        userId: string;
        role: "owner" | "member";
        lastSelectedAt?: Date;
      };
    }) => Promise<unknown>;
  };
  workspaceInvite: {
    update: (args: {
      where: { id: string };
      data: { workspaceId: string };
    }) => Promise<unknown>;
  };
};

export type InviteTargetWorkspace = {
  id: string;
  name: string;
  kind: string;
  /** Vero se l'accettazione ha appena formato la coppia. */
  created: boolean;
};

/**
 * Restituisce lo spazio in cui far entrare chi accetta, creandolo se l'invito
 * punta ancora a uno spazio privato.
 *
 * L'invito viene poi ripuntato sul nuovo spazio: un link aperto vale piu' di
 * un utilizzo, e dal secondo in poi le persone devono entrare nello stesso
 * spazio condiviso invece di formarne uno nuovo ogni volta.
 */
export async function resolveInviteTargetWorkspace(
  tx: PairingTx,
  input: {
    inviteId: string;
    workspace: { id: string; name: string; kind: string; ownerUserId?: string | null };
    inviter: { id: string | null; name?: string | null; email?: string | null };
    accepter: { id: string; name?: string | null; email?: string | null };
    now: Date;
  },
): Promise<InviteTargetWorkspace> {
  if (input.workspace.kind === "shared") {
    return {
      id: input.workspace.id,
      name: input.workspace.name,
      kind: input.workspace.kind,
      created: false,
    };
  }

  const ownerUserId = input.inviter.id ?? input.workspace.ownerUserId;

  if (!ownerUserId) {
    // Senza un proprietario non c'è coppia da formare: si lascia l'invito
    // dov'è invece di creare uno spazio orfano.
    return {
      id: input.workspace.id,
      name: input.workspace.name,
      kind: input.workspace.kind,
      created: false,
    };
  }

  const shared = await tx.workspace.create({
    data: {
      name: buildSharedWorkspaceName(input.inviter, input.accepter),
      kind: "shared",
      ownerUserId,
    },
  });

  await tx.workspaceMember.create({
    data: {
      workspaceId: shared.id,
      userId: ownerUserId,
      role: "owner",
      lastSelectedAt: input.now,
    },
  });

  await tx.workspaceInvite.update({
    where: { id: input.inviteId },
    data: { workspaceId: shared.id },
  });

  return { id: shared.id, name: shared.name, kind: shared.kind, created: true };
}
