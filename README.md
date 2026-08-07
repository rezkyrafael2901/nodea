# 👁️ Nodea — Multi-Source Identity Card

Meet yourself in your data. Connect everything. See who you really are in one card.

**Built for Vana Cup 2026** — competing on builders.vana.org

## 🎯 Concept

Nodea is a **multi-source digital identity platform**. Users connect their social accounts (GitHub, Instagram, ChatGPT, Spotify, YouTube, Steam) through Vana's data protocol. The app generates a **unified identity card** — an AI-analyzed identity profile with personality scores, hidden patterns, aesthetic classification, and a shareable visual card.

### Why Multi-Source Wins

| Dimension | Single-source apps | Nodea |
|---|---|---|
| Data sources | 1 per app | 6+ (user selects) |
| Assist potential | Limited | Maximized (all stable connectors) |
| Viral output | Single dimension | Multi-dimensional identity |

## 🏗️ Architecture

```
User → Next.js (Vercel) → Vana SDK → Data Sources → AI Engine → Soul Card
```

**Tech Stack:**
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Styling:** Tailwind CSS v4
- **Vana SDK:** `@opendatalabs/vana-sdk` (data connect)
- **AI Engine:** Anthropic Claude / OpenRouter (server-side)
- **Deploy:** Vercel

## 📁 Project Structure

```
nodea/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main UI — source connect + card
│   │   ├── layout.tsx            # Root layout (dark theme)
│   │   ├── api/
│   │   │   ├── connect/route.ts  # POST — fetch Vana data sources
│   │   │   ├── identity/route.ts # POST — AI analysis of all sources
│   │   │   └── og/route.ts       # GET — OG image SVG generation
│   ├── components/
│   │   └── data-soul-card.tsx    # Visual identity card component
│   └── lib/
│       └── vana-sources.ts       # Source definitions + prompt builder
├── public/
├── .env.local                    # Secrets (gitignored)
├── .env.example                  # Template
└── package.json
```

## 🚀 Setup & Run

### Prerequisites
- Node.js 22+
- npm or pnpm
- Vana wallet (EVM) for mainnet data access

### Local Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your keys:
#   VANA_PRIVATE_KEY=<your_vana_wallet_key>
#   ANTHROPIC_API_KEY=<your_anthropic_key>
#   OR OPENROUTER_API_KEY=<your_openrouter_key>

# Start dev server
npm run dev
# → http://localhost:3001
```

### Build & Deploy

```bash
# Production build
npm run build

# Start production server
npm start
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or connect GitHub repo for automatic deployments
```

## 🔧 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VANA_NETWORK` | Yes | `mainnet` or `moksha` (testnet) |
| `VANA_PRIVATE_KEY` | Yes | EVM wallet private key for Vana |
| `VANA_ESCROW_USDC` | Yes | Escrow address for mainnet |
| `AI_PROVIDER` | No | `anthropic` (default) or `openrouter` |
| `ANTHROPIC_API_KEY` | Conditional | Required if `AI_PROVIDER=anthropic` |
| `OPENROUTER_API_KEY` | Conditional | Required if `AI_PROVIDER=openrouter` |

> **Note:** If no AI API key is configured, the app returns mock analysis. For Vana Cup, configure an actual AI key.

## 📊 Vana Data Sources

| Source | Scopes | Maturity |
|---|---|---|
| GitHub | contributions, events, history, profile, repositories, starred | ✅ Stable |
| Instagram | profile, posts, following, ads | ✅ Stable |
| ChatGPT | conversations, memories | ✅ Stable |
| Spotify | playlists, profile, savedTracks | ✅ Stable |
| YouTube | history, likes, playlists, profile, subscriptions, watchLater | 🟡 Beta |
| Steam | profile, games, friends | 🟠 Experimental |

## 🏆 Vana Cup Strategy

### Scoring Model
- **Goal** (1pt): First paid read of a newly onboarded source via your app
- **Assist** (2pts): Another app reads a source your app onboarded
- **Formula:** `points = goals + (2 × assists)`

### Our Strategy
1. **Onboard 6 sources** in order: GitHub, Instagram, ChatGPT, Spotify, YouTube, Steam
2. Each source = 1 goal point = 6 total goals
3. Assist potential: All 4 stable connectors (GitHub, IG, ChatGPT, Spotify) are popular — high chance of cross-app reads
4. **Potential max assist points:** If each stable source gets read by 2 other apps = 4 sources × 2 assists × 2pts = 16 assist points

### Competitive Edge
- Only multi-source app on the leaderboard
- All stable connectors covered
- Shareable card output drives organic user acquisition

## 🧪 Testing

```bash
# Test connect API
curl -X POST http://localhost:3001/api/connect \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"github","scopes":["github.contributions","github.profile"]}'

# Test identity API
curl -X POST http://localhost:3001/api/identity \
  -H "Content-Type: application/json" \
  -d '{"sources":[{"source":"github","data":{"profile":{}},"raw":[]}],"prompt":"test"}'

# Test OG image
curl "http://localhost:3001/api/og?sources=github,instagram&tagline=Test&creative_analytical=75" -o og.svg
```

## 📋 Next Steps

1. [ ] **Setup Vana app identity** — register at account.vana.org/developers
2. [ ] **Configure AI key** — add ANTHROPIC_API_KEY or OPENROUTER_API_KEY
3. [ ] **Fund escrow** — add USDC.e for mainnet data reads
4. [ ] **Integrate @opendatalabs/vana-sdk** — replace mock connect with real Vana data flow
5. [ ] **Deploy to Vercel** — set env vars in Vercel dashboard
6. [ ] **Complete listing** — fill name, icon, website in Vana app directory
7. [ ] **GTM** — post to Vana Discord, Twitter, share demo card

## 📜 License

MIT — Build on Vana, build free.

---

**Built by:** [@0xVirex](https://x.com/0xVirex) | redoaldi34@gmail.com
