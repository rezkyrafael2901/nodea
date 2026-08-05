/**
 * POST /api/vana/check-link
 *
 * Pre-flight profile-link validator for the "paste a profile link" step that
 * Vana's ODL connector page asks for. We normalize the pasted link to the exact
 * canonical profile URL Vana's resolver accepts, then verify it resolves (HTTP 200)
 * so we can tell the user the exact string to paste — preventing "profile not found".
 *
 * Body: { source: "spotify"|"youtube"|"github"|"instagram", url: string }
 * Response:
 *   { ok: true, canonicalUrl: string, name: string|null }
 *   { ok: false, error: string, hint?: string }
 */

import { NextRequest, NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

interface CheckResult {
  ok: boolean;
  canonicalUrl?: string;
  name?: string | null;
  channelId?: string;
  channelTitle?: string | null;
  error?: string;
  hint?: string;
  httpStatus?: number;
  reason?: "unrecognized" | "not-found" | "unreachable" | "resolved";
}

function normHost(u: string): string {
  return u.replace(/^www\./, "").toLowerCase().replace(/\/+$/, "");
}

/**
 * Map a pasted link/user handle to the canonical profile URL Vana's ODL
 * resolver expects, per source. Returns null when the input isn't plausibly
 * a profile link for that source.
 */
function canonicalize(source: string, input: string): { url: string; name: string | null } | null {
  const s = input.trim();
  if (!s) return null;

  const hasScheme = /^https?:\/\//i.test(s);

  if (source === "youtube") {
    // Build a parseable URL when the user pastes a bare domain path.
    let raw = s;
    if (!hasScheme && /(?:youtube\.com|youtu\.be)\//i.test(raw)) raw = `https://${raw}`;

    let path = raw;
    let host = "";
    try {
      const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
      host = u.hostname.toLowerCase();
      path = u.pathname;
    } catch {
      path = raw;
    }

    // Only accept real youtube domains (www/m/music subdomains ok).
    const isYt =
      host.endsWith("youtube.com") || host.endsWith("youtu.be") ||
      (!host && /(?:youtube\.com|youtu\.be)\//i.test(raw));

    if (isYt) {
      // youtu.be/<id> is ALWAYS a video short-link — never a profile.
      if (host === "youtu.be") return null;
      // /@Handle — modern canonical (handles query + trailing slash + sub-paths)
      const at = path.match(/^\/@([A-Za-z0-9_.-]+)/);
      if (at) return { url: `https://www.youtube.com/@${at[1]}`, name: `@${at[1]}` };
      // /channel/UC...
      const ch = path.match(/^\/channel\/(UC[\w-]{16,})/i);
      if (ch) return { url: `https://www.youtube.com/channel/${ch[1]}`, name: ch[1] };
      // /c/<custom-url> — legacy custom URLs (now redirect to /@)
      const c = path.match(/^\/c\/([A-Za-z0-9_.-]+)/i);
      if (c) return { url: `https://www.youtube.com/c/${c[1]}`, name: c[1] };
      // /user/<legacy-name>
      const usr = path.match(/^\/user\/([A-Za-z0-9_.-]+)/i);
      if (usr) return { url: `https://www.youtube.com/user/${usr[1]}`, name: usr[1] };
      // /<custom> — bare custom URL (some share links)
      const bare = path.match(/^\/([A-Za-z0-9_.-]{3,})\/?$/);
      if (bare && !/^(watch|playlist|shorts|feed|results|account|signin|logout|about|howyoutubeworks)$/i.test(bare[1]))
        return { url: `https://www.youtube.com/${bare[1]}`, name: bare[1] };
      // youtu.be/<id> is a VIDEO — never a profile. Reject with null so the UI
      // can explain "paste your CHANNEL link, not a video link".
      return null;
    }

    // Bare handles (no domain)
    const h = s.match(/^@([A-Za-z0-9_.-]+)$/);
    if (h) return { url: `https://www.youtube.com/@${h[1]}`, name: `@${h[1]}` };
    if (!hasScheme && /^[A-Za-z0-9_.-]{3,}$/.test(s))
      return { url: `https://www.youtube.com/@${s}`, name: `@${s}` };
    return null;
  }

  if (source === "spotify") {
    // Spotify URI scheme: spotify:user:<id>
    const uri = s.match(/^spotify:user:([A-Za-z0-9]+)/i);
    if (uri) return { url: `https://open.spotify.com/user/${uri[1]}`, name: uri[1] };
    // e.g. https://open.spotify.com/user/abc123 or /intl-id/user/abc123 (+?si=...)
    const m = s.match(/(?:open\.spotify\.com|spotify\.com)\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?user\/([A-Za-z0-9]+)/i);
    if (m) return { url: `https://open.spotify.com/user/${m[1]}`, name: m[1] };
    // Spotify share links can be user/<id>?si=xyz — same regex handles it.
    return null; // track/playlist/album/artist are NOT profiles
  }

  if (source === "github") {
    const m = s.match(/(?:github\.com\/)([A-Za-z0-9-]{1,39})(?:\/|$)/);
    if (m && !/^(orgs|topics|trending|settings|marketplace)$/i.test(m[1]))
      return { url: `https://github.com/${m[1]}`, name: m[1] };
    if (!hasScheme && /^[A-Za-z0-9-]{1,39}$/.test(s))
      return { url: `https://github.com/${s}`, name: s };
    return null;
  }

  if (source === "instagram") {
    // Capture the segment BEFORE the username too, so /p/ /reel/ /reels/ /tv/
    // /explore/ post links are rejected instead of being read as a username.
    const m = s.match(/(?:instagram\.com|instagr\.am)\/([^/?#]+)?\/?([A-Za-z0-9_.]{1,30})(?:\/|$|\?)/i);
    const bare = !hasScheme && /^[A-Za-z0-9_.]{1,30}$/.test(s) ? s : null;
    const badPrefixes = /^(p|reel|reels|tv|explore|accounts|stories|tags|discover|create)$/i;
    let name: string | null = null;
    if (m) {
      const seg = m[1] || "";
      const candidate = m[2];
      if (badPrefixes.test(seg)) {
        name = null; // post/reel/tv/explore link — not a profile
      } else if (!badPrefixes.test(candidate)) {
        name = candidate;
      }
    }
    name = name || bare;
    if (name) return { url: `https://www.instagram.com/${name}/`, name };
    return null;
  }

  return null;
}

async function checkReachable(url: string): Promise<{ ok: boolean; status: number }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timer);
    return { ok: res.status >= 200 && res.status < 400, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/**
 * Resolve a YouTube channel/@-handle/legacy URL to its stable channel ID form
 * (youtube.com/channel/UC…). Vana's public-profile resolver only accepts the
 * /channel/UC… form — @handles and /c/ URLs get "profile could not be found".
 * Returns { channelId, title } or null when the page can't be parsed.
 */
async function resolveYouTubeChannel(url: string): Promise<{ channelId: string; title: string | null } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    // Modern YouTube inlines the channel id as "externalId":"UC…" (and legacy "channelId":"UC…").
    const m =
      html.match(/"externalId":"(UC[\w-]{16,})"/) ||
      html.match(/"channelId":"(UC[\w-]{16,})"/) ||
      html.match(/"ucid":"(UC[\w-]{16,})"/) ||
      html.match(/\/channel\/(UC[\w-]{16,})"/);
    if (!m) return null;
    const title =
      html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ||
      html.match(/"name":"([^"]{1,80})","url"/)?.[1] ||
      html.match(/"title":"([^"]{1,80})","type":"Owner"/)?.[1] ||
      html.match(/"title":"([^"]{1,80})","type":"Channel"/)?.[1] ||
      html.match(/"title":"([^"]{1,80})"/)?.[1] ||
      null;
    return { channelId: m[1], title };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { source, url } = body as { source?: string; url?: string };
    if (!source || !url) {
      return NextResponse.json({ ok: false, error: "source and url are required" }, { status: 400 });
    }

    if (!["spotify", "youtube", "github", "instagram"].includes(source)) {
      return NextResponse.json({ ok: false, error: `Unsupported source: ${source}` }, { status: 400 });
    }

    const hints: Record<string, string> = {
      spotify: 'Spotify wants the link to your PROFILE page — format: open.spotify.com/user/<id>. In the Spotify app: go to your profile → ⋯ → Share → Copy link to profile.', 
      youtube:
        "YouTube wants your CHANNEL link: youtube.com/@YourHandle, youtube.com/c/… or youtube.com/channel/UC… (video links like youtu.be/… or watch?v=… won't work). Open your channel → copy the URL from the address bar.",
      github: "GitHub wants your profile link: github.com/<username>.",
      instagram:
        "Instagram wants your profile link: instagram.com/<username>. (Reels/post links are trimmed automatically.)",
    };

    const canonical = canonicalize(source, url);

    if (!canonical) {
      return NextResponse.json({
        ok: false,
        error: "That doesn't look like a profile link for this source.",
        reason: "unrecognized",
        hint: hints[source],
      } satisfies CheckResult);
    }

    const reach = await checkReachable(canonical.url);

    // Only a hard 404 means the profile genuinely doesn't exist. Spotify returns
    // 200 even for bogus users; Instagram rate-limits (429) valid accounts. So we
    // only fail on 404 and let ambiguous statuses pass through.
    if (reach.status === 404) {
      return NextResponse.json({
        ok: false,
        canonicalUrl: canonical.url,
        error: "Profile not found — that link returns 404. Double-check the username/ID.",
        reason: "not-found",
        hint: hints[source],
        httpStatus: 404,
      } satisfies CheckResult);
    }

    // YouTube: Vana's public-profile resolver only accepts the stable
    // /channel/UC… form. @handles and /c/ URLs resolve to 200 on YouTube but
    // Vana replies "That profile could not be found". So we resolve the handle
    // to its channel ID and hand back the exact /channel/ link to paste.
    let canonicalUrl = canonical.url;
    let name = canonical.name;
    let channelId: string | undefined;
    let channelTitle: string | null = null;
    if (source === "youtube" && !/^https:\/\/www\.youtube\.com\/channel\//.test(canonicalUrl)) {
      const resolved = await resolveYouTubeChannel(canonicalUrl);
      if (resolved) {
        channelId = resolved.channelId;
        channelTitle = resolved.title;
        canonicalUrl = `https://www.youtube.com/channel/${resolved.channelId}`;
        name = resolved.title || name;
      }
    }

    return NextResponse.json({
      ok: true,
      canonicalUrl,
      name,
      channelId,
      channelTitle,
      reason: "resolved",
      httpStatus: reach.status,
    } satisfies CheckResult);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "check failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}