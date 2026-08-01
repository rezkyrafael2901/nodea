# 🚀 Nodea — Deploy Instructions

## Quick Deploy to Vercel (5 minutes)

### Option A: Vercel Dashboard (Easiest)

1. Go to https://vercel.com/new
2. Import from **local folder** or **GitHub**
3. Set environment variables:
   ```
   VANA_NETWORK=mainnet
   VANA_PRIVATE_KEY=your_vana_wallet_key
   VANA_APP_NAME=Nodea
   AI_PROVIDER=anthropic
   ANTHROPIC_API_KEY=your_api_key_here
   ```
4. Click Deploy
5. Done → your-site.vercel.app

### Option B: Vercel CLI

```bash
cd nodea

# Login
vercel login

# Deploy (non-production for testing)
vercel --yes

# Or deploy to production
vercel --prod --yes
```

Set env vars in Vercel Dashboard → Settings → Environment Variables

---

## Vana Cup Setup Checklist

After Vercel deploy, complete these for Vana Cup:

- [ ] Register app at https://account.vana.org/developers
  - App name: "Nodea"
  - Description: "Multi-Source Digital Identity Card"
  - Website: https://your-app.vercel.app
  - Grant EVM wallet (from VANA_PRIVATE_KEY)

- [ ] Fund escrow
  - Mainnet: Bridge USDC.e to escrow address
  - Testnet: Use Moksha faucet for VANA

- [ ] Complete listing fields
  - Icon: Create a simple eye/soul icon
  - Name: Nodea
  - Description: as above

- [ ] Verify data flow works
  - Test GitHub connect
  - Test Instagram connect
  - Test ChatGPT connect
  - Test Identity generation

- [ ] Start driving organic users
  - Post demo card to Vana Discord
  - Share on Twitter/X with #VanaCup

---

## Current Status

✅ **BUILD**: Next.js project compiles successfully
✅ **DEV SERVER**: Running on localhost:3001
✅ **API /connect**: Working (returns mock data for 6 sources)
✅ **API /identity**: Working (mock AI analysis)
✅ **API /og**: Working (SVG OG image generation)
✅ **UI**: Complete (source selection, progress bar, soul card)
✅ **TESTS**: Full multi-source flow tested
✅ **GIT**: Local repo ready, 24 files committed

⏳ **NEXT**: Configure AI key + Vana wallet → Deploy → Register on Vana

---

## AI Key Setup

The app works without AI key (returns mock analysis). For real analysis:

```bash
# Add to .env.local or Vercel env vars:
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# OR via OpenRouter (cheaper, more models):
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
```

## Vana Wallet Setup

```bash
# Generate wallet (need foundry/cast)
cast wallet new --json

# Or use existing wallet
# Add private key to .env.local:
VANA_PRIVATE_KEY=0x...
```

Then register at account.vana.org/developers
