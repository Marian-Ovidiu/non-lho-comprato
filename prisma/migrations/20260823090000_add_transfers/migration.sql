-- Trasferimenti fra un conto personale e il cointestato.
--
-- Serve perche' finora il conto comune poteva solo svuotarsi: le spese
-- cointestate ne uscivano, ma niente ci entrava. L'entrata sul comune non e'
-- la risposta giusta -- i soldi non arrivano da fuori, li versa una persona,
-- e devono uscire dal suo saldo -- quindi il movimento e' un giroconto.
--
-- Non sostituisce WorkspaceSettlement: quello pareggia un debito fra due
-- persone ed e' vincolato alla differenza. Questo muove la cifra che vuoi,
-- fra un conto personale e il comune, nelle due direzioni.
--
-- Nessuna colonna con il segno: l'importo e' sempre positivo e il verso lo
-- dice "direction". Un importo negativo con direction 'to_joint' sarebbe lo
-- stesso movimento di uno positivo con 'to_personal', e due modi di scrivere
-- la stessa cosa prima o poi divergono.
CREATE TYPE "TransferDirection" AS ENUM ('to_joint', 'to_personal');

CREATE TABLE "Transfer" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT,
  "direction" "TransferDirection" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Transfer_workspaceId_date_idx" ON "Transfer"("workspaceId", "date");
CREATE INDEX "Transfer_userId_idx" ON "Transfer"("userId");
CREATE INDEX "Transfer_createdByUserId_idx" ON "Transfer"("createdByUserId");

ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Income.receivedByUserId cambia significato, non forma.
--
-- Finora NULL voleva dire "entrata sul conto comune". Da ora il comune non
-- riceve entrate, quindi NULL torna a voler dire solo quello che vuol dire il
-- vincolo ON DELETE SET NULL qui sotto: la persona non e' piu' nello spazio.
-- La colonna resta nullable per quel vincolo, non per rappresentare il comune.
--
-- Nessun backfill: al momento di questa migrazione la tabella Income e' vuota,
-- quindi non esiste una sola riga scritta con il vecchio significato.
COMMENT ON COLUMN "Income"."receivedByUserId" IS
  'Chi ha incassato. NULL = persona non piu'' nello spazio, non conto comune.';
