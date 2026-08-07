import type { MetadataRoute } from "next";

// Il nero della stanza, non più quello caldo della vecchia palette: è il colore
// che il sistema operativo mette intorno all'app installata.
const PWA_THEME_COLOR = "#0b1512";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Non l'ho comprato",
    short_name: "NLC",
    description: "Traccia le spese e tieni visibile l'impatto netto.",
    lang: "it",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "fullscreen"],
    background_color: PWA_THEME_COLOR,
    theme_color: PWA_THEME_COLOR,
    icons: [
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
