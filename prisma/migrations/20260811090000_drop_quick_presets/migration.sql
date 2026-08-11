-- I preset rapidi escono dall'app.
--
-- Erano scorciatoie che l'utente doveva configurarsi da solo: in tre mesi ne
-- è stato creato uno, mai più toccato. Le scorciatoie della dashboard le hanno
-- sostituite ricavandole dai movimenti già registrati, senza chiedere niente.
--
-- La tabella non ha figli: nessun'altra riga la referenzia, quindi il drop non
-- tocca movimenti, categorie o abitudini. I vincoli qui sotto partono da
-- QuickPreset verso gli altri, non il contrario.
DROP TABLE IF EXISTS "QuickPreset";
