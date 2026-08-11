/* Rasterizza il monogramma NLC in tutte le misure che servono al sistema
 * operativo. Le icone vivono fuori dal CSS dell'app, quindi la geometria va
 * riletta da src/lib/nlc-mark-art.ts e non ricopiata: e' l'unico modo perche'
 * un ritocco al marchio arrivi anche qui.
 *
 *   node scripts/brand/generate-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

/* Il modulo dell'arte e' TypeScript e questo script gira in node puro: invece
 * di tirarsi dietro un transpiler, si leggono le costanti dal sorgente. Se un
 * nome cambia, qui esplode subito invece di disegnare un marchio sbagliato. */
const art = readFileSync(resolve(root, "src/lib/nlc-mark-art.ts"), "utf8");

function constant(name) {
  const match = art.match(new RegExp(`export const ${name} = ([^;]+);`));
  if (!match) throw new Error(`Costante ${name} non trovata in nlc-mark-art.ts`);
  return match[1].trim().replace(/^[`"']|[`"']$/g, "");
}

const ACCENT = constant("MARK_ACCENT");
const FOREGROUND = constant("MARK_FOREGROUND");
const RING_WIDTH = constant("MARK_RING_WIDTH");
const LETTER_WIDTH = constant("MARK_LETTER_WIDTH");
const DEPTH_OFFSET = constant("MARK_DEPTH_OFFSET");
const DEPTH_OPACITY = constant("MARK_DEPTH_OPACITY");
const DEPTH_WIDTH = constant("MARK_DEPTH_WIDTH");
const N_STEM = constant("MARK_N_STEM_PATH");
const N_DIAGONAL = constant("MARK_N_DIAGONAL_PATH");
const NL_JOIN = constant("MARK_NL_JOIN_PATH");

/* L'arco della C si ricalcola con la stessa formula del modulo. */
const CENTER = Number(constant("MARK_CENTER"));
const RADIUS = Number(constant("MARK_RADIUS"));
const GAP_HALF = 30;
const point = (deg) => {
  const rad = (deg * Math.PI) / 180;
  return [
    Number((CENTER + RADIUS * Math.cos(rad)).toFixed(2)),
    Number((CENTER - RADIUS * Math.sin(rad)).toFixed(2)),
  ];
};
const [sx, sy] = point(GAP_HALF);
const [ex, ey] = point(-GAP_HALF);
const RING = `M ${sx} ${sy} A ${RADIUS} ${RADIUS} 0 1 0 ${ex} ${ey}`;

const BACKGROUND = "#0b1512";

/* Sotto i 40px la N e la L si chiudono l'una sull'altra e il quadrato diventa
 * una macchia: a quelle misure resta la sola C, che e' la variante
 * "semplificata" della tavola del marchio. */
const SIMPLIFIED_BELOW = 40;

function svg({ size, padding, background, simplified, radius }) {
  const inner = 100 - padding * 2;
  const letters = simplified
    ? ""
    : `<g fill="none" stroke="${FOREGROUND}" stroke-width="${LETTER_WIDTH}" stroke-linecap="round" stroke-linejoin="round">
         <path d="${N_STEM}"/><path d="${N_DIAGONAL}"/><path d="${NL_JOIN}"/>
       </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" fill="none">
    ${background ? `<rect width="100" height="100" rx="${radius}" fill="${background}"/>` : ""}
    <g transform="translate(${padding},${padding}) scale(${inner / 100})">
      <path d="${RING}" stroke="${ACCENT}" stroke-width="${DEPTH_WIDTH}" stroke-linecap="round" opacity="${DEPTH_OPACITY}" transform="${DEPTH_OFFSET}" fill="none"/>
      <path d="${RING}" stroke="${FOREGROUND}" stroke-width="${RING_WIDTH}" stroke-linecap="round" fill="none"/>
      ${letters}
    </g>
  </svg>`;
}

/* padding: quanto respiro lascia il marchio dentro il quadrato. Le maskable ne
 * vogliono molto di piu' perche' Android ritaglia fino al 20% per lato. */
const TARGETS = [
  { file: "public/icons/icon-16.png", size: 16, padding: 6, radius: 0 },
  { file: "public/icons/icon-32.png", size: 32, padding: 6, radius: 0 },
  { file: "public/icons/favicon-32.png", size: 32, padding: 6, radius: 0 },
  { file: "public/icons/icon-48.png", size: 48, padding: 8, radius: 0 },
  { file: "public/icons/icon-180.png", size: 180, padding: 12, radius: 22 },
  { file: "public/icons/apple-touch-icon.png", size: 180, padding: 12, radius: 0 },
  { file: "public/icons/icon-192.png", size: 192, padding: 12, radius: 22 },
  { file: "public/icons/icon-256.png", size: 256, padding: 12, radius: 22 },
  { file: "public/icons/icon-512.png", size: 512, padding: 12, radius: 22 },
  { file: "public/icons/icon-1024.png", size: 1024, padding: 12, radius: 22 },
  { file: "public/icons/maskable-192.png", size: 192, padding: 24, radius: 0 },
  { file: "public/icons/maskable-512.png", size: 512, padding: 24, radius: 0 },
  { file: "app/icon.png", size: 512, padding: 12, radius: 22 },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const target of TARGETS) {
  const simplified = target.size < SIMPLIFIED_BELOW;
  const markup = svg({
    size: target.size,
    padding: target.padding,
    background: BACKGROUND,
    simplified,
    radius: target.radius,
  });

  await page.setViewportSize({ width: target.size, height: target.size });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}</style>${markup}`,
  );
  const buffer = await page.screenshot({
    omitBackground: true,
    clip: { x: 0, y: 0, width: target.size, height: target.size },
  });
  writeFileSync(resolve(root, target.file), buffer);
  console.log(
    `${target.file.padEnd(34)} ${String(target.size).padStart(4)}px${simplified ? "  (semplificata)" : ""}`,
  );
}

await browser.close();

/* La sorgente vettoriale, per chi dovesse rifare le icone altrove. */
writeFileSync(
  resolve(root, "public/icons/nlc-mark.svg"),
  svg({ size: 512, padding: 12, background: null, simplified: false, radius: 0 }),
);
console.log("public/icons/nlc-mark.svg          sorgente vettoriale");
