import type { Metadata } from "next";
import { Inter, Inter_Tight, Noto_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
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
    <html lang="en">
      <body
        className={`${inter.variable} ${interTight.variable} ${notoSans.variable} antialiased bg-[#0a0a0a] text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}