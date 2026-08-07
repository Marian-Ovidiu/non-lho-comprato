# Direzione artistica

## Il principio guida

Aprire l'app deve dare la sensazione di guardare i propri soldi attraverso un
vetro spesso e pulito: la stanza dietro (luce, sfere, onde) dà profondità e
calma, ma tutto ciò che è scritto sta *sul* vetro, mai *dentro* la stanza. La
versione precedente confondeva i due piani — l'ambiente passava sopra le cifre
— e un'app di soldi che rende illeggibile un importo ha perso, qualunque sia
l'effetto.

## Le scelte, una per una

### Colore: una palette a ruoli, non a gusti

La palette salvia-notturna con lime e lilla c'era già ed era giusta; quello che
mancava era la disciplina. Prima il lime faceva tre lavori insieme — brand,
"va tutto bene" nei budget, call to action — quindi non ne faceva nessuno. Ora
i ruoli sono tre, e sono esclusivi:

- **lime = azione.** CTA, focus, fiamma. Mai usato per dire "sei sotto budget".
- **lilla = coppia.** È l'unico posto della dashboard dove esistono due
  persone, ed è l'unico posto dove compare il lilla. Si vede il lilla → si
  pensa "noi due".
- **giudizio su scala dedicata:** verde salvia (sotto), ambra (in tensione),
  corallo (sforato). Non condivide nessun colore con il brand: "budget al 40%"
  e "premi qui" non possono più dirsi nello stesso modo.

I grafici (la barra "dove stai spendendo") usano una quarta scala, categorica,
che evita sia il lime sia il corallo: la distribuzione per categoria è un dato,
non un giudizio.

**Il tema chiaro era rotto, non brutto**: `.nlc-palette-sage` serviva i valori
scuri a entrambi i temi, quindi in chiaro le etichette sparivano dentro lastre
scure. Ora ogni token ha la sua variante chiara, e i colori che in scuro
funzionano come luce (lime pieno, lilla chiaro) hanno una versione "ink" più
scura (`--accent-ink`, `--lilac-ink`) per quando fanno da testo. Axe passa
serious/critical a zero su entrambi i temi.

### Tipografia: i numeri hanno una gerarchia interna

- I numeri restano sull'Instrument Sans tabulare (niente monospace): le
  colonne si allineano, il numero grande non sembra uno scontrino.
- **Valuta e centesimi arretrano.** Nel numero eroe, `€` e `,79` scendono di
  corpo e di colore: la decisione la prendono gli euro, i centesimi sono
  contesto. Ma restano — su un'app di soldi "circa" non è una risposta.
- La scala numerica ha tre gradini (`--num-hero` fluido 38–50px, `--num-lead`
  27px, `--num-mid` 19px). L'hero è in `clamp()`: a 360px non va mai a capo, a
  430px non urla.
- Le etichette di sezione (eyebrow) salgono da 10,5px/0.14em a 11px/0.075em
  con un gradino di colore in più: il maiuscoletto largo e pallido su vetro
  non reggeva.
- Il serif corsivo resta la voce che commenta ("agosto", "€23 al giorno", la
  riflessione settimanale): è il tratto più personale del linguaggio esistente
  e distingue ciò che l'app *dice* da ciò che l'app *misura*.

### Profondità: due lastre, tre piani

Prima c'erano quattro materiali vetro (`hero`, `card`, `tile`, `blur`) con
riempimenti, bordi e blur diversi — quattro modi di dire la stessa cosa. Ora
i materiali sono due:

- **il foglio** (hero): più opaco, blur più profondo, ombra più lunga. È il
  documento.
- **la scheda** (tutto il resto): un solo materiale per ogni card della
  griglia. Sono strumenti.

La regola che rende il vetro credibile è contro-intuitiva: **la lastra più
vicina è la più opaca**. Il vetro spesso diffonde, non svela. L'ambiente
dietro (aura, orb, onde) esiste per dare distanza, e ha perso il riflesso
speculare bianco che prima finiva sopra le cifre. In chiaro l'ambiente è
dimezzato via `--env-strength`: gli stessi orb che in scuro leggono come luce,
su carta chiara leggono come sporco.

Le lastre non si annidano mai: dentro una scheda ci sono solo incassi piatti
(bordo + velo di colore), niente vetro nel vetro. Meno `backdrop-filter`
sovrapposti durante lo scroll, che era il costo reale su telefono.

### Movimento: spiega la distanza, poi si ferma

La parallasse legata allo scroll c'era già ed era la scelta giusta (nessun
autoplay, reversibile, ferma quando il dito si ferma): è rimasta. Il tilt 3D
delle card scende da 3,2° a 2,1° — oltre i 2 gradi il testo sfoca durante lo
scroll su mobile e il movimento smette di spiegare la profondità e inizia a
esibirla. `prefers-reduced-motion` continua a spegnere tutto alla radice.

## L'header: elementi, non barra

L'header è stato l'ultima zona ferma, ed era giusto che lo fosse: il chrome si
tocca per ultimo perché sbagliarlo si paga su ogni pagina. Ora è cambiato di
natura: **non è più una lastra, è un gruppo di elementi fermi sulla pagina**.
Niente vetro, niente riempimento, niente `Rule` di confine — fondersi significa
nessun confine, e una riga da un pixel sotto un header trasparente è solo il
fantasma della barra che abbiamo tolto.

### Come si legge in scroll, e perché così

Il problema vero di un header senza sfondo è uno solo: resta fisso, il
contenuto gli passa dietro, e testo su testo non si legge. Le due strade
canoniche erano lo scrim in gradiente e il blur progressivo. **Ho preso
entrambe, perché fanno due lavori diversi e nessuna delle due basta da sola:**

- **Lo scrim è il garante.** Un gradiente che parte dal colore che la pagina
  ha già (`var(--background)`, quindi giusto su ogni rotta e in ogni tema) e
  sfuma a zero con una curva a più fermate, senza mai un bordo. Poiché è il
  colore del fondo, l'occhio non lo registra come sfondo: registra la pagina
  che continua. Ma è lui che tiene il contrasto AA — con lo scrim all'88% nel
  tratto dove stanno le scritte, anche il caso peggiore (la CTA lime che
  scorre sotto il testo chiaro, in scuro) resta sopra la soglia con margine.
  Il blur da solo questo non lo garantisce: una campitura accesa sfocata
  resta una campitura accesa.
- **Il blur è il materiale.** Un `backdrop-filter` mascherato con
  `mask-image` che sfuma a zero: scioglie il dettaglio del contenuto prima
  che arrivi sotto le scritte, così lo scrim può restare leggero. Ha una
  proprietà preziosa: su un fondo liscio — l'aura della dashboard, la carta
  piatta delle altre pagine — sfocare non cambia nulla. Il velo esiste solo
  quando serve, che è la definizione di "percettivamente nessuno sfondo".
  Costo: zero netto. È lo stesso `backdrop-filter` che la vecchia barra
  usava già; ho solo tolto il suo e messo questo.

Un raffinamento dove il browser lo consente (`animation-timeline: scroll()`,
spento con `prefers-reduced-motion`): **in cima alla pagina lo scrim è a
opacità zero** — dietro l'header non passa niente, quindi l'header è
letteralmente solo elementi, e sulla dashboard la stanza sale fin dentro la
status bar — e si materializza nei primi 96px di scroll. È il movimento che
spiega: il velo appare esattamente quando compare la cosa da velare. Dove i
timeline di scroll non esistono, lo scrim resta semplicemente visibile: la
base regge da sola.

Entrambi gli strati sporgono di 16px sotto il box dell'header, così le
sfumature si chiudono fuori dal suo bordo: non c'è nessuna riga in cui
l'header "finisce". Su ogni rotta funziona per costruzione: sulla dashboard i
due strati mostrano la stanza, sulle altre pagine si appoggiano al fondo
piatto e spariscono del tutto.

## La barra inferiore: la pagina che si chiude nei controlli

In questo documento avevo scritto che la barra inferiore restava di vetro, e
che «una lastra con un bordo è sincerità, non decorazione». La prima metà della
frase l'ho tenuta per il verso giusto; la seconda era sbagliata e la ritiro.
Quel bordo — `border-t border-line/60` — era esattamente la cosa che avevo
appena tolto dall'header: il fantasma della barra. Non si può eliminare una
riga da un pixel in cima alla pagina perché è un residuo, e difenderla in
fondo perché è onestà. O è un confine necessario, o non lo è.

### Cosa non ho fatto, e perché resta valido

La barra non si dissolve, e su questo non ho cambiato idea. È la navigazione
primaria: iOS HIG e Material la trattano da àncora persistente, e hanno
ragione. Sotto di lei passa contenuto in continuazione — non ogni tanto, come
sotto l'header, ma per tutta la durata di ogni scroll — incluse card con CTA
lime e importi tinti. E su iPhone si estende nella zona dell'home indicator,
dove vedere scorrere qualcosa non legge come design, legge come rotto.

### Il confine, risolto senza confine

Quello che ho tolto è il bordo, e con lui la lastra. La barra ora porta lo
**stesso velo dell'header, rovesciato**: uno scrim nel colore che la pagina ha
già (`var(--background)`, quindi giusto su ogni rotta e in ogni tema) e un blur
progressivo mascherato. Solo che il profilo della curva è opposto. L'header
sfuma *verso il basso* fino a sparire; qui la sfumatura sale, e scendendo si
chiude su `var(--background)` pieno — e ci resta, opaca al 100%, per tutta la
safe area. Lo strato sporge 60px sopra il box della barra, così la sfumatura
comincia fuori e non esiste nessuna riga in cui la barra comincia.

**L'àncora non era la riga.** Era, e resta, il terreno: sotto le voci il fondo
è opaco al 100%. Il vetro di prima era `--background` al 76% sopra un blur:
significa che il contrasto delle etichette dipendeva da cosa stava passando
sotto in quel momento. Ora non dipende più da niente. In salvia chiaro le voci
inattive danno 4,61:1 sul fondo pieno, in scuro 7,09:1, e sono numeri fissi,
non fortunati. **La barra senza bordo è più ancorata di quella con il bordo**,
perché il bordo separava una zona semitrasparente da una trasparente, mentre
adesso separa il pieno dal vuoto senza doverlo disegnare.

Un dettaglio che sembra minuscolo e non lo è: le fermate del gradiente sono in
px misurati **dall'alto** dello strato, non in percentuale. La distanza fra il
bordo alto del velo e la riga dei tap è sempre la stessa (60 di sporgenza + 10
di padding = 70px); la distanza dal basso dipende da `env(safe-area-inset-bottom)`,
che va da 0 a 34 a seconda del telefono. Ancorare all'alto è ciò che mette il
terreno pieno esattamente sotto le dita su un iPhone con la notch e su un
Android senza, con un numero solo.

### Punto 2 — la coerenza di materiale: allineata, e non per simmetria

Ho allineato. Ma la ragione non è che due chrome debbano assomigliarsi: è che
avevo due materiali per un problema solo. Header e barra fanno lo stesso
lavoro — tenere leggibile un elemento fermo mentre sotto scorre roba viva — e
la lastra di vetro quel lavoro lo faceva peggio, perché un vetro *mostra*: è
la sua definizione. Un chrome che mostra è un chrome che non garantisce.

La differenza fra i due non è sparita, ha solo smesso di essere una differenza
di materiale ed è diventata una differenza di **profilo**, che è dove
appartiene. Uno apre e va a zero; l'altro chiude e va al pieno. Stesso
vocabolario, versi opposti, e il verso lo detta il lavoro: in cima la pagina
deve poter salire fin dentro la status bar, in fondo deve fermarsi prima
dell'home indicator. Con due materiali diversi quella differenza non si leggeva
come intenzione, si leggeva come due decisioni prese in due giorni diversi.

Effetto collaterale che vale la pena dire: `.nlc-glass-chrome` non esiste più.
Era il quinto materiale sopravvissuto alla riduzione a due lastre, e lo usava
un elemento solo.

### Punto 3 — la barra nuda in fondo: no, e il motivo non è la frequenza

L'osservazione che in cima ci si arriva sempre e in fondo quasi mai è giusta,
ma è il mio terzo argomento, non il primo. I primi due sono più duri.

**Il primo: in fondo alla pagina il velo non vela già niente**, e l'ho reso
vero per costruzione. La riserva di spazio in fondo (`--nlc-chrome-bottom`,
9rem) è calcolata sulla geometria del velo: 82px di barra più 60px di
sporgenza. Significa che a scroll massimo l'ultimo elemento della pagina resta
*sopra* il punto in cui la sfumatura comincia. Uno stato "nuda in fondo"
scoprirebbe il fondo della pagina — cioè `var(--background)` — da sotto uno
scrim fatto di `var(--background)`. Zero differenza visibile, su cinque rotte
su sei. Questa parte del lavoro l'ho già fatta, ma con il layout invece che con
un'animazione, ed è il posto giusto dove farla: un problema di spazio si
risolve con lo spazio.

**Il secondo: sulla sesta rotta la differenza ci sarebbe, ed è un cattivo
affare.** Sulla dashboard le onde sono agganciate al fondo del viewport, quindi
dietro la barra c'è sempre la stanza. Scoprirle vorrebbe dire mettere il
livello più tenue dell'ambiente sotto le quattro voci della navigazione
primaria e sotto l'home indicator — cioè rimettere in discussione i due numeri
di contrasto qui sopra, e riaprire proprio la zona che il punto precedente
diceva di non toccare, in cambio di una striscia di onde che sopra la barra si
vedono già.

C'è anche un costo tecnico, e non è banale: la barra non può sfumare a zero
tutta intera, perché la safe area deve restare piena. Servirebbero due strati
indipendenti, uno che si dissolve e uno che resta — cioè sommare strati, che è
esattamente il vincolo di prestazione che ci siamo dati. L'header può
permettersi lo stato nudo perché lì non c'è niente da tenere fermo.

Quindi no. E lo scrivo per esteso perché uno stato che non c'è va difeso come
uno che c'è.

### Una cosa rotta che ho trovato mentre misuravo

Per calcolare la riserva ho dovuto cercare quanto spazio le pagine lasciavano
libero, e l'ho trovato scritto a mano — `6.5rem` — in cinque file diversi. Una
costante condivisa senza un nome è una costante che prima o poi si sfasa, e
infatti era già sfasata: la barra è `md:hidden`, ma la riserva scendeva a 2rem
già da `sm`. Fra 640 e 767px di larghezza l'ultimo pezzo di ogni pagina finiva
sotto la navigazione. Con la vecchia lastra opaca spariva e basta; con un velo
sfumato sarebbe sparito più elegantemente, il che è peggio. Ora il numero ha un
nome (`--nlc-chrome-bottom`), vive accanto alla geometria del velo da cui
discende, e la soglia è `md` come la barra.

### Nota chiusa: il lime del chrome in tema chiaro

Toccando il chrome ho chiuso la prima nota di "Dove vorrei un occhio umano".
La regola era già scritta nella palette: il lime pieno resta dove il lime è
campitura (la CTA, il fondo del "+aggiungi"), ma dove il lime è *tratto* —
la fiamma del brand, la sottolineatura della voce attiva, il pallino della
tab, l'anello del "+" — in chiaro passa a `--accent-ink`. Un tratto da uno o
due pixel non ha massa per reggere un colore tenue su carta chiara;
l'inchiostro sì, e il ruolo (lime = azione) non cambia, cambia solo il peso.

## L'elenco movimenti: la stanza e la carta

`/entries` è la seconda schermata dell'app per uso reale, ed è anche la più
difficile: è l'unica dove il contenuto può arrivare a centinaia di elementi e
dove ogni scelta tipografica viene moltiplicata per duecento. È il posto dove
una direzione artistica o tiene o si vede che non teneva.

### La tesi: il vetro non scende nell'elenco, e non è un compromesso

La domanda ovvia era: porto la palette salvia e le lastre di vetro anche qui,
così le due schermate si assomigliano? La risposta è no, e non per prudenza.

La dashboard è **una stanza guardata attraverso il vetro**: c'è un ambiente
dietro, e il vetro serve a metterci distanza. L'elenco è **il registro**, ed è
stampato su carta: non c'è niente dietro da guardare, quindi non c'è niente da
mettere a distanza. Una lastra traslucida sopra il nulla non è profondità, è
una decorazione che costa. E costa davvero: `backdrop-filter` è l'effetto più
caro del catalogo, e quello che regge su dodici card non regge su duecento
righe. Su questa pagina non ce n'è **nessuno** legato a una riga; gli unici due
sono nel chrome, e sono quelli che c'erano già.

Quindi due superfici, con due nomi: **la stanza** e **la carta**. Non due
linguaggi — due materiali dello stesso linguaggio. Quello che condividono è
tutto il resto, ed è la parte che conta: la scala dei numeri, le etichette di
sezione, il velo del chrome, la disciplina dei ruoli di colore, il serif
corsivo come voce che commenta.

### I soldi si scrivono in un modo solo

La pagina aveva tre `formatEUR` locali (uno nell'elenco, uno nella riga, uno
nella testata) che producevano una stringa piatta, mentre la dashboard aveva
`Amount` con la gerarchia interna. Due modi di scrivere i soldi nella stessa
app sono uno di troppo, e la ragione non è l'ordine: è che **la gerarchia
dell'importo è un'affermazione** — gli euro decidono, i centesimi sono
contesto — e un'app che la fa in una schermata e non nell'altra sta dicendo
che non ci credeva.

`Amount` ed `Eyebrow` sono usciti dalla dashboard e vivono in
`components/crafted`. Con loro sono uscite dallo scope `.nlc-glass-home` le
regole tipografiche: la scala numerica (hero/lead/mid) e il corpo delle
etichette stanno in `:root`, perché erano la scala dei soldi, non la scala di
una pagina. `.nlc-amount` porta con sé il carattere, così un importo è lo
stesso oggetto ovunque compaia, senza dipendere da chi lo contiene.

Portarlo su una lista ha rivelato un limite che sulla dashboard non si vedeva:
la proporzione dei centesimi (0,46em) è tarata su numeri da 27–50px, ma in una
riga d'elenco l'importo è 15px, e 0,46em fanno **sette pixel**. La gerarchia
diventava illeggibilità. La regola ora è `min(1em, max(11px, 0.46em))`: un
guinzaglio in tutte e due le direzioni. Sotto gli 11px un numero smette di
essere un numero e diventa una texture; sopra 1em i centesimi diventerebbero
più grandi degli euro su un importo scritto piccolo. Dove non c'è corpo per
fare gerarchia, l'importo torna piatto da solo. Effetto collaterale sulla
dashboard: gli importi a 19px avevano i centesimi a 8,7px, ora a 11 — e stanno
meglio.

### La testata: tre riquadri uguali per tre numeri che uguali non sono

C'erano "Speso", "Evitato" e "Risparmiato" in tre riquadri identici, affiancati,
stessa dimensione, stesso peso. Tre riquadri uguali dicono una cosa sola: *questi
tre numeri contano allo stesso modo*. Ma il vincolo dice — giustamente — che il
numero di questa pagina è uno: i soldi realmente usciti. E il terzo numero è lo
stesso che sulla dashboard abbiamo tolto perché in tre mesi valeva 19,20 € su
320 movimenti.

Non li ho tolti: li ho **messi in gerarchia**. Il totale reale è l'unico scritto
in grande, sotto il titolo del mese. Evitato e risparmiato scendono nella riga
delle postille, insieme al conteggio dei movimenti, a 12px: lì 19,20 € possono
stare senza fingere di pesare quanto 443. E compaiono solo se sono maggiori di
zero, perché un riquadro che dice "€0,00" occupa esattamente lo spazio di uno
che dice qualcosa.

Questa è la differenza fra togliere una metrica e ridimensionarla, ed è una
differenza che vale la pena tenere: la decisione di prodotto sul confronto non è
stata presa, e la direzione artistica non è il posto da cui prenderla di
straforo. Ma la gerarchia posso stabilirla adesso, ed è reversibile con una
riga.

### La striscia dei filtri: un mini-chrome dentro la pagina

Era `sticky top-14` con bordo inferiore, fondo al 95% e blur: cioè una lastra,
sotto un header che una lastra non è più. Due bordi in cascata — esattamente il
fantasma della barra che avevo tolto in cima. Le tre strade erano: toglierle lo
sticky (ma su una lista da centinaia di righe la ricerca deve restare a portata
di pollice), dividere il lavoro fra i due (ma allora sono due chrome), oppure
**farne lo stesso materiale**. Ho fatto la terza.

Ora la striscia porta il velo del chrome: scrim nel colore che la pagina ha già
e blur progressivo mascherato, nessun bordo, nessuna lastra. Ma con un **terzo
profilo**, ed è la parte interessante. L'header apre e va a zero; la barra
inferiore chiude e va al pieno; qui serviva una terza forma, perché il problema
è diverso: nell'header le scritte stanno nel primo 52% del box, qui i controlli
occupano **tutta** l'altezza — 110px, e più del doppio quando si apre il
pannello delle categorie. Con la curva dell'header, sotto il segmentato lo
scrim è già al 30%, e i movimenti si vedono passare attraverso i filtri. Il
profilo giusto è: pieno per tutta la zona toccabile, dissolvenza solo
sull'ultimo tratto. Le fermate sono in px misurati dal basso dello strato e non
in percentuale, per la stessa ragione per cui quelle della barra inferiore sono
misurate dall'alto: l'altezza del box cambia quando il pannello si apre, la
distanza fra l'ultimo controllo e l'inizio della sfumatura no.

C'è un dettaglio che sembra un cavillo e invece è quello che rende la cosa
credibile: lo strato **sporge anche verso l'alto**, di 20px, dentro la coda
della dissolvenza dell'header. Senza, resta una fascia di una decina di pixel
in cui i movimenti si vedono passare, e quella fascia — attaccata sotto a una
striscia opaca — non si legge come una dissolvenza: si legge come una giuntura
sporca. I due veli si sovrappongono, e nella sovrapposizione vince il pieno.
Costo: zero elementi nuovi, e un `backdrop-filter` che c'era già (era il blur
della vecchia lastra).

Nel farlo ho trovato un bug che non era mio: `top-14` sono 56px scritti a mano,
mentre l'altezza vera dell'header dipende da `env(safe-area-inset-top)` ed è
già pubblicata dal guscio come `--nlc-chrome-top`. Su un telefono con la notch
la striscia si incastrava **sotto** l'header. È la terza volta in questo
documento che una costante condivisa senza nome si sfasa; a un certo punto
diventa una regola: se due elementi devono toccarsi, la misura la pubblica uno
solo.

### Due modelli di scelta non possono avere la stessa forma

Filtro per tipo e filtro per categorie erano due file di chip identiche. Ma il
tipo è **una scelta sola fra quattro**, le categorie sono una **selezione
multipla**: dare la stessa forma a due comportamenti diversi è la definizione
di interfaccia che mente. Il tipo diventa un segmentato — quattro celle in una
cornice, si vede a colpo d'occhio che sono alternative e sparisce lo scroll
orizzontale; le categorie restano chip e guadagnano il segno di spunta, che è
il modo canonico di dire "ne puoi prendere quante vuoi".

Nessuno dei due usa più il lime/oro per dire "selezionato". Un filtro attivo è
uno **stato**, non un'azione, e il colore dell'accento nell'app significa
azione. Lo stato si dice con il materiale: la cella piena. Vale anche per il
contatore sul pulsante dei filtri, che era una pastiglia color brand e ora è
neutra.

Il pannello delle categorie, la sua logica e la combinabilità con ricerca e
tipo non sono stati toccati.

### La densità: cosa fa una riga

È la superficie dove la gerarchia tipografica vale più che altrove, perché ogni
scelta è moltiplicata per duecento. Cinque informazioni per riga, quattro
gradini:

1. **Il titolo ha la riga tutta per sé.** Prima divideva lo spazio con i badge,
   e a 360px la prima cosa che si troncava era l'unica per cui l'utente sta
   scorrendo.
2. **Categoria, persona e tipo** stanno insieme sulla riga sotto, a 11px: sono
   tutte e tre risposte alla stessa domanda ("che movimento è").
3. **La nota** resta in serif corsivo. È la voce dell'utente dentro un elenco
   di misure, ed è il posto dove il corsivo del linguaggio esistente lavora
   meglio di ovunque.
4. **L'importo** a destra, con la gerarchia interna dell'app.

I **filetti** non sono più elementi separati ma un bordo della riga: duecento
nodi in meno nel DOM, zero differenza visiva. L'**icona** prende il contenitore
che la dashboard usa già per le sue righe, così una categoria ha lo stesso
aspetto nelle due schermate.

Il **segno meno** davanti alle spese è sparito. In una colonna dove ogni riga è
denaro uscito, il meno è la cosa che tutte le righe hanno in comune: non
informa. Il "+" davanti alle evitate resta, e adesso vuol dire qualcosa, perché
è l'eccezione. Si marca la deroga, non la regola.

### I badge: ridisegnati, e la ragione per cui non li ho tolti

"Evitata" e "Confronto" erano due chip bordate accanto al titolo. A duecento
righe con settantadue badge, due riquadri colorati per riga sono coriandoli, e
in un registro i coriandoli costano attenzione che serve altrove. Ora sono una
parola in maiuscoletto sulla riga dei dettagli — stesso vocabolario delle
etichette di sezione, corpo 10px — e **il colore ce l'ha solo "Evitata"**.

La distinzione non è estetica: "Evitata" dice una cosa sui soldi (non sono
usciti), "Confronto" dice una cosa sul modo in cui il movimento è stato
registrato. La prima è un fatto contabile e merita l'inchiostro verde; la
seconda è un metadato e sta in grigio. Per la stessa ragione l'icona della riga
si tinge solo sulle evitate: sono l'unico caso in cui la riga rappresenta denaro
che non si è mosso.

Non li ho tolti, come chiesto. Ma il mio parere su "Confronto", visto che è
stato chiesto di scriverlo: **la funzione com'è oggi costa più di quanto rende.**
Costa una riga di gerarchia su ogni movimento che la usa, un filtro su quattro
nella barra, e un numero nella testata; rende 19,20 € in tre mesi. Se la
decisione di prodotto si può ancora prendere, il criterio che proporrei è
misurabile: **se in tre mesi nessuno usa il filtro "Confronti", la funzione non
esiste già adesso** — esiste solo il suo costo. Se invece resta, la forma giusta
è quella che ha ora: una proprietà del movimento, visibile aprendolo, non un
secondo numero dentro il registro.

### La colonna che non sommava

Cercando la gerarchia della riga ho trovato una cosa che non è grafica: sui
movimenti con confronto **il numero grande era il risparmio**, non la spesa. In
un elenco raggruppato per giorno, con il totale del giorno in testa al gruppo,
questo significa che la colonna degli importi non torna con i suoi totali: si
legge "giovedì · €75,80" e sotto una riga che dice "+€20". In un registro una
colonna che non somma è un errore, non uno stile.

Ora la colonna dice sempre la stessa cosa — **quanto è successo a quel
movimento** — e sui confronti è quanto è uscito davvero; l'alternativa scende
sotto, piccola ("invece di €52,00"), che è anche il modo in cui la si racconta
a voce. Il risparmio non è sparito: è la sottrazione fra due numeri che stanno
uno sopra l'altro.

Per la stessa ragione ho corretto il totale del giorno, che scartava i confronti
insieme alle evitate. Il vincolo dice che il totale è `realSpent`, cioè i soldi
usciti esclusa **solo** la spesa evitata: la testata lo rispettava, i totali dei
giorni no. Non ho cambiato la definizione, ho fatto in modo che il codice la
seguisse in tutte e due i posti.

### Il finale della lista diceva una cosa falsa

In fondo compariva sempre "Fine agosto", anche con altre pagine da caricare, e
subito sotto un riquadro con scritto "Tutti i movimenti sono stati caricati".
Due finali, di cui uno bugiardo. Ora ce n'è uno solo e cambia parola secondo
quello che è vero: "fine agosto" quando si sono viste tutte le voci del mese,
"hai visto tutto" quando la lista è filtrata — perché in quel caso non è il mese
ad essere finito, sono i risultati.

## Cosa ho deliberatamente non fatto

- **Niente somma di correnti e fisse, da nessuna parte.** Il numero eroe è la
  spesa corrente; le fisse sono un incasso silenzioso sotto, il totale una
  riga piccola. La gerarchia tipografica ora dice quello che il vincolo
  chiede: corrente > fisse > totale.
- **Niente blocchi nuovi, niente metriche nuove.** L'ordine dei dodici blocchi
  è intatto. La tentazione di aggiungere un grafico all'hero c'è stata;
  19,20 € su 320 movimenti è l'argomento che la chiude.
- **Niente tinte piene sulle card di confronto.** Prima "Giorno N" e "Mese
  scorso" coloravano l'intera lastra (una verde e una arancione affiancate
  urlavano più dell'hero). Ora il materiale resta neutro e il colore va solo
  sul verdetto: etichetta e icona.
- **Niente ritocco alla struttura del chrome condiviso** (header, bottom bar):
  cosa c'è e in che ordine non si è mai mosso. Entrambi sono poi stati
  sbloccati e hanno cambiato materiale (vedi le due sezioni dedicate), e con la
  barra si è mossa una misura di layout — la riserva di spazio in fondo alle
  pagine — ma solo perché discende dalla geometria del velo: era un numero
  ripetuto a mano, ora è `--nlc-chrome-bottom`.
- **Niente vetro sull'elenco movimenti**, e niente palette salvia: la stanza
  resta alla home. Vedi la sezione dedicata — non è prudenza, è che una lastra
  traslucida sopra il nulla non è profondità, e su duecento righe si paga.
- **Niente nuovi blocchi, nuove metriche o nuovi filtri su `/entries`.** Non ho
  aggiunto un riepilogo, un grafico o un ordinamento. Quello che c'era è
  rimasto: quello che è cambiato è quanto pesa.
- **Niente orario sulle righe**, niente ripescaggio dell'informazione tolta.
  L'ho verificato: con il raggruppamento per giorno e la nota in corsivo, la
  riga è già piena di cose vere.
- **Nessun badge rimosso.** "Evitata" e "Confronto" sono stati ridisegnati, non
  cancellati; il mio parere sul futuro della funzione è scritto sopra, che è il
  posto dove va, non nel codice.
- **Una cosa l'ho tolta, e la dichiaro**: il conteggio dei movimenti
  nell'intestazione di ogni giorno ("3 mov · €48,20"). Sotto quell'intestazione
  ci sono le righe, e sono da una a cinque: si contano guardandole. È la stessa
  logica con cui era stato tolto l'orario, applicata al numero accanto. Se in
  uso reale manca, è una riga di codice.
- **Nessuna libreria.** Tutto CSS, SVG inline e lucide.

## Dove vorrei un occhio umano

1. ~~**Il lime dell'attivo nella bottom bar in tema chiaro.**~~ Chiusa con il
   lavoro sull'header: in chiaro il lime-tratto del chrome passa a
   `--accent-ink` (vedi "Nota chiusa" nella sezione dell'header).
2. **L'ambiente in chiaro sotto il velo dell'header.** Con lo scrim a zero in
   cima, la status bar in chiaro poggia direttamente sull'aura: a me il
   contrasto dell'ora e della batteria sembra reggere, ma è da guardare su
   un telefono vero con la notch.
3. **L'ambiente in tema chiaro.** L'ho dimezzato, non spento: sotto la CTA
   finale gli orb si vedono come dischi grigi molto tenui. A me sembrano
   carta, a un altro occhio potrebbero sembrare macchie. Il dial è
   `--env-strength` (0.5): un numero solo da girare.
4. **I centesimi rimpiccioliti** (`,79` a metà corpo). Sono convinto della
   gerarchia, ma è il tipo di scelta che un utente può leggere come "sta
   nascondendo i centesimi". Se in uso reale disturba, il componente `Amount`
   ha un solo posto da cui tornare indietro.
5. **La soglia d'ambra dei budget** (70% globale, 80% categoria): l'ho
   ereditata dalle soglie esistenti, ma ora che l'ambra è un colore dedicato
   la soglia è più visibile di prima. Da tarare sull'uso vero.
6. **I 60px di sporgenza del velo inferiore.** È il numero su cui ho esitato di
   più. Più corto e la sfumatura ricomincia a somigliare a un bordo morbido;
   più lungo e la fascia in cui una card è ancora toccabile ma già mezza velata
   si allunga, il che è la cosa spiacevole di questa tecnica (iOS la accetta,
   ma è transitoria: scorri e passa). A 60px quella fascia è alta più o meno
   una riga di testo. È da guardare scorrendo la lista dei movimenti su un
   telefono vero, che è il posto dove il difetto verrebbe fuori.
7. **"Tu" nella barra è scritto in chiaro nel componente** e non passa da
   `src/lib/i18n` — quindi in inglese resta "Tu", mentre la chiave `nav.more`
   esiste già ("Altro" / "More"). Non l'ho toccato perché cambiare
   un'etichetta di navigazione è una decisione di copy, non di direzione
   artistica, e "Tu" è probabilmente voluto. Ma o è voluto in tutte e due le
   lingue, e allora va nell'i18n, o è una svista.
8. **La giuntura del carattere, che ho spostato invece di chiudere.** La home
   era in Instrument Sans e tutte le altre pagine nel sans di sistema — non per
   scelta, per una variabile mai definita. Ho portato Instrument Sans anche
   sull'elenco, perché due caratteri in due schermate contigue si leggono come
   due app. Ma restano quattro rotte nel carattere di sistema, e adesso la
   giuntura è fra `/entries` e `/habits` invece che fra `/` e tutto il resto.
   Io la chiuderei portando il carattere in `:root` e togliendolo dalle due
   classi di pagina: è una riga, ma tocca ogni schermata, e non è una cosa da
   fare di straforo dentro un lavoro sull'elenco. **Questa è la prima cosa che
   guarderei.**
9. **Il verde delle evitate è più acceso della spesa vera, sulla stessa riga.**
   È voluto — l'app si chiama "Non l'ho comprato" e quella riga è il suo
   momento — ma su una schermata di venti righe con tre evitate, la cosa che
   salta all'occhio è il denaro *non* uscito. Su un registro è una scelta
   discutibile, e va guardata con dati veri, non con quelli di prova.
10. **La fascia semi-velata sotto i controlli quando il pannello categorie è
    aperto.** È lo stesso difetto della sporgenza inferiore già discusso per la
    barra: una striscia alta più o meno una riga in cui un movimento è già mezzo
    velato ma ancora toccabile. Con il pannello aperto quella striscia cade su
    contenuto denso invece che sul bianco. È transitoria (si chiude il pannello
    e passa), ma è da vedere su un telefono vero.
11. **Il segmentato in tema chiaro.** La cella attiva è `--surface-muted` su
    `--background`: due beige a un passo l'uno dall'altro. Con il peso
    semibold si legge, e il contrasto del testo è largamente sopra soglia, ma
    la separazione fra "acceso" e "spento" è più sicura in scuro che in chiaro.
    Se non basta, il rimedio è un gradino di materiale in più, non un colore.
12. **La riga delle postille in testata a 360px.** Con tre voci e importi a
    quattro cifre va a capo. Va a capo bene (è un flex che avvolge), ma è il
    genere di cosa che si giudica solo su un telefono con i propri numeri.

## Nota tecnica per chi tocca questo codice

Le regole `.nlc-eyebrow`, `.nlc-amount`, `.nlc-track` in `globals.css` sono
fuori dai layer Tailwind, quindi **vincono sulle utility**: per variare il
colore di un'eyebrow non si usa `text-*` ma la variabile `--eyebrow-ink`
(vedi le card di confronto, e i marcatori delle righe dell'elenco); per il
corpo si usa `--fs-label`. I token del materiale (`--sheet-*`, `--plate-*`,
`--track`, `--env-strength`) vivono dentro `.nlc-palette-sage` con la loro
variante chiara: un tema nuovo si fa lì, senza toccare i componenti.

`Amount` ed `Eyebrow` stanno in `components/crafted` e sono di tutta l'app,
non della dashboard. `Amount` prende la valuta dal contesto del workspace: il
parametro esplicito serve solo dove è già stato risolto (la dashboard). Se un
giorno la gerarchia dei centesimi va tolta, il posto è uno: `.nlc-cents` e
`.nlc-currency`. Il `min(1em, max(11px, …))` di quelle due regole non è una
finezza: è ciò che permette allo stesso componente di stare in un numero eroe
da 50px e in una riga d'elenco da 15px senza due varianti.

Il velo del chrome ha tre profili, tutti in `globals.css` e fuori dai layer,
tutti fatti dei soliti due pseudo-elementi (scrim su `::after`, blur mascherato
su `::before`, `z-index: -1`, colore da `var(--background)`):
`.nlc-chrome-veil` (header: apre e va a zero), `.nlc-chrome-veil-up` (barra
inferiore: chiude e va al pieno), `.nlc-chrome-veil-list` (striscia dei filtri:
pieno sotto i controlli, dissolvenza sull'ultimo tratto). Il terzo sporge di
20px in alto per sovrapporsi alla coda del primo: se si cambia il profilo
dell'header, quella sporgenza va ricontrollata, altrimenti fra i due riappare
una fascia in cui il contenuto traspare. La striscia si aggancia a
`--nlc-chrome-top` (l'altezza vera dell'header, pubblicata da `app-shell`):
mai rimettere un numero fisso, cambia con la safe area e con la nav desktop.

`.nlc-ledger` è la superficie dell'elenco movimenti: per ora porta solo il
carattere, ed è il gancio giusto se la carta dovrà prendere altri token propri.
`--avoided-ink` è il verde della spesa evitata **quando fa da testo**, con la
sua variante chiara, e sta accanto agli altri token d'app: stessa regola di
`--accent-ink` e `--lilac-ink`.

Il velo del chrome è `.nlc-chrome-veil` (header) e `.nlc-chrome-veil-up`
(barra inferiore), sempre in `globals.css` e fuori dai layer: due
pseudo-elementi in `z-index: -1`, scrim su `::after` e blur mascherato su
`::before`. Prendono il colore da `var(--background)`, quindi seguono rotta e
tema da soli; non dare mai a questi elementi un `background` diretto, o torna
una barra. Uno solo `backdrop-filter` per velo, e sono gli stessi due che le
vecchie lastre usavano già: il saldo è zero.

Le tre misure del velo inferiore sono legate fra loro e vanno cambiate
insieme: la sporgenza (`inset: -60px 0 0`), la fermata dove lo scrim diventa
pieno (`70px`, cioè sporgenza + il `pt-2.5` della barra — deve cadere esatta
sul bordo alto della riga dei tap) e `--nlc-chrome-bottom`, la riserva che le
pagine lasciano in fondo, che è sporgenza + altezza della barra. Se si allunga
la sfumatura senza allungare la riserva, a fondo pagina l'ultima card entra nel
velo.

`--nlc-chrome-bottom` è usato da `app-shell` (padding del `main`), dalla
dashboard (il margine negativo accoppiato, che deve restare identico o la
stanza non arriva più in fondo) e dal prompt delle notifiche, che galleggia
sopra la barra. Il `6.5rem` rimasto nei due form dei movimenti è un'altra cosa:
quelli non stanno sotto la barra.
