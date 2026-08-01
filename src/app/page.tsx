import type { Metadata } from "next";
import PageClient from "./page-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

  const ref = str(sp.ref).substring(0, 30);
  const score = str(sp.score);
  const grade = str(sp.grade).toUpperCase().slice(0, 1);
  const sources = str(sp.sources);

  // Build dynamic OG image params (PNG for maximum platform support)
  const qs = new URLSearchParams();
  if (score) qs.set("score", score);
  if (grade) qs.set("grade", grade);
  if (sources) qs.set("sources", sources);
  if (ref) qs.set("ref", ref);
  const ogUrl = `/api/og.png${qs.toString() ? `?${qs.toString()}` : ""}`;

  const hasCard = Boolean(score || grade || ref);
  const title = hasCard
    ? ref
      ? `Vana Soul — Can you beat Grade ${ref}?`
      : `Vana Soul — Soul Score ${score ? `${score}/100` : ""}${grade ? ` · Grade ${grade}` : ""}`
    : "Vana Soul — Your Digital Identity Card";
  const description = hasCard
    ? "Connect your data across Vana and generate your own Soul Card. Beat this score!"
    : "Connect GitHub, Instagram, ChatGPT, Spotify, YouTube and Steam. Get one card that reflects your real digital self.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: "Vana Soul Card",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default function Page() {
  return <PageClient />;
}
