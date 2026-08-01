import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vana Soul — Your Digital Identity Card",
  description: "Connect your accounts across Vana and get a unified identity card — built from your real activity, not a questionnaire.",
  openGraph: {
    title: "Vana Soul — Your Digital Identity Card",
    description: "Connect GitHub, Instagram, ChatGPT, Spotify, YouTube and Steam. Get one card that reflects your real digital self.",
    type: "website",
    images: [
      {
        url: "/api/og.png",
        width: 1200,
        height: 630,
        alt: "Vana Soul Card",
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
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-[#0a0a0a] text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
