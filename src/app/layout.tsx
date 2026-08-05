import type { Metadata } from "next";
import { Inter, Azeret_Mono, EB_Garamond } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const azeretMono = Azeret_Mono({
  variable: "--font-azeret-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Nodea — Your Digital Identity Card",
  description: "Connect your accounts across Vana and get a unified identity card — built from your real activity, not a questionnaire.",
  openGraph: {
    title: "Nodea — Your Digital Identity Card",
    description: "Connect GitHub, Instagram, ChatGPT, Spotify, YouTube and Steam. Get one card that reflects your real digital self.",
    type: "website",
    images: [
      {
        url: "/api/og.png",
        width: 1200,
        height: 630,
        alt: "Nodea Card",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} ${azeretMono.variable} ${ebGaramond.variable}`}
    >
      <head>
        {/* Anti-flash: apply saved theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("nodea-theme");if(t==="light")document.documentElement.setAttribute("data-theme","light");else document.documentElement.setAttribute("data-theme","dark");}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`,
          }}
        />
      </head>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}