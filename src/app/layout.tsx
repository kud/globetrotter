import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Fraunces } from "next/font/google"
import "./globals.css"
import ThemeApplier from "@/components/theme-applier"
import PwaRegister from "@/components/pwa-register"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// Editorial serif for display headings only — gives the app a travel-magazine
// personality while the sans keeps the tool chrome crisp.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: "Globetrotter — map where you've been",
  description:
    "Track the countries you've visited and want to go, with facts and official safety advice. Works offline.",
  applicationName: "Globetrotter",
  appleWebApp: {
    capable: true,
    title: "Globetrotter",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
    { media: "(prefers-color-scheme: light)", color: "#f4f6fa" },
  ],
  colorScheme: "dark light",
}

// Apply the saved theme before paint to avoid a flash of the wrong theme.
const NO_FLASH = `(function(){try{var s=localStorage.getItem('globetrotter:v1');var t=s&&JSON.parse(s).state&&JSON.parse(s).state.theme;if(!t||t==='system'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})()`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
        <ThemeApplier />
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
