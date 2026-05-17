import type { MetadataRoute } from "next";

const PWA_SPLASH_COLOR = "#0f0f0f";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Non l'ho comprato",
    short_name: "NLC",
    description: "Traccia quanto spendi e quanto hai evitato di buttare.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: PWA_SPLASH_COLOR,
    theme_color: PWA_SPLASH_COLOR,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
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
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
