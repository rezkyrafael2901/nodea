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

const appUrl = process.env.APP_URL || "https://nodea-app.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: "Nodea",
  title: "Nodea — Meet Yourself in Your Data",
  description: "Connect the accounts you choose and discover the patterns that make you, you. No questionnaire — just your data, decoded.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Nodea — Meet Yourself in Your Data",
    description: "Connect the accounts you choose and discover the patterns that make you, you.",
    type: "website",
    images: [
      {
        url: "/api/og.png",
        width: 1200,
        height: 630,
        alt: "Nodea — What Your Data Says About You",
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
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}