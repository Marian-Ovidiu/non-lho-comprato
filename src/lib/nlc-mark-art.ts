/* Il monogramma NLC, in un quadrato 100×100.
 *
 * Tre segni e una regola: la C è un contenitore che non si chiude, la N e la L
 * stanno dentro e condividono una sola verticale. Quella verticale è il punto
 * del disegno — se le due lettere fossero staccate sarebbero due iniziali
 * accostate, unite sono una cosa sola.
 *
 * La geometria vive qui e non nei componenti perché il guscio che dipinge il
 * primo fotogramma gira prima di React e ha bisogno degli stessi numeri: due
 * copie della stessa curva vorrebbero dire due marchi che divergono al primo
 * ritocco. */

export const MARK_CENTER = 50;
export const MARK_RADIUS = 34;

/* L'apertura della C guarda a destra e vale 60°. Più stretta si legge come una
 * O e il contenitore sembra chiuso; più larga, a 32px la lettera si sfalda. */
const GAP_HALF_ANGLE_DEG = 30;

function pointOnRing(angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;

  return [
    Number((MARK_CENTER + MARK_RADIUS * Math.cos(rad)).toFixed(2)),
    Number((MARK_CENTER - MARK_RADIUS * Math.sin(rad)).toFixed(2)),
  ];
}

const [ringStartX, ringStartY] = pointOnRing(GAP_HALF_ANGLE_DEG);
const [ringEndX, ringEndY] = pointOnRing(-GAP_HALF_ANGLE_DEG);

/** La C: un arco che parte in alto a destra e gira dalla parte lunga. */
export const MARK_RING_PATH = `M ${ringStartX} ${ringStartY} A ${MARK_RADIUS} ${MARK_RADIUS} 0 1 0 ${ringEndX} ${ringEndY}`;

/** L'anello intero, per l'alone che gira nello splash. */
export const MARK_FULL_RING_PATH = `M ${MARK_CENTER} ${MARK_CENTER - MARK_RADIUS} A ${MARK_RADIUS} ${MARK_RADIUS} 0 1 1 ${MARK_CENTER - 0.01} ${MARK_CENTER - MARK_RADIUS} Z`;

/** L'asta sinistra della N. */
export const MARK_N_STEM_PATH = "M 33 56 L 33 35";
/** La diagonale della N, che scende verso la verticale condivisa. */
export const MARK_N_DIAGONAL_PATH = "M 33 35 L 49 56";
/** La verticale che la N presta alla L, e il piede della L. */
export const MARK_NL_JOIN_PATH = "M 49 34 L 49 66 L 67 66";

export const MARK_RING_WIDTH = 6.5;
export const MARK_LETTER_WIDTH = 5.6;

/* Lo spessore verde dietro la C. Va tenuto basso: più lo si sposta o lo si
 * schiarisce, più smette di leggersi come il fianco del contenitore e diventa
 * un secondo anello disallineato. */
export const MARK_DEPTH_OFFSET = "translate(1,2.2)";
export const MARK_DEPTH_OPACITY = 0.42;
export const MARK_DEPTH_WIDTH = 5.6;

/* Il verde del marchio. La tavola del progetto dà #899C5E, che su nero a 32px
 * si spegne contro il fondo; il verde dell'anello nel video è più acceso. Questo
 * sta in mezzo ed è l'unico posto in cui cambiarlo. Non è `--accent` dell'app
 * (#d1f975) di proposito: le icone del sistema operativo vivono fuori dal CSS
 * dell'app, e un marchio che cambia tinta a seconda di dove appare non è un
 * marchio. */
export const MARK_ACCENT = "#9dc45f";
export const MARK_FOREGROUND = "#ffffff";

/** Quanto è grande il monogramma nello splash, in px. */
export const SPLASH_MARK_SIZE = 132;
