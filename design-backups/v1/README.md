# Nodea Design Backup — v1

**Tanggal:** 10 Agustus 2026 (updated 14:49 WITA)
**Git commit:** `bf270de` (footer minimal)
**Git tag:** `design-backup-v1`
**Status:** LIVE di https://nodea.my.id

> ⚠️ **UPDATE:** Backup v1 telah di-update ke design **sekarang** (footer minimal closing screen).
> Design lama (footer multi-column, commit `568885a`) tetap aman di git history —
> kalau butuh, bisa `git show 568885a:src/app/page-client.tsx > src/app/page-client.tsx`.

## Cara Restore

```bash
# Dari dalam folder ~/nodea/
git checkout design-backup-v1 -- src/app/page-client.tsx src/app/globals.css src/app/layout.tsx src/lib/soul-score.ts src/lib/rewards.ts

# Kalau mau full reset ke kondisi backup (termasuk semua file):
# git checkout design-backup-v1 -- .

# Verify
npx tsc --noEmit

# Deploy
npx vercel deploy --token "$VERCEL_TOKEN" --prod --yes
```

> ⚠️ Sebelum restore: commit dulu semua perubahan yang ada, biar gak ada yang kehilangan kerjaan baru:
> `git add -A && git commit -m "wip before design restore"`

## Snapshot Design (kondisi persis saat ini)

### 1. Hero
- H1: **"You're more interesting than your bio."**
  - Line 1 (gradient-white): `You're more interesting`
  - Line 2 (gradient-brand): `than your bio.`
- CTA tunggal: **"Connect your accounts"** (gradient `#4F8CFF → #00D4FF`, arrow icon)
- Trust row: `🔒 No wallet needed · 👁 We only read what you approve · ✅ Revoke anytime`
- SourceOrbit (264px) di bawah CTA
- **TIDAK ADA** stats bar (Soul Score / Grade / Connected)
- **TIDAK ADA** tombol "View leaderboard"

### 2. Navbar
- Sticky top, scroll behavior: `bg-[#0B1222]/95` + `border-[#94A3B8]/10` + backdrop-blur
- Non-scroll: transparent
- Links: Connect, How it works, Article, Standings, Your Mirror
- Active state: `text-[#38BDF8] bg-[#38BDF8]/10`
- Hover: `text-[#E2E8F0]`
- Default: `text-[#94A3B8]`
- CTA: `Connect your data` — gradient `#3B82F6 → #06B6D4`, min-h-40px, rounded-xl
- **TIDAK ADA** theme toggle (dark-only)
- Mobile: hamburger + dropdown (bg `#0B1222/95`, same palette)

### 3. Platform Cards (section "Every source tells a different story")
- Grid 1/2/3 kolom, card `bg-white/[0.02] border-white/[0.06]`
- Setiap card: icon tile, nama, DNA, deskripsi, output summary
- **Per-card Connect button** (kanan atas):
  - Default: `Connect` — cyan border, Link2 icon
  - Connecting: `Cancel` — red border, spinner
  - Error: `Try again` — amber border, AlertCircle icon
  - Connected: badge `Connected` — emerald, CheckCircle icon
- Satu connect jalan pada satu waktu (`connectingSource`)

### 4. Footer (minimal closing screen)
- **Centered:** AppLogo (network-N, size 44)
- Statement: **"Every connection tells a story."** (text-sm, white/45)
- Credit: **"© 2026 Nodea · Built on Vana"** (text-xs, white/30)
- Border-top `white/[0.05]`, bg `(--color-bg)`
- **TIDAK ADA** link/sitemap/Vana Cup/tombol

### 5. Global
- Scroll-to-top instant on mount
- Font: Inter + Azeret Mono + EB Garamond (Tailwind v4 @theme)
- Dark-only theme

## File yang di-backup
| File | Keterangan |
|---|---|
| `src/app/page-client.tsx` | Komponen utama (semua tampilan) |
| `src/app/globals.css` | Global styles + @theme fonts |
| `src/app/layout.tsx` | Root layout (fonts, metadata) |
| `src/lib/soul-score.ts` | Soul score logic (grade thresholds S=85/A=70/B=55/C=40/D) |
| `src/lib/rewards.ts` | Leaderboard/rewards types (LeaderboardEntry) |

## Catatan Penting
- Backup ini = **git tag**, jadi restore = checkout dari tag. Bisa juga restore per-file.
- Tag `design-backup-v1` menunjuk ke commit **`bf270de`** (design minimal saat ini).
- Design lama (footer multi-column) masih ada di git history — commit `568885a`:
  ```bash
  # Restore footer lama (multi-column) kalau perlu:
  git show 568885a:src/app/page-client.tsx > src/app/page-client.tsx
  ```
- Jangan hapus tag `design-backup-v1` — itu sumber restore.
- Buat backup baru (v2, dst) kalau design berubah lagi signifikan:
  ```bash
  git tag -a design-backup-v2 -m "..." && git push origin design-backup-v2
  ```
