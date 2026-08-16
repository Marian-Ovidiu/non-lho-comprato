-- Saldi ed entrate.
--
-- Il saldo non e' una tabella nuova: e' due colonne su una riga che esiste
-- gia'. WorkspaceMember tiene una riga per persona per spazio, quindi uno
-- spazio privato ha un membro e un saldo, uno condiviso ne ha due; il conto
-- comune appartiene allo spazio, non a una persona, e sta su Workspace.
--
-- Tutte nullable di proposito: il saldo e' facoltativo. Chi non lo imposta
-- non deve trovarsi un numero inventato, e i 1360 movimenti gia' registrati
-- non devono cambiare significato.
ALTER TABLE "WorkspaceMember"
  ADD COLUMN "balanceStart" DECIMAL(12,2),
  ADD COLUMN "balanceStartDate" TIMESTAMP(3);

ALTER TABLE "Workspace"
  ADD COLUMN "jointBalanceStart" DECIMAL(12,2),
  ADD COLUMN "jointBalanceStartDate" TIMESTAMP(3);

-- Le entrate stanno fuori da Entry: nessuna delle query esistenti le vede,
-- quindi nessun calcolo gia' scritto cambia comportamento.
CREATE TABLE "Income" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "receivedByUserId" TEXT,
  "createdByUserId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Income_workspaceId_date_idx" ON "Income"("workspaceId", "date");
CREATE INDEX "Income_receivedByUserId_idx" ON "Income"("receivedByUserId");
CREATE INDEX "Income_createdByUserId_idx" ON "Income"("createdByUserId");

ALTER TABLE "Income" ADD CONSTRAINT "Income_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Income" ADD CONSTRAINT "Income_receivedByUserId_fkey"
  FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Income" ADD CONSTRAINT "Income_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
