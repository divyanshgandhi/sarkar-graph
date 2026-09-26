import type { Metadata, Viewport } from "next";
import { Anek_Devanagari, Anek_Latin } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const anek = Anek_Latin({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-anek",
  display: "swap",
});

const anekDeva = Anek_Devanagari({
  subsets: ["devanagari"],
  axes: ["wdth"],
  variable: "--font-anek-deva",
  display: "swap",
});

export const metadata: Metadata = {
  // share cards resolve against the deployed origin (Vercel sets this), never a domain we don't own
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:5190"),
  ),
  title: {
    default: "Sarkar Graph · Who runs India",
    template: "%s · Sarkar Graph",
  },
  description:
    "A live map of the Government of India: every ministry, court, commission and state government, who holds each seat, who put them there, and what changed this week.",
  openGraph: {
    title: "Sarkar Graph · Who runs India",
    description:
      "Every seat of power in India on one map, traced back to the voter. Union, Parliament, courts, commissions, and all 36 States and UTs.",
    type: "website",
    locale: "en_IN",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ece8df" },
    { media: "(prefers-color-scheme: dark)", color: "#14120f" },
  ],
};

// Runs before paint so the saved or system theme never flashes.
const themeScript = `(()=>{try{var t=localStorage.getItem('sg-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${anek.variable} ${anekDeva.variable}`} suppressHydrationWarning>
      <body>
        <Script id="sg-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
