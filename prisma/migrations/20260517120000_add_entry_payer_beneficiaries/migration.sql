-- Keep the legacy person field for existing filters, while adding explicit
-- payer and beneficiary fields for future expense split logic.
ALTER TABLE "Entry"
ADD COLUMN     "paidBy" "Person" NOT NULL DEFAULT 'MARIAN',
ADD COLUMN     "beneficiaries" "Person"[] NOT NULL DEFAULT ARRAY['MARIAN']::"Person"[];

UPDATE "Entry"
SET
  "paidBy" = CASE
    WHEN "person" = 'MARTINA' THEN 'MARTINA'::"Person"
    ELSE 'MARIAN'::"Person"
  END,
  "beneficiaries" = CASE
    WHEN "person" = 'MARTINA' THEN ARRAY['MARTINA']::"Person"[]
    WHEN "person" = 'TUTTI' THEN ARRAY['MARIAN', 'MARTINA']::"Person"[]
    ELSE ARRAY['MARIAN']::"Person"[]
  END;
