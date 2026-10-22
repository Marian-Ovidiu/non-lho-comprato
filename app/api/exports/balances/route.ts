import type { NextRequest } from "next/server";

import { getCurrentUser, getCurrentWorkspace } from "@/src/lib/auth/session";
import {
  BALANCE_LEDGER_COLUMNS,
  buildBalanceLedger,
  type BalanceLedgerAccount,
} from "@/src/features/balances/ledger";
import {
  balanceMovementDetailKey,
  loadBalanceSources,
} from "@/src/features/balances/load";
import { splitBalanceMovements } from "@/src/features/balances/split";
import { csvLine } from "@/src/lib/csv";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIpFromHeaders,
} from "@/src/lib/rate-limit";
import { getCurrentWorkspaceMembers } from "@/src/lib/workspace-context";
import { getTodayDateKey } from "@/src/lib/workspace-dates";

export async function GET(request: NextRequest) {
  let workspace: Awaited<ReturnType<typeof getCurrentWorkspace>>;
  let user: Awaited<ReturnType<typeof getCurrentUser>>;

  try {
    [workspace, user] = await Promise.all([
      getCurrentWorkspace(),
      getCurrentUser(),
    ]);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const clientIp = getClientIpFromHeaders(request.headers);
  const hourlyLimit = await checkRateLimit(
    {
      scope: "export:balances:hour",
      limit: 5,
      windowSeconds: 60 * 60,
    },
    [workspace.id, user.id, clientIp],
  );

  if (!hourlyLimit.allowed) {
    return createRateLimitResponse(hourlyLimit);
  }

  const timeZone = workspace.timezone ?? "Europe/Rome";
  const [members, sources] = await Promise.all([
    getCurrentWorkspaceMembers(),
    loadBalanceSources(workspace.id, user.id, timeZone, { withDetails: true }),
  ]);

  const splitFor = (userId: string) =>
    splitBalanceMovements(
      sources.entries,
      sources.incomes,
      sources.transfers,
      sources.settlements,
      userId,
    );

  const mine = splitFor(user.id);
  const myLabel =
    members.find((member) => member.userId === user.id)?.label ?? "Io";
  const accounts: BalanceLedgerAccount[] = [
    {
      label: myLabel,
      start: sources.personalStart,
      incoming: mine.personalIn,
      outgoing: mine.personalOut,
    },
  ];

  if (members.length > 1) {
    accounts.push({
      label: "Conto comune",
      start: sources.jointStart,
      incoming: mine.jointIn,
      outgoing: mine.jointOut,
    });

    /* Gli altri conti personali: i movimenti si', il saldo no. Il loader non
       ha nemmeno letto il loro saldo di partenza. */
    for (const member of members) {
      if (member.userId === user.id) continue;

      const theirs = splitFor(member.userId);
      accounts.push({
        label: member.label,
        start: null,
        incoming: theirs.personalIn,
        outgoing: theirs.personalOut,
      });
    }
  }

  const rows = buildBalanceLedger(
    accounts,
    (ref) => sources.details.get(balanceMovementDetailKey(ref)) ?? null,
  );

  const body =
    `${BALANCE_LEDGER_COLUMNS.join(",")}\n` +
    rows
      .map((row) => csvLine(BALANCE_LEDGER_COLUMNS.map((column) => row[column])))
      .join("");
  const filename = `nlc-saldi-${getTodayDateKey(timeZone)}.csv`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
