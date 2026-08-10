# Nodea Design Backup — v1

**Tanggal:** 10 Agustus 2026
**Git commit:** `568885a8d43535a65aef946f15f3a5da8081eb74`
**Git tag:** `design-backup-v1`
**Status:** LIVE di https://nodea.my.id

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

### 4. Footer (single-row)
- Logo + "Nodea" + separator + "Built on Vana · Data you already own"
- Kanan: "© 2026 Nodea. Built on Vana. / Your data, your rules."
- **TIDAK ADA** multi-column (Product / Data sources / Powered by)

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
- Kalau ada fitur baru ditambah dan gak cocok, restore dari tag ini bakal balikin tampilan persis.
- Jangan hapus tag `design-backup-v1` — itu sumber restore.
- Buat backup baru (v2, dst) kalau design berubah lagi signifikan:
  ```bash
  git tag -a design-backup-v2 -m "..." && git push origin design-backup-v2
  ```
