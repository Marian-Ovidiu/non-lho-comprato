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
