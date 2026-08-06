/**
 * Chi può uscire da uno spazio e chi può eliminarlo.
 *
 * Uscire non tocca i dati: i movimenti restano nello spazio, che continua a
 * esistere per chi ci resta. È la differenza tra andarsene e cancellare, e
 * tenerle separate evita che qualcuno faccia sparire la contabilità di due
 * persone credendo di sfilarsi.
 */

export type WorkspaceMembershipPolicyDecision =
  | { allowed: true }
  | { allowed: false; message: string };

export type LeaveWorkspaceInput = {
  workspaceKind: "private" | "shared";
  isMember: boolean;
  memberCount: number;
};

export type DeleteWorkspaceInput = {
  workspaceKind: "private" | "shared";
  isMember: boolean;
  memberCount: number;
  actorUserId: string;
  workspaceOwnerUserId: string | null;
};

export function canLeaveWorkspace({
  workspaceKind,
  isMember,
  memberCount,
}: LeaveWorkspaceInput): WorkspaceMembershipPolicyDecision {
  if (!isMember) {
    return { allowed: false, message: "Non fai parte di questo spazio." };
  }

  // Lo spazio privato è il posto dove si finisce comunque: uscirne lascerebbe
  // la persona senza nessuno spazio e i suoi movimenti senza proprietario.
  if (workspaceKind === "private") {
    return {
      allowed: false,
      message: "Dal tuo spazio personale non si esce: è quello che resta sempre tuo.",
    };
  }

  if (memberCount <= 1) {
    return {
      allowed: false,
      message: "Sei l'unica persona rimasta: qui puoi solo eliminare lo spazio.",
    };
  }

  return { allowed: true };
}

export function canDeleteWorkspace({
  workspaceKind,
  isMember,
  memberCount,
  actorUserId,
  workspaceOwnerUserId,
}: DeleteWorkspaceInput): WorkspaceMembershipPolicyDecision {
  if (!isMember) {
    return { allowed: false, message: "Non fai parte di questo spazio." };
  }

  if (workspaceKind === "private") {
    return {
      allowed: false,
      message:
        "Lo spazio personale si elimina solo cancellando l'account.",
    };
  }

  // Restato da solo, chi c'è decide: non c'è nessun altro da tutelare.
  if (memberCount <= 1) {
    return { allowed: true };
  }

  if (actorUserId !== workspaceOwnerUserId) {
    return {
      allowed: false,
      message:
        "Con più persone dentro, solo chi ha creato lo spazio può eliminarlo. Puoi uscirne.",
    };
  }

  return { allowed: true };
}
