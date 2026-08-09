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
3. **L'ambiente in tema chiaro, in dashboard.** L'ho dimezzato, non spento:
   sotto la CTA finale gli orb si vedono come dischi grigi molto tenui. A me
   sembrano carta, a un altro occhio potrebbero sembrare macchie. Il dial è
   `--env-strength` (0.5): un numero solo da girare. *Aggiornamento:* fuori
   dalla dashboard, in chiaro, il dubbio si è sciolto da solo guardando le
   schermate — senza vetro davanti gli orb sono macchie, e lì li ho spenti.
   Resta aperto solo per la home, dove il vetro li diffonde.
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
8. ~~**La giuntura del carattere, che ho spostato invece di chiudere.**~~
   Chiusa: il carattere è in `:root` e vale su tutte le rotte (vedi la sezione
   finale). Il testo originale resta qui sotto perché la diagnosi era giusta e
   vale la pena ricordare com'era. La home
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
`--track`, `--env-strength`) vivono in `:root` con la loro variante chiara in
`:root:not(.dark)`: un tema nuovo si fa lì, senza toccare i componenti.
(Fino alla promozione dei fondamentali stavano dentro `.nlc-palette-sage`, che
non esiste più — vedi la sezione finale.)

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

---

# La promozione: da pagina ad app

Il rilievo del fondatore era che passando dalla dashboard a `/entries`
sembravano due app. Aveva ragione, e la causa non era una scelta di design: era
che **la direzione artistica non era mai uscita dalla home.** Palette, carattere
e stanza erano tutti scritti come proprietà di una pagina invece che
dell'applicazione. Tre sintomi, una causa sola.

Questo giro non ridisegna niente. Prende quello che c'era e lo mette dove
doveva stare.

## 1. La palette

**Cos'era.** `.nlc-palette-sage` conteneva la palette nuova per intero, ma era
una classe, e veniva applicata in tre punti: l'header e la barra inferiore
quando `isHome` era vero, e la radice della dashboard. Tutto il resto dell'app
girava sui token di `:root`, che erano ancora la vecchia palette oro
(`--accent: #d8a85b`, `--warm: #d9a651`). Undici rotte su tredici erano
letteralmente su un'altra direzione artistica.

**Cos'è adesso.** La salvia *è* `:root`. Non c'è più nessuna classe di palette e
non c'è più niente da applicare: una schermata nuova nasce nella palette giusta
senza fare niente, che è l'unico modo perché una cosa del genere non ricapiti.

Tre decisioni di meccanica, e ognuna ha una ragione:

- **Il blocco `.dark` è sparito.** Ripeteva a mano i cinquanta valori scuri già
  presenti in `:root`, ed è esattamente il meccanismo con cui le due palette
  avevano potuto divergere: due copie, una si aggiorna, l'altra no. `.dark`
  viene messa solo su `<html>` (`src/lib/theme.ts`), quindi `:root` *è* il tema
  scuro e `:root:not(.dark)` è l'unico override. Una copia sola, e non resta
  niente da tenere allineato a mano.

- **L'accento si è sdoppiato, e questa è la cosa che ha salvato il tema
  chiaro.** Promuovendo la palette così com'era, il tema chiaro si rompeva in
  silenzio: in chiaro `--accent` era il lime pieno (`#cdf56d`), e una regola
  ereditata lo riportava all'inchiostro **solo dentro il chrome**. Fuori di lì
  c'erano 65 `text-accent` e 48 `border-accent` che sarebbero diventati lime su
  carta, cioè invisibili — 1,2:1. Non è una cosa che si vede finché non si apre
  il tema chiaro di una pagina che non si sta guardando.

  Il rimedio non è una regola per schermata: è che il token diceva due cose
  diverse. Adesso `--accent` è l'accento **quando fa da tratto** (testo, bordo,
  icona, anello di focus) e per definizione è leggibile sul fondo del suo tema —
  in chiaro è l'oliva `#46620d`, 6,2:1 sul fondo e 7:1 sulla carta bianca.
  `--accent-fill` è l'accento **quando fa da campitura**, ed è il lime del
  marchio. In scuro sono lo stesso colore, perché lì non c'è conflitto. Una
  regola sola riporta `bg-accent` pieno alla campitura, perché quello è il caso
  della CTA. Le velature (`bg-accent/5`, `bg-accent/10`) restano di proposito
  sul tratto: su carta chiara una velatura deve *scurire*, non schiarire.

- **La scala a ruoli è diventata utility** (`nlc-under`, `nlc-warn`,
  `nlc-over`). Prima era raggiungibile solo dal CSS grezzo, ed è il motivo per
  cui in giro per l'app il giudizio veniva scritto con i colori del brand o con
  quelli grezzi di Tailwind.

### Gli usi di colore che nella palette a ruoli erano diventati falsi

Passando le rotte ho trovato quattro punti dove un colore diceva la cosa
sbagliata. Corretti, perché è precisamente il caso previsto dal brief:

1. **Il toast di successo era lime.** Regola 1: il lime è azione, non è mai "va
   bene". Un toast che dice "fatto" in lime dice "premi qui". Passa alla scala
   del giudizio (`--nlc-under`).
2. **Il toast di festa era lilla.** Regola 2: il lilla è solo la coppia. Una
   celebrazione non è due persone. La festa la fa la fiamma, che è lime — ed è
   l'unico posto in cui il lime come "momento positivo" è coerente, perché la
   fiamma è già dichiarata come lime dentro la regola stessa.
3. **Le categorie erano tinte con i colori grezzi di Tailwind**: `amber` per
   cibo e caffè, `orange` per delivery, `rose` per salute. Nella palette a ruoli
   quelli sono colori occupati — l'ambra dice "in tensione", il corallo dice
   "sforato" — quindi una piastrella "Delivery" si leggeva come un allarme di
   budget. Adesso le categorie hanno una scala loro, che non tocca nessun ruolo.
   Sei famiglie invece di quindici tinte scorrelate: le categorie imparentate
   condividono la tinta, e la parentela diventa informazione invece che rumore.
4. **Gli stati degli import erano `emerald-700` e `amber-700` grezzi**, cioè
   quasi invisibili sul tema scuro, che è quello di default. Passano ai ruoli.

Il lilla rimasto è quello del badge "condiviso" nel selettore di workspace: lì
due persone ci sono davvero, ed è l'uso giusto.

### La soglia

Lo splash è la prima cosa che si vede dell'app, ed era rimasto interamente sulla
vecchia palette: fondo `#0a0a09` (un nero caldo), cometa e alone `#d9a651`.
Anche la `themeColor` del documento e quella del manifest erano il vecchio
`#0E0D0B` — cioè la barra di stato del telefono restava calda mentre l'app sotto
era salvia. Adesso la soglia è il nero della stanza e la fiamma è lime: entrare
nell'app non è più un cambio di colore, è solo la fiamma che si toglie di mezzo.

## 2. La stanza: sì, scende — ma non tutta intera

**La decisione: la stanza va a livello d'app.** Il fondatore aveva ragione, e il
mio argomento precedente era sbagliato per una ragione precisa: nel documento
avevo trattato "il vetro" e "la stanza" come un blocco solo. Non lo sono. Il
vetro è **per elemento** — duecento righe, duecento `backdrop-filter`, e lì
l'argomento sul costo regge, e infatti il vetro non scende. La stanza è **un
elemento solo agganciato al viewport**, a costo fisso: uno sfondo non diventa
più caro perché la pagina sotto è più lunga. Avevo esteso una conclusione vera
oltre il suo dominio.

Adesso c'è `AppRoom`, una sola, resa dal guscio dell'app. Verificato in pagina e
non a memoria: sulla home il DOM contiene **una** `.nlc-room`, in
`position: fixed`, e nessuna rotta guadagna scroll orizzontale (gli orb
sporgono di lato, il clip è solo orizzontale).

Le due obiezioni vere le ho trattate come due manopole separate, perché sono due
problemi diversi.

### Leggibilità — provata su una lista vera

Non volevo deciderlo su una lista di prova da un movimento, che è la condizione
in cui l'elenco non dice niente. Ho seminato **160 movimenti** nel database e ho
guardato l'elenco nella sua condizione reale: testo fitto, righe a decine,
nessun vetro davanti.

Risultato: **la stanza non va resa più opaca, va resa più bassa.** Con
`--env-strength` a 0.4 in scuro, l'aura è un'inclinazione di tinta del fondo e
gli orb sono variazioni di luminanza sotto il testo, non oggetti dietro le
parole. Il contrasto non è mai in gioco per costruzione: le campiture dell'aura
sono a bassa alpha *sopra* `--background`, quindi il fondo sotto una riga resta
`--background` appena inclinato. Axe su `/entries` con 160 righe: **zero nodi in
violazione di contrasto**, in tutti e due i temi.

Quindi la domanda del brief — "se il foglio deve diventare così opaco che la
stanza si vede solo ai bordi, vale ancora la pena?" — non si è posta: non ho
dovuto opacizzare nessun foglio. L'elenco non ha una carta sopra la stanza. È la
stanza stessa, tenuta bassa.

**Una cosa l'ho invece scoperta guardando, e non l'avevo prevista.** In tema
chiaro, senza vetro davanti, gli orb non diventano luce fioca: diventano aloni.
Tre dischi grigi dietro una pagina di testo non sembrano profondità, sembrano
sporco — la prima versione della schermata chiara aveva esattamente quell'aria.
La regola che ne esce è più generale del caso: **gli orb sono oggetti, e per
leggersi come luce hanno bisogno di una lente davanti**, che è il vetro. In
dashboard ce l'hanno. Perciò in chiaro, fuori dalla dashboard, la stanza resta
la sola aura — le velature agli angoli, che sono luce e basta. In scuro il
problema non si pone, perché lì un disco più chiaro del fondo *è* una sorgente.

### Velocità di scroll — la parallasse si ferma dove c'è una lista

Questa obiezione era giusta e l'ho accolta senza attenuarla. Sulla dashboard si
scorre piano fra dodici card e la parallasse spiega la distanza. In un elenco il
dito lancia e passano duecento righe: a quella velocità un orb che scorre a 0,4x
lo scroll non è profondità, è una strisciata.

Quindi la parallasse è accesa **solo dove il contenuto sono card**. Sulla home
gli orb si muovono (verificato: la trasformata cambia scorrendo). Su `/entries`
la stanza sta ferma (verificato: la trasformata non cambia). C'è, dà profondità,
ma non commenta lo scroll. `prefers-reduced-motion` la spegne del tutto come
prima.

Una nota di implementazione che è anche una decisione: quando la parallasse si
spegne cambiando rotta, gli orb vengono riportati a zero esplicitamente. Il
componente non si rimonta fra una rotta e l'altra, e senza quel reset una
trasformata lasciata dalla dashboard resterebbe congelata sull'elenco.

## 3. Il carattere

La giuntura che avevo segnalato io stesso al punto 8, chiusa alla radice.

`@theme inline` dichiarava `--font-sans: var(--font-sans)`: una variabile che
puntava a se stessa e che nessuno definiva. Quindi `font-sans` — cioè l'`html`
intero — cadeva nel sans di sistema, e le uniche schermate in Instrument Sans
erano quelle dove una regola di pagina lo rimetteva a mano. Non era una scelta:
era un refuso che si era fossilizzato in una convenzione.

Adesso il carattere dell'app ha un nome vero (`--font-app-sans`), definito in
`:root`, e vale su tutte le rotte. Di conseguenza sono sparite le regole che lo
rimettevano a mano: `.nlc-ledger` non esiste più (era solo quello, e la classe è
uscita anche dal markup), e `.nlc-glass-home` non dichiara più il font — restano
solo i suoi raggi, che sono un'altra cosa.

## 4. Le rotte che ho verificato

Non le ho lette: le ho **aperte**, tutte, nei due temi, con contenuto vero,
scattando la schermata e passando axe su ciascuna. La prima tornata era inutile
e me ne sono accorto perché tutti i file pesavano uguale: stavo fotografando lo
splash, che resta 1800ms + 450ms di dissolvenza a ogni mount. Rifatte aspettando
che la fiamma se ne andasse.

**17 rotte × 2 temi = 34 schermate. Zero nodi in violazione di contrasto,
ovunque.**

`/` · `/entries` · `/stats` · `/budget` · `/goals` · `/habits` · `/presets` ·
`/insights` · `/reports/monthly` · `/more` · `/account` ·
`/workspace/categories` · `/workspace/members` · `/workspace/imports` ·
`/workspace/budgets` · `/onboarding` · `/login`

In più, `e2e/a11y.spec.ts` passa 8/8.

Due precisazioni oneste su quel test:

- **Il test a11y di `/budget` non è rosso, né prima né dopo.** Il brief lo dava
  per rosso su master e non mio. Ho controllato tornando sul commit base e
  rilanciando la suite: 8/8 verdi anche lì. O dipende da dati che il seed e2e
  non produce (per esempio un budget in stato "sforato"), o da un ambiente
  diverso dal mio. Non l'ho toccato in nessun modo; segnalo solo che con questi
  dati non si riproduce, quindi "non l'ho peggiorato" è vero ma non l'ho nemmeno
  potuto osservare rotto.
- **`/login` e `/onboarding` non hanno la stanza**, perché `AppShell` avvolge
  solo gli utenti autenticati. Hanno la palette e il carattere, quindi non
  stonano, ma sono piatte. Non l'ho forzato: metterci la stanza vuol dire
  toccare la struttura del layout, e non è il lavoro di questo giro.

## 5. Dove voglio un occhio umano

13. **L'intensità della stanza fuori dalla dashboard** (`--env-strength` a 0.4
    in scuro). È il numero su cui ho esitato di più in questo giro. Sulle mie
    schermate con 160 righe regge bene, ma è tarato guardando uno schermo di
    computer: su un telefono vero, di sera e con la luminosità bassa, potrebbe
    risultare o troppo presente o del tutto invisibile. È un numero solo da
    girare, in `globals.css`, sotto `.nlc-room[data-room="quiet"]`.
14. **La stanza dietro i form** (`/entries/new`, `/goals/new`, i form di
    workspace). Sono rotte "quiet" come tutte le altre, quindi la stanza c'è. Su
    un form lungo, dove l'attenzione è su un campo, un fondo con un gradiente
    può essere una distrazione che su una lista non è. Non le ho trattate
    diversamente perché non volevo inventare una terza categoria senza averle
    ridisegnate.
15. **Le sei famiglie di categorie.** L'accorpamento (cibo/caffè/spesa/salute
    insieme, casa/abbonamenti/tech insieme) è una scelta semantica mia, presa
    per non sforare nei colori dei ruoli. "Salute" con il nutrimento è la più
    tirata delle sei. Se le categorie devono restare distinguibili una per una,
    la strada non è aggiungere tinte: è togliere il colore alle categorie e
    lasciar fare all'icona.
16. **Il pallino della tab in chiaro** è l'unico posto in cui ho dovuto scrivere
    un'eccezione alla regola dell'accento (`bg-accent` andrebbe alla campitura,
    ma su chrome chiaro il lime sparisce, quindi lì torna al tratto). Una
    eccezione sola mi sembra un prezzo giusto; se ne servisse una seconda,
    vorrebbe dire che la regola è sbagliata.

## 6. Due cose rotte che ho trovato e non ho sistemato

Non sono di direzione artistica, e il brief dice di annotarle invece di
correggerle. Ma la prima è seria.

- **`/workspace/imports` va in errore a runtime quando ci sono degli import.**
  `src/components/workspace/crafted-import-batch-list.tsx` chiama
  `useBoundLocale()` senza avere `"use client"` in cima: è un componente server
  che invoca un hook client. Il server risponde *"Attempted to call
  useBoundLocale() from the server"* e la pagina non rende. Verificato che
  **precede il mio lavoro**: sul commit base il file è identico su questo punto.
  La correzione è una riga (`"use client"`), ma è un bug di funzionamento, non
  di colore, e preferisco che sia una decisione consapevole di chi mantiene
  quella rotta.
- **`/insights` ha una violazione a11y `aria-prohibited-attr`** (impatto
  "serious"), in tutti e due i temi. Anche questa non c'entra con il colore ed è
  precedente. `/insights` non è fra le rotte coperte da `a11y.spec.ts`, ed è
  probabilmente il motivo per cui è passata inosservata.

## 7. Il mio dissenso

Uno solo, ed è sul brief.

Il brief mi lasciava la porta aperta a dire che la stanza non deve scendere,
purché portassi una ragione che non fosse il costo di calcolo. Non la uso: la
stanza scende, e il fondatore aveva ragione. Ma la ragione per cui aveva ragione
**non è quella che il brief dà per scontata.**

Il brief tratta il problema delle due schermate come un problema di sfondo. Non
lo era. Le due schermate sembravano due app soprattutto per il **colore** e per
il **carattere**: due palette diverse e due caratteri diversi in due schermate
contigue sono una frattura che nessuno sfondo condiviso avrebbe ricucito.
Guardando le schermate dopo il punto 1 e il punto 3 — palette e carattere
promossi, stanza ancora solo in home — `/entries` e `/` erano già chiaramente la
stessa app.

La stanza aggiunge una cosa vera ma più sottile: la dashboard ha *luce* dentro,
e una pagina piatta accanto a una pagina illuminata sembra spenta anche quando i
colori coincidono. Vale la pena portarla, e infatti l'ho portata. Ma se un
giorno bisognasse rinunciare a qualcosa per una ragione di prestazioni su un
telefono lento, l'ordine in cui difendere queste tre cose è: **prima il
carattere, poi la palette, poi la stanza.** La stanza è la più visibile delle
tre e la meno strutturale. È l'unica di cui l'app può fare a meno restando una
sola app.

---

# `/stats`: la prova del nove sulla scala categorica

Questa schermata era l'unico posto dove la direzione artistica poteva essere
smentita dai fatti invece che discussa. La scala categorica dei grafici
(`--chart-1..5`) l'avevo definita con una motivazione precisa — «la
distribuzione per categoria è un dato, non un giudizio» — e poi l'avevo usata su
una barra sola, larga sei pixel, con quattro segmenti. Una regola provata su un
caso è una regola non provata.

## L'esito della prova, in breve

**La scala non ha retto, ma non per la ragione che mi aspettavo.** Non è che
cinque colori fossero pochi. È che su `/stats` la scala categorica **non era
usata affatto**, e che come token conteneva un errore misurabile.

Tre reperti, in ordine di gravità.

**Primo: la scala violava la regola che dichiarava di rispettare.** Nel commento
in `globals.css` c'era scritto che evita «sia il lime sia il corallo». Vero. Ma
nessuno aveva controllato il terzo colore del giudizio: `--chart-1` era
`#9ad9b0` e `--nlc-under` è `#8ad6ab`. **ΔE 4,7.** Non «simili»: lo stesso
colore. Il primo colore della scala nata per non dire giudizi *era* il verde che
nell'app dice «sei sotto budget». La regola era scritta nel commento e smentita
nella riga sotto.

**Secondo: `/stats` non la usava.** Le barre per categoria giravano su quattro
tinte definite in `crafted-stats-build.ts` — `bg-accent`, `bg-foreground`,
`bg-green`, `bg-ink-3` — assegnate per **posizione in classifica**, con
`index % 4`. Tradotto: la prima categoria del mese era dipinta del colore della
CTA, la terza del colore del giudizio positivo, e dalla quinta il giro
ricominciava. Con i dati veri — **diciassette categorie** — il colore non
identificava niente: era un palo da barbiere. E siccome l'indice è la classifica,
«Caffè» cambia colore da un mese all'altro perché cambia la posizione. **Un
colore categorico che cambia quando cambiano i dati non porta informazione:
porta rumore travestito da informazione.**

In tema chiaro la stessa riga produceva un difetto duro: la prima categoria —
quella che si guarda per prima — aveva la barra `bg-accent`, che in chiaro la
regola dell'accento manda alla campitura lime. Lime pallido su carta pallida:
**1,3:1.** La barra della categoria più importante era invisibile.

**Terzo: c'erano due scale categoriche, e non lo sapeva nessuna delle due.**
`--chart-1..5` (cinque tinte, per indice) e le sei famiglie `.nlc-cat-*` (per
identità della categoria, quelle dei chip dell'elenco movimenti) facevano lo
stesso lavoro con due vocabolari diversi. La stessa categoria poteva essere
turchese in una schermata e ambra in un'altra. Due scale categoriche nella stessa
app sono una di troppo, esattamente come lo erano i tre `formatEUR`.

## Cosa ho fatto, e il numero che lo giustifica

**Una scala sola.** `--chart-1..5` non è più una tavolozza a sé: sono le cinque
tinte delle famiglie di categoria. Un vocabolario di colore solo per «che cosa è
questa spesa», in tutta l'app.

**Ri-spaziata, perché non si distingueva.** Le sei famiglie avevano tre azzurri
consecutivi — servizi `#7cc9e8`, spostarsi `#8fb8ee`, abitare `#93a8e8` — con
**ΔE 9,9** fra le due più vicine. Alla dimensione di un chip o di un pallino da
otto pixel, ΔE 10 è lo stesso colore. Adesso la coppia peggiore sta a **ΔE 20,7
in scuro e 18,6 in chiaro**, e la distanza minima da un colore di ruolo è salita
da 17 a **27**.

**E qui arriva la parte da leggere per intera, perché è un limite e non un
risultato.**

## Sei colori non si distinguono se non si vedono i colori. Nessuna scala li distingue.

La domanda del brief era: sono distinguibili per chi non vede bene i colori? Ho
smesso di stimarlo a occhio e l'ho misurato, simulando protanopia e deuteranopia
e ricalcolando le distanze. La risposta è **no**, e non è colpa di queste sei
tinte.

Ho scritto un ottimizzatore che cerca la migliore scala possibile sotto i
vincoli veri: leggibile sul fondo del tema, ad almeno ΔE 20 da tutti e quattro i
colori di ruolo, e il più separata possibile anche per un occhio dicromatico. Su
trecentomila tentativi il tetto è **ΔE 20,7 in tema scuro** — con colori al neon
che in questa palette non possono stare — e **ΔE 13,7 in tema chiaro**, cioè
*sotto la soglia di distinguibilità anche nel caso migliore che esista*. In
chiaro la finestra di luminosità utilizzabile è stretta (L\* 34–58) e le tinte
libere sono poche, perché quattro regioni della ruota sono già occupate dai
ruoli. **Non è un problema di gusto: è un problema di capienza.**

C'è un secondo motivo, ed è più interessante del primo. Si potrebbe rendere una
scala robusta alla dicromazia scalando la **luminosità** invece della tinta: una
categoria chiara, una media, una scura. Ma una scala categorica con luminosità
diverse comincia a dire un'altra cosa — *questa categoria conta più di
quell'altra* — e il peso è precisamente ciò che una scala categorica non deve
codificare. **Le due richieste sono in conflitto diretto.** Ho scelto
l'iso-luminosità (L\* 67–77 in scuro, 36–42 in chiaro) perché la correttezza
semantica viene prima, e ho accettato la conseguenza.

**La conseguenza, dichiarata come regola:** il colore categorico in questa app
non porta mai informazione da solo. Deve sempre stare accanto a un canale che
non è colore. Dove questo non era vero, l'ho reso vero.

## Dove il colore serve davvero: un posto, e non è questa pagina

Passando le due schermate ho capito che la domanda giusta non era «quanti
colori», ma «in quanti punti il colore è l'unico legame possibile». La risposta è
**uno solo in tutta l'app**: la barra segmentata della dashboard, dove un
segmento e la sua riga non hanno nessun altro modo di riconoscersi.

E proprio lì il legame **non c'era**: i segmenti erano colorati, le righe sotto
no. Cinque tinte che non collegavano niente, e l'unico appiglio era l'ordine. Ora
ogni riga porta il suo segno di colore, e il colore è diventato ridondante con la
posizione e con il nome — che è la sola condizione a cui è lecito affidargli
qualcosa.

Su `/stats` di grafici ad asse condiviso non ce n'è nessuno: diciassette righe,
ognuna con icona, nome, percentuale e importo. **Lì il colore per categoria non
serviva a identificare, serviva a decorare, e decorando mentiva.** Quindi ho
separato i due lavori, ed è la decisione centrale di questa pagina:

- **l'identità sta sull'icona**, tinta con la famiglia della categoria — la
  stessa tinta che quella categoria ha nei chip dell'elenco movimenti. «Caffè» è
  lo stesso oggetto nelle due schermate, e non si sposta quando si sposta la
  classifica;
- **la quantità sta sulla barra**, che è di un inchiostro solo. Una barra misura
  una cosa sola: non ha bisogno di cambiare colore per dirla. Quattro tinte
  alternate su una colonna di barre affiancate facevano sembrare *diverse*
  quantità che erano soltanto *diverse categorie*.

## La heatmap: mancava una scala, e nessuno se n'era accorto

Il pezzo più grosso (654 righe) aveva il problema più semplice da nominare e il
più profondo da risolvere: **la palette aveva due scale e ne servivano tre.**

C'era il categorico (un dato) e c'era il giudizio (sotto / in tensione /
sforato). Non c'era il **sequenziale**: una quantità che cresce. La heatmap della
spesa giornaliera è esattamente quello, e non trovando una scala propria si era
presa quella dell'accento: `bg-accent/10` … `/60`. **Trentun celle del colore che
in questa app significa «premi qui», su una griglia in cui non si preme niente.**
In più, siccome in tema chiaro `--accent` è l'oliva dell'inchiostro e in scuro è
il lime, la stessa heatmap aveva **due identità diverse nei due temi**: un
oggetto che cambia natura cambiando tema non è un oggetto.

La scala nuova non è un colore. È **inchiostro**: `--foreground` mescolato dentro
`--background`. Più soldi sono usciti, più il giorno è stampato denso. È la
metafora che l'app già usa — il registro, la carta — e ha tre proprietà che un
colore non avrebbe avuto:

1. **Segue i due temi senza una seconda tabella di valori.** Una formula, non
   dodici numeri da tenere allineati a mano. (È la quarta volta in questo
   documento che una costante duplicata si sfasa; qui non c'è la costante.)
2. **È monotona, quindi si legge senza distinguere i colori.** Una heatmap a
   tinta unica è l'unica heatmap onesta, e risolve da sola il problema che la
   scala categorica non può risolvere.
3. **È opaca.** Sembra un dettaglio tecnico ed è la parte più importante, perché
   collega la heatmap alla domanda sulla stanza.

### Perché l'opacità non è un dettaglio: le celle erano velature sopra la stanza

`bg-accent/10` è una velatura, e una cella velata sopra un fondo vivo prende il
colore di quel fondo. La stanza c'è anche qui, e gli orb si muovono. Significa
che **il livello apparente di un giorno dipendeva da cosa gli passava dietro**:
due giorni con la stessa spesa potevano leggersi diversi perché uno stava sopra
un orb e l'altro no.

Un grafico il cui valore dipende dallo sfondo non sta misurando niente. Adesso le
celle sono opache per costruzione, e la stanza non può più entrare dentro un
dato.

### Le fermate non sono regolari, e c'è una ragione

16 / 28 / 40 / 68 / 88%. Il salto fra il terzo e il quarto gradino è il doppio
degli altri, di proposito: **salta la fascia centrale di luminanza in cui né
l'inchiostro chiaro né quello scuro arrivano a 4,5:1** sul numero del giorno. È
il problema classico delle rampe monocrome, e si risolve non passandoci.
L'inchiostro si ribalta al livello 4 in tutti e due i temi — la simmetria non
l'ho cercata, è caduta così — e il salto di ΔE 24 in quel punto rinforza la
lettura invece di disturbarla. Ogni gradino sta a ΔE ≥ 9 dal precedente.

### La settima colonna era tagliata

A 360px la griglia era `min-w-[21rem]` (336px) dentro un contenitore che ne
misura 320. **La settima colonna finiva fuori, e per vederla si doveva scorrere
lateralmente di sedici pixel.** Un calendario che scorre di sedici pixel non si
legge come «c'è dell'altro»: si legge come rotto. Ora la griglia sporge di 12px
per lato — 344px — e le sette colonne entrano intere, con la cella a **44px
esatti**, che è anche la misura minima di un bersaglio da toccare. Verificato in
pagina: `scrollWidth == clientWidth`, nessuno scroll orizzontale.

### La leggenda serve, ma non quella che c'era

Mostrava **sei** caselle, e la prima era il livello 0, «nessuna spesa». Ma zero
non è «meno»: è un'altra cosa. Infilarlo in fondo a una rampa che va da «meno» a
«più» dice che un giorno senza spese è un giorno di spesa piccola. La leggenda
adesso ha i cinque livelli che sono davvero una quantità.

L'altra cosa che è cambiata è **a chi parla**. Le caselle portavano il valore in
euro dentro un attributo `title`: su un telefono il `title` non si apre mai, e
con `aria-hidden` non lo leggeva nemmeno uno screen reader. Era un numero scritto
per nessuno. Adesso il massimo del mese è il nome accessibile del gruppo — e
senza il massimo, «più speso» non ha unità di misura, perché la scala è relativa.

Sono anche sparite due cose: l'etichetta **«FUT»** da ventidue celle su trentuno
(che il giorno non sia arrivato lo dice già lo spegnimento; ventidue volte non è
informazione, è un motivo — resta nel nome accessibile della cella) e il
**pallino sui giorni vuoti**, che c'era al 20% di opacità. Un segno che compare
sempre non segna niente.

## La stanza: resta `quiet`, e adesso ho un argomento che prima non avevo

La decisione è: **`/stats` resta `data-room="quiet"`.** Ma la ragione non è
«perché lo erano le altre».

`/stats` è **carta**, come `/entries`: non c'è nessuna lastra di vetro, quindi
non c'è nessuna lente che trasformi gli orb in luce. Vale la regola già scritta —
gli orb sono oggetti, e per leggersi come luce hanno bisogno del vetro davanti.
Alzare l'ambiente qui vorrebbe dire mettere dischi dietro dei numeri.

L'argomento nuovo è più forte ed è specifico di questa pagina: **è l'unica
schermata dove l'ambiente poteva entrare dentro un dato.** Altrove la stanza sta
dietro del testo, e il testo o si legge o non si legge — è un problema di
contrasto, e il contrasto si misura. Qui la stanza stava dietro delle *campiture
che codificavano un valore*, e una velatura sopra un fondo vivo cambia valore.
Non è un problema di leggibilità: è un problema di verità.

La risposta giusta però non era abbassare la stanza: era **togliere l'alpha ai
dati**. Un grafico non deve chiedere all'ambiente di stare fermo, deve essere
opaco. Fatto questo, la stanza a 0,4 può restare esattamente com'è, e ci resta.

## Gli importi: tutti da `Amount`, e il motivo principale non è la coerenza

Su questa pagina i soldi si scrivevano in **tre** modi: `formatCraftedCompact`
con il simbolo in coda e **in lime** (`119€`), `formatMoney` con il simbolo
staccato secondo la locale (`-676,00 €`), e `CraftedAmount` con la sua scala.
Nella riga sotto la heatmap i primi due comparivano **nella stessa frase**:
«progressivo: 1016€ … -676,00 € rispetto…». Adesso passa tutto da `Amount`, che è
l'oggetto dell'app. Con questo se ne va anche il **simbolo di valuta in lime**,
che era in sei punti: il lime è azione, e una `€` non è un pulsante.

Ma il motivo che conta di più non è l'ordine. **L'importo eroe era un odometro
che conta salendo da zero.** Vuol dire che nell'HTML che il server manda, e per
tutto il tempo che il JavaScript ci mette ad arrivare, **questa pagina dichiarava
di aver speso 0,00 €** — su una schermata che esiste per dire quanto hai speso.
L'ho vista con i miei occhi nella prima tornata di schermate: tre zeri grandi,
«SPESO 0», «MOVIMENTI 0». Con `Amount` il numero è giusto già nel markup.
Un'animazione che costa la verità del primo fotogramma non è un'animazione, è un
difetto con una curva di easing.

`Amount` ha imparato un terzo segno, `delta`. La regola esistente diceva: il
segno si scrive solo dove è un'eccezione da leggere. Una differenza fra due
periodi è il caso opposto — lì **il segno è il contenuto** — e si scrive sempre,
con il meno vero (−) e non con un trattino.

## Due difetti di correttezza, corretti e dichiarati

Come nei giri precedenti: se è aritmetica o è rottura, si corregge e si scrive.

**1. Il grafico degli ultimi dodici mesi non disegnava niente.** La riga delle
barre era `items-end`, che toglie lo stretch alle colonne; le colonne prendevano
l'altezza del contenuto, quindi il contenitore della barra — un `flex-1` senza
altezza definita — non poteva risolvere la percentuale. Misurato in pagina:
`height: 100%` e `height: 10,64%` rendevano **tutte e due 3px**, cioè il
`min-height`. **Dodici mesi di spesa disegnati come barre identiche, qualunque
fosse la spesa.** Il calcolo era giusto — `heightPct` esce corretto dal build, e
non l'ho toccato — era il CSS a non farlo vedere. Adesso le stesse percentuali
rendono 10px, 98px e 17px.

È il difetto che dimostra perché le schermate vanno guardate: leggendo il codice
quel grafico è corretto. Solo aprendolo si vede che non c'è.

**2. Ventidue celle su trentuno erano sotto la soglia di contrasto, e il test era
verde.** La cella futura portava `opacity-45` sull'intero bottone. Misurato: il
numero del giorno dava **2,17:1 in scuro e 1,76:1 in chiaro**. Axe non lo
segnalava, e vale la pena sapere perché: su un fondo dichiarato in
`color(srgb …)` — che è ciò che `color-mix()` produce — e composto con
un'opacità, la regola di contrasto di axe esce **«incomplete»** e non
«violation», quindi il filtro serious/critical la lascia passare. **Il test
passava e il testo era illeggibile.**

Ora il giorno vuoto e il giorno futuro si distinguono per inchiostro invece che
per opacità — sono due assenze diverse, e nessuna delle due è «poco speso» — e la
cella peggiore sta a **4,65:1 in scuro e 5,21:1 in chiaro**. Misurati, non
dedotti.

## Gli elementi costruiti sulla funzione morta, e cosa ne farei

Il vincolo dice di non rimuoverli e di scriverne. Ne ho trovati **sei**, e non si
equivalgono. In ordine di costo:

1. **`crafted-top-savings-list.tsx` — «Impatto positivo».** Una sezione intera,
   con titolo, sottotitolo, elenco e stato vuoto: la superficie più grande che la
   funzione morta occupa in tutta l'app. **Raccomandazione: è la prima da
   togliere se la decisione si prende.** Non perché sia fatta male — l'ho
   ridisegnata e adesso sta bene — ma perché è l'unica che occupa spazio *in
   proporzione al proprio valore dichiarato* invece che al proprio valore reale.
2. **«Impatto netto» nel trio del bilancio.** Sta accanto a «Speso» in un
   riquadro della stessa dimensione, e con i dati veri scrive **€0,00**. Tre
   riquadri uguali dicono che i tre numeri contano uguale: è lo stesso difetto
   che avevo già risolto sulla testata di `/entries` mettendoli in gerarchia.
   **Raccomandazione: applicare qui la stessa cura** — fuori dal trio, giù nelle
   postille, visibile solo se maggiore di zero. Non l'ho fatto perché `StatTrio`
   è condiviso con `/reports/monthly`, e toccarlo qui significa deciderlo anche
   là.
3. **«Dettagli del periodo»** (il `<details>` richiudibile): «Avresti speso»,
   «Impatto medio», «Indice netto» — **tre metriche su tre** costruite sulla
   funzione morta. **Raccomandazione: è il posto giusto dove sono.** È già chiuso
   di default e non costa niente a chi non lo apre. Se la funzione resta, questo
   è il modello: sotto una piega, non nel flusso.
4. **«Impatto netto» sotto ogni categoria**, in serif corsivo, solo quando è > 0.
   Costo basso e condizionato. **Raccomandazione: tenerlo** finché resta
   l'elenco; sparisce da solo quando il dato è zero.
5. **«… impatto netto» nella riga della categoria principale.** Stesso caso,
   stessa raccomandazione.
6. **La colonna del risparmio in «Impatto positivo»**, tinta con `--avoided-ink`.
   Segue la sorte del punto 1.

Il mio parere complessivo non è cambiato rispetto a quello che avevo scritto per
`/entries`, e adesso ho un numero in più a sostegno: su questa pagina la funzione
morta occupa **una sezione, un terzo del trio principale, l'intero pannello dei
dettagli e due postille**. È la funzione più rappresentata di `/stats`, e vale
19,20 € su 320 movimenti. Il criterio che proponevo resta lo stesso e resta
misurabile: **se in tre mesi nessuno apre «Dettagli del periodo» e nessuno usa il
filtro «Confronti», la funzione non esiste già adesso** — esiste solo il suo
costo.

## Cosa ho deliberatamente non fatto

- **Nessuna metrica nuova, nessun grafico nuovo.** Non ho aggiunto medie,
  proiezioni, confronti né un secondo asse. I blocchi sono quelli che c'erano,
  nello stesso ordine.
- **Nessuna metrica rimossa**, compresi i sei elementi qui sopra: ridisegnati e
  segnalati, non cancellati. La decisione di prodotto non è mia.
- **Non ho toccato i calcoli.** `heightPct`, `getIntensityLevel`, le soglie della
  rampa (0,2 / 0,4 / 0,6 / 0,8), `savingRatePercent`, i totali: invariati. Del
  grafico dei dodici mesi ho corretto il CSS che impediva di *vedere* il calcolo,
  non il calcolo.
- **I filtri restano, con la loro logica.** Periodo, persona e mese fanno
  esattamente quello che facevano. Ho cambiato tre cose: le etichette passano da
  `src/lib/i18n` invece di essere italiano scritto a mano, la griglia diventa a
  tre colonne pari perché a 360px «Tutti i movimenti» finiva sotto la freccia e
  «Agosto 2026» usciva dal bordo, e il periodo «anno» smette di tingersi di
  lime — un filtro attivo è uno **stato**, non un'azione, ed è la regola già
  scritta per il segmentato dell'elenco.
- **Non ho allineato la heatmap ai giorni della settimana.** Vedi sotto: è la
  cosa su cui voglio più di ogni altra un occhio umano, ed è una decisione di
  prodotto, non di colore.
- **Non ho toccato il popover del confronto** oltre a portarlo sulla scala del
  giudizio per nome (`--nlc-over` / `--nlc-under` invece degli alias
  `destructive` / `green`, che sono la strada da cui il giudizio era finito
  scritto con i colori del brand).
- **Nessuna libreria di grafici.** Tutto CSS, `color-mix` e lucide. Nessuna
  dipendenza nuova.

## Dove voglio un occhio umano

17. **La heatmap ha sette colonne e non sono i giorni della settimana.** Il
    giorno 1 sta sempre nella prima colonna: è un a capo ogni sette, non un
    calendario. Il 1º agosto 2026 è un sabato, e nella griglia sta di «lunedì».
    Una griglia a sette colonne di giorni ha un'affordance fortissima — chiunque
    la legge come un calendario, e chi cerca «i miei sabati» legge una cosa
    falsa. Le strade sono due e sono opposte: allinearla ai giorni della settimana
    (ma è una decisione di prodotto, aggiunge celle vuote in testa e cambia cosa
    la griglia afferma) oppure **rompere la griglia di sette** e darle un numero
    di colonne che non evochi la settimana. Non l'ho fatto perché è la scelta che
    cambia il significato della schermata, non il suo aspetto. **È la prima cosa
    che guarderei.**
18. **La cella al livello 5 in tema scuro è quasi bianca** (`#d2d7d0`). È
    corretta — più inchiostro, più spesa — ed è il gradino che rende leggibile il
    numero sopra. Ma su una pagina scura cinque quadrati quasi bianchi sono la
    cosa più forte della schermata, più dell'importo eroe. A me sembra giusto che
    il giorno in cui hai speso di più sia la cosa che salta all'occhio; a un altro
    occhio potrebbe sembrare che la heatmap urli. Si abbassa portando l'ultima
    fermata da 88% a ~78% in `.nlc-heat-5`: un numero solo.
19. **La scala categorica e la dicromazia: ho accettato un limite, non l'ho
    risolto.** La misura dice che non è risolvibile mantenendo l'iso-luminosità, e
    che l'iso-luminosità è semanticamente obbligatoria. La mia conclusione è che
    il colore non deve mai essere l'unico canale, e l'ho reso vero nei due punti
    dove non lo era. Ma **se un giorno servisse un grafico in cui il colore è
    davvero l'unico canale possibile, quel grafico non si può fare in questa
    palette** — e la risposta giusta sarà cambiare il grafico, non aggiungere
    tinte. Vorrei che questa frase la leggesse qualcuno che non sono io.
20. **`crafted-person-filter.tsx` non è montato da nessuna parte.** Il filtro per
    persona che si vede è la `select` dentro `CraftedStatsPeriodFilter`; questo
    file è una seconda implementazione della stessa scelta, in un'altra forma (tab
    sottolineate), con l'etichetta in italiano scritto a mano e con il lime a dire
    «selezionato». Non l'ho tolto perché il brief dice che i filtri restano — ma
    questo non è un filtro, è un filtro *che non c'è*. **La mia raccomandazione è
    cancellarlo:** finché resta è codice che nessuno vede e che nessuno aggiorna,
    e la prossima persona che cerca «il filtro persona» troverà per primo quello.
21. **`--chart-1..5` e le famiglie sono adesso le stesse tinte, ma restano due
    nomi.** L'ho lasciato di proposito: `--chart-*` è la convenzione di shadcn e
    qualcosa fuori dal nostro codice potrebbe leggerla. Ma sono due nomi per una
    cosa sola, ed è esattamente la condizione da cui nascono le divergenze — è
    successo già tre volte in questo documento. Se nessuno dipende da quei nomi,
    andrebbero unificati.
22. **Lo splash è rimasto indietro rispetto alla soglia.** Non è `/stats` e non
    l'ho toccato, ma l'ho visto a ogni apertura: `app-splash.tsx` ha il fondo
    `#0a0a09` scritto a mano — il **nero caldo della vecchia palette**, non
    `#0b1512` della stanza — e la fiamma di `FlameSplash` ha la `€` **oro**.
    Questo documento dà la nota per chiusa («la soglia è il nero della stanza e la
    fiamma è lime»): è vera per lo shell di bootstrap in `globals.css`, non per il
    componente React che gli sta sopra per 1800ms. È la prima cosa che si vede
    dell'app, ed è ancora sull'altra direzione artistica.

## Nota tecnica per chi tocca questo codice

La rampa dell'intensità sta in `globals.css`, in `@layer components`, come
`.nlc-heat-0` … `.nlc-heat-5` più `.nlc-heat-future`. Nasce da
`color-mix(in srgb, var(--foreground) N%, var(--background))`: **`in srgb` non è
un dettaglio** — le fermate sono state scelte misurando l'interpolazione in sRGB,
e passare a `oklab` le sposta e rimette il livello 3 nella fascia in cui nessuno
dei due inchiostri arriva a 4,5:1. Se si cambia una fermata vanno ricontrollate
due cose insieme: il ΔE dal gradino precedente (≥ 9) e il contrasto del numero
del giorno, che si ribalta fra il livello 3 e il 4.

I due stati di assenza — `.nlc-heat-0` (giorno senza spese) e `.nlc-heat-future`
(giorno non ancora arrivato) — condividono il fondo e si distinguono per
inchiostro. Non si distinguono per opacità, e non devono tornare a farlo: un
`opacity` sul bottone moltiplica anche il testo, e la regola di contrasto di axe
su un fondo `color(srgb …)` composto con l'opacità esce «incomplete» — il test
resta verde mentre il testo diventa illeggibile. `--heat-ink-future` esiste solo
in tema chiaro, dove `--ink-3` si ferma a 4,35:1.

La griglia della heatmap sporge di 12px per lato (`-mx-3` dentro un `px-5`): è
quello che a 360px fa entrare sette colonne da 44px esatti. Se cambia il padding
di pagina o il `gap`, la cella scende sotto i 44px e il bersaglio non è più
toccabile: i tre numeri vanno cambiati insieme.

`getCategoryIdentity()` ha adesso un quarto campo, `inkClassName`: solo il tratto
(`color: var(--cat)`), per l'icona dentro un elenco fitto, dove la campitura
farebbe una piastrella e la piastrella farebbe un coriandolo.

Gli strumenti con cui ho misurato la palette — distanze ΔE, simulazione della
dicromazia, ottimizzatore della scala, contrasto delle celle misurato in pagina —
non sono nel repository: stanno in `.nlc-tools/`, che è in `.gitignore`. Sono
ricostruibili, ma i numeri che contano sono scritti qui.

---

# `/more`: un indice deve avere una grammatica, non una vetrina

Questa pagina aveva già il colore giusto, ma non aveva ancora preso una
posizione. Si presentava come una sequenza di righe divisa in «Gestione»,
«Workspace», «App» e «Account»: quattro nomi che descrivevano **dove il codice
salva le funzioni**, non perché una persona le cerca. Budget e categorie erano
separati dagli obiettivi; il report era accanto ai preset; privacy ed export
stavano sotto il tema. La divisione esisteva, ma non produceva orientamento.

La tesi di questo giro è semplice: **`/more` non è un cassetto degli avanzi, è
l'indice dell'app.** Un indice non ha bisogno di un numero eroe o di una lastra
che gli dia importanza. Ha bisogno di parole esatte, gruppi che reggano a memoria
e un ritmo in cui il pollice capisca dove una famiglia finisce prima ancora di
aver letto il titolo successivo.

## I gruppi adesso seguono l'intenzione

Le voci sono tutte quelle di prima, ma l'ordine ora risponde a sei domande
riconoscibili:

1. **Organizza:** obiettivi, budget, preset e categorie. Sono i quattro posti in
   cui si decide la struttura futura dei soldi, non quattro implementazioni
   diverse.
2. **Capisci:** report mensile e Pattern. Prima uno stava in «Gestione» e
   l'altro sembrava solo un'altra riga; adesso sono le due letture del dato — una
   periodica, una comportamentale.
3. **Spazio:** partecipanti, creazione di un altro workspace, invito e ingresso
   tramite link. Qui il soggetto non sono i soldi ma il perimetro umano che li
   condivide.
4. **Dati:** import CSV e privacy. Una porta fa entrare dati, l'altra spiega come
   vengono trattati. Metterle vicine rende visibile una responsabilità che
   «App» nascondeva.
5. **Preferenze:** valuta, lingua, tema e installazione PWA. Sono modi in cui
   l'app si adatta al contesto, non contenuti del workspace.
6. **Account:** eliminazione ed uscita. Restano in fondo e senza enfasi
   cromatica: sono azioni reali, ma non devono competere con la navigazione
   quotidiana.

Questa tassonomia non cambia permessi né disponibilità. Le voci legate al
workspace continuano a comparire soltanto quando il workspace esiste; login,
logout e cancellazione conservano le condizioni precedenti; inviti, join,
selettori, installazione ed export eseguono esattamente le stesse azioni. Sono
state spostate le frasi sulla pagina, non le regole del prodotto.

## La carta non ha bisogno di sei scatole

`/more` resta una pagina `quiet`, quindi **carta**, come `/entries` e `/stats`.
Non ho trasformato i sei gruppi in sei card: sarebbe stato un modo costoso di
ridisegnare i separatori che c'erano già. Il raggruppamento lo fanno spazio,
eyebrow e ordine. I filetti esistono solo fra righe della stessa famiglia; fra
due famiglie c'è respiro, non un altro bordo.

La testata ora dichiara finalmente una gerarchia semantica: «Profilo» è
l'eyebrow, il nome è l'unico `h1`, il workspace scende nella voce serif che
commenta. Prima non c'era nessun heading in tutta la pagina: nome, sezione e
dettaglio erano tre paragrafi che il CSS rendeva diversi. Un indice senza titoli
nel markup è un indice solo per chi lo vede.

Ogni destinazione ha una riga da almeno 64px e un'icona in un incasso opaco da
36px. L'incasso non è una terza lastra: niente blur, niente ombra, niente bordo;
è `--surface-muted` pieno, cioè il gradino piatto che la carta usa per tenere
fermo un segno. Le icone sono diventate specifiche — tag per le categorie,
portafoglio per il budget, persone per i membri, file in ingresso per il CSV —
perché qui l'icona deve abbreviare la scansione, non decorare undici righe con
tre simboli ripetuti.

I controlli più piccoli (lingua, tema, valuta e join) hanno ora un bersaglio
minimo di 44×44px e un focus visibile. Lingua e tema non usano più il lime per
dire «selezionato»: il lime è azione, mentre una preferenza corrente è uno
stato. Il sottolineato passa all'inchiostro neutro; il lime resta al focus e
alla CTA «Genera link invito», dove davvero succede qualcosa.

Non c'è nessuna animazione nuova. Su una pagina che porta altrove il movimento
non ha una distanza da spiegare: la risposta alla pressione basta. Con
`prefers-reduced-motion: reduce` non resta nessuna animazione attiva nel
contenuto di `/more`.

## L'export per analisi AI: resta, ma smette di fingersi una destinazione

Era l'elemento anomalo perché faceva due cose contraddittorie insieme: stava nel
flusso delle preferenze come un controllo, ma si presentava con un'etichetta
«Export AI», un secondo titolo «Export per analisi AI», una descrizione e due
pulsanti. Non era una riga e non era una sezione; era una piccola card infilata
dove avanzava posto.

**Merita di restare, ma sotto “Capisci” e con il peso di uno strumento.** Report
e Pattern sono destinazioni; l'export è il gesto con cui si porta la stessa
materia fuori dall'app per leggerla altrove. Perciò arriva dopo quelle due righe
in un unico incasso opaco, senza vetro e senza una seconda eyebrow ridondante.
L'incasso gli dà abbastanza superficie per spiegare le due portate — mese o
storico — ma non lo promuove a terza destinazione primaria. Nasconderlo in un
`details` avrebbe accorciato la pagina aggiungendo però un gesto prima del
download; non c'era nessun argomento d'uso che giustificasse quell'attrito.

Il feedback dell'export era `bottom-4`: su mobile nasceva dietro la barra
inferiore. Ora si appoggia sopra la geometria del chrome e torna a `bottom-4`
da `md` in su. Anche qui niente vetro: il toast è fondo opaco, perché un
messaggio di esito non può dipendere da ciò che gli scorre dietro.

Il file `ai-analysis-export-card.tsx` da una riga non era morto, ma era un ponte
senza lavoro: il wrapper lazy importava il ponte, che riesportava il componente
vero. Il caricamento differito resta identico e punta direttamente a
`crafted-ai-analysis-export.tsx`; il ponte è stato rimosso. Una sola identità
per una sola cosa.

## Il contrasto che il test verde non vedeva, corretto e dichiarato

In tema chiaro `--ink-3` misura **4,61:1** sul fondo piatto. Sembrava sufficiente
e axe non riportava violazioni, ma qui il fondo non è una costante: c'è l'aura
`quiet`, e l'export usa un incasso `--surface-muted`. Il calcolo sui colori
effettivi dava **4,35:1** per la descrizione dell'export sul suo incasso; il
campionamento dei pixel realmente resi, ripetuto lungo lo scroll, portava alcune
postille sulla carta fino a **3,99:1**. Axe le classificava come
`color-contrast incomplete` — sessanta nodi — quindi una suite verde non stava
dicendo che fossero leggibili.

La correzione è locale: i testi secondari e i label dei controlli di `/more`
passano a `--muted-foreground`. In chiaro misura **7,01:1** sulla carta base e
**6,60:1** sull'incasso opaco; in scuro 11,21:1 e 8,75:1. Nessun token globale è
cambiato. Dopo la correzione il campionamento non trova testo sotto 4,5:1; il
minimo dell'intero viewport è 4,52:1 ed è una voce inattiva del chrome
condiviso, non il contenuto di `/more`.

Verificato in browser a 360, 390 e 430px, chiaro e scuro, più il caso iPhone in
cui compare l'installazione PWA: nessun overflow orizzontale, tutte le undici
destinazioni presenti, zero violazioni WCAG 2 AA da axe. Gli `incomplete`
restano, come previsto dai fondi compositi; per questo il verdetto viene dai
rapporti calcolati e dai pixel, non dal semaforo del test.

## Gli elementi costruiti sulla funzione morta, e cosa ne farei

Su `/more` ne ho trovati due. Uno è visibile, l'altro viaggia nei dati.

1. **La descrizione di “Obiettivi”: «Mete alimentate dall'impatto positivo».**
   Non è una sfumatura di copy: la progressione degli obiettivi è costruita
   sulla stessa quantità che vale 19,20 euro su 320 movimenti. Non ho tolto né
   indebolito la voce, perché gli obiettivi sono una funzione autonoma e la
   decisione di prodotto è aperta. **Raccomandazione:** se le spese evitate
   vengono ritirate, non ritirare gli obiettivi insieme a loro; separare la
   progressione dall'«impatto positivo» e darle un'alimentazione che esista nei
   dati reali (manuale o legata a una regola di budget). Finché non si decide,
   il copy deve restare esplicito: nascondere il legame renderebbe il problema
   meno visibile, non meno vero.
2. **Il CSV dell'export AI.** La superficie non promette risparmio, ma il file
   esportato contiene una famiglia intera di colonne costruite sulla funzione:
   `savedAmount`, `wouldHaveSpent`, `savingImpact`, `avoidedAmount`,
   `comparisonSaved`, `grossPositiveImpact`, `netImpact` e relativi totali.
   Non le ho toccate: rimuoverle ora romperebbe un contratto dati e sarebbe una
   decisione di prodotto presa dentro un redesign. **Raccomandazione:** se la
   funzione viene chiusa, versionare lo schema dell'export, deprecare questi
   campi con una finestra dichiarata e lasciare al centro `spentReal`, categorie
   e condivisione. Il controllo di download va mantenuto: è utile anche senza
   una sola colonna di «impatto».

Preset e report possono contenere movimenti evitati nelle schermate a cui
portano, ma le due voci di questo indice non sono costruite su quella funzione:
rimangono utili con sole spese reali. Non le conto per gonfiare il catalogo.

## Cosa ho deliberatamente non fatto

- **Nessuna voce aggiunta, rimossa o rinominata come destinazione.** “Pattern”,
  budget, import, categorie, membri, privacy, account: gli undici `href` sono
  gli stessi. Sono nuovi solo i nomi dei gruppi, tradotti in italiano e inglese.
- **Nessuna logica spostata.** Server action, fetch dell'export, range, rate
  limit, permessi, visibilità e selezione del workspace sono invariati. La
  verifica non ha eseguito seed, migrazioni, export o azioni di prodotto sul
  database reale.
- **Nessun foglio o scheda di vetro.** L'unica campitura importante è l'incasso
  piatto dell'export; trasformare ogni gruppo in una `nlc-glass-card` avrebbe
  contraddetto la natura di indice e moltiplicato i materiali durante lo scroll.
- **Nessun hero, nessun riepilogo, nessuna metrica.** Questa pagina non misura:
  orienta. Darle un numero grande sarebbe stato importare la gerarchia della
  dashboard nel posto sbagliato.
- **Nessun token globale cambiato.** Il difetto di contrasto aveva una cura
  locale e l'ha ricevuta. Le altre rotte non pagano una correzione nata qui.
- **Nessuna rimozione silenziosa della funzione morta.** I due legami trovati
  restano nel codice e sono esposti qui con una raccomandazione di prodotto.

## Dove voglio un occhio umano

23. **Il peso dell'incasso dell'export, soprattutto in scuro.** È
    deliberatamente più presente di una riga perché contiene due azioni, ma
    meno importante del titolo «Capisci» e delle due destinazioni sopra. Se a
    un occhio reale sembra ancora la cosa più importante della pagina, la
    correzione è abbassare il gradino della campitura, non nasconderlo dietro
    una disclosure.
24. **“Capisci” come nome di gruppo.** È il verbo più preciso: report e Pattern
    servono a capire, non genericamente ad «analizzare». Ma è anche l'unico
    titolo all'imperativo implicito. Se in uso suona prescrittivo, «Letture» è
    l'alternativa; non la sceglierei senza sentirla accanto al lessico reale del
    prodotto.
25. **La doppia presenza del profilo in cima.** Il chrome mostra le iniziali e
    il workspace; la pagina ripete le iniziali, aggiunge il nome per esteso e
    rende esplicito il tipo di spazio. Per me non è duplicazione: il primo è un
    controllo globale, il secondo è il titolo del documento. Su un telefono
    vero, però, sono a pochi centimetri; è il punto da guardare prima di ridurre
    ancora la testata.
26. **La CTA di invito mentre passa sotto il velo inferiore.** La riserva in
    fondo garantisce che a fine scroll tutto resti sopra il chrome, ma durante
    lo scorrimento il pulsante lime attraversa la fascia velata come qualunque
    altro contenuto. È coerente con la decisione già presa per la barra; qui è
    più evidente perché la campitura è forte. Va giudicato con il dito, non su
    una schermata full-page che congela la barra a metà documento.
