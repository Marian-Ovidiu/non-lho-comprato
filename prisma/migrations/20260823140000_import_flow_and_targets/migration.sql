-- Una riga importata puo' diventare tre cose, e sa da che parte vanno i soldi.
--
-- Il difetto da cui nasce questa migrazione: il parser conosce il segno
-- dell'importo, lo usa per decidere se la riga e' un addebito o un accredito,
-- e poi lo butta via -- l'importo finisce in tabella in valore assoluto
-- (Math.abs in import-mapping.ts). Da quel momento un accredito e un addebito
-- sono la stessa riga, e l'unica traccia era lo stato 'ignored', che pero'
-- significa anche "scartata a mano dall'utente".
--
-- La colonna "flow" registra il fatto invece di dimenticarlo.
CREATE TYPE "ImportedTransactionFlow" AS ENUM ('outgoing', 'incoming');

ALTER TABLE "ImportedTransaction"
  ADD COLUMN "flow" "ImportedTransactionFlow" NOT NULL DEFAULT 'outgoing';

-- Le 993 righe gia' in tabella sono tutte 'confirmed', cioe' sono gia'
-- diventate spese: 'outgoing' non e' un'ipotesi, e' quello che sono.

-- I tre bersagli. Una riga importata diventa una spesa, un'entrata o un
-- giroconto -- mai due insieme. Tre chiavi esterne vere invece di una coppia
-- (tipo, id) polimorfica: il resto dello schema tiene l'integrita' referenziale
-- ovunque, e una colonna che punta a "qualcosa" non si puo' verificare.
ALTER TABLE "ImportedTransaction"
  ADD COLUMN "incomeId" TEXT,
  ADD COLUMN "transferId" TEXT;

CREATE INDEX "ImportedTransaction_incomeId_idx" ON "ImportedTransaction"("incomeId");
CREATE INDEX "ImportedTransaction_transferId_idx" ON "ImportedTransaction"("transferId");

ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_incomeId_fkey"
  FOREIGN KEY ("incomeId") REFERENCES "Income"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_transferId_fkey"
  FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Al massimo uno dei tre e' pieno. Il vincolo sta nel database e non solo nel
-- codice perche' una riga con due bersagli sarebbe raccontata due volte in due
-- posti diversi, e nessuno dei due si accorgerebbe dell'altro.
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_one_target"
  CHECK (
    (CASE WHEN "entryId"    IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "incomeId"   IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN "transferId" IS NULL THEN 0 ELSE 1 END) <= 1
  );

-- Le entrate sanno da dove vengono, come le spese.
--
-- Entry ha "source" da sempre; Income no, e senza un'entrata arrivata dal CSV
-- sarebbe indistinguibile da una scritta a mano. Enum separato da EntrySource
-- perche' quello contiene 'habit', e un'abitudine che produce entrate non c'e'.
CREATE TYPE "IncomeSource" AS ENUM ('manual', 'imported');

ALTER TABLE "Income"
  ADD COLUMN "source" "IncomeSource" NOT NULL DEFAULT 'manual';
