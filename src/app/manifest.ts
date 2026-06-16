import type { MetadataRoute } from "next"

const manifest = (): MetadataRoute.Manifest => ({
  name: "Globetrotter — map where you've been",
  short_name: "Globetrotter",
  description:
    "Track the countries you've visited and want to go, with facts and official safety advice. Works offline.",
  start_url: "/",
  display: "standalone",
  orientation: "any",
  background_color: "#0b1020",
  theme_color: "#0b1020",
  categories: ["travel", "lifestyle", "navigation"],
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
      src: "/icons/maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
})

export default manifest
