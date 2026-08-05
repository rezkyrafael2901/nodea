# FONT SPEC — NODEA (referensi design system: framer.com)

> Dibuat untuk sub AI-agent / dev project NODEA.
> Dasar: hasil audit font framer.com — **Inter doang** sebagai font utama, sisanya aksen.
> Jangan over-design. Max 3 font family per halaman.

---

## 1. Font Stack (WAJIB)

| Var | Font | Pemakaian |
|-----|------|-----------|
| `--font-sans` | **Inter** (variable) | SEMUA UI text: headings, body, buttons, nav, form |
| `--font-mono` | **Azeret Mono** | code blocks, angka/stat, ID/wallet addresses, label teknis |
| `--font-serif` | **EB Garamond** | quote/testimonial besar (aksen editorial, tipis-tipis) |
| `--font-tight` | **Inter Tight** (600-700) | heading hero condense (opsional) |

## 2. CSS Variables

```css
:root {
  --font-sans: 'Inter', 'Inter Placeholder', -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Azeret Mono', 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  --font-serif: 'EB Garamond', Georgia, 'Times New Roman', serif;
  --font-tight: 'Inter Tight', 'Inter', sans-serif;
}
```

## 3. Load Fonts

### Opsi A — Google Fonts CDN (praktis buat MVP)
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter+Tight:wght@600;700&family=EB+Garamond:ital,wght@0,400;1,400&family=Azeret+Mono:wght@400;500&display=swap" rel="stylesheet">
```

> Gak ikutkan `family=Inter+Variable` (variable font gak didukung prod CDN gm)—gunakan rangkan weight statik di atas; modern browser auto pilih dari file subset.

### Opsi B — Self-host / Variable (disarankan buat produksi, ala Framer)
Framer self-host Inter di `app.framerstatic.com` (Variable + static fallback). Untuk NODEA:
```css
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;            /* variable range */
  font-display: swap;
  font-named-instance: 'Regular';
  src: url('/fonts/InterVariable.woff2') format('woff2');
}
@font-face {
  font-family: 'Azeret Mono';
  font-style: normal;
  font-weight: 400; font-display: swap;
  src: url('/fonts/AzeretMono-Regular.woff2') format('woff2');
}
@font-face {
  font-family: 'EB Garamond';
  font-style: italic;
  font-weight: 400; font-display: swap;
  src: url('/fonts/EBGaramond-Italic.woff2') format('woff2');
}
```
> Self-host = hemat request, `font-display: swap` biar gak FOUT/FPS block. Taruh file di `public/fonts/`.

---

## 4. Role Mapping (Type Scale)

| Role        | Font       | Weight | Size (desktop) | Line-height | Letter-spacing |
|-------------|------------|--------|----------------|-------------|----------------|
| Display/Hero| Inter      | 700-800 | clamp(40px,6vw,72px) | 1.1  | -0.02em |
| H2 section  | Inter      | 700     | 36-44px        | 1.15        | -0.015em |
| H3 card     | Inter      | 600     | 20-24px        | 1.25        | -0.01em |
| Body        | Inter      | 400     | 16-18px        | 1.6         | 0 |
| Small/label | Inter      | 500     | 12-14px        | 1.4         | 0.02em (opsional uppercase) |
| Code/stat   | Azeret Mono| 400-500 | 13-15px        | 1.5         | 0 |
| Quote       | EB Garamond| 400     | 28-36px        | 1.35        | 0 (italic) |
| Hero alt    | Inter Tight| 700     | 56-72px        | 1.1         | -0.03em |

**Mobile scale** (dibawah 640px): kurangi ~30% ukuran display/H2; body tetap 15-16px.

---

## 5. Style Rules (konsistensi ala Framer)

- Line-height: body **1.6**, heading **1.1–1.2**.
- Heading **selalu negative tracking** (tight): -0.01em s/d -0.03em.
- Body **gak pernah** pakai font selain Inter.
- Mono HANYA buat: code, angka statistik, wallet/ID address, label teknis, hash.
- Serif (EB Garamond) dipakai tipis-tipis: quote, testimonial, kata kunci editorial.
- Max **3 font family** per halaman. Kalau serif/tight gak kepake, hapus dari load.
- Semua `font-display: swap`.
- Preload font utama (Inter) biar render cepet:
```html
<link rel="preload" href="/fonts/InterVariable.woff2" as="font" type="font/woff2" crossorigin>
```

---

## 6. Contoh Implementasi (Tailwind v4 / CSS)

```css
/* app/globals.css (Tailwind v4 @theme) */
@theme {
  --font-sans: 'Inter', -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'Azeret Mono', 'JetBrains Mono', monospace;
  --font-serif: 'EB Garamond', Georgia, serif;
  --font-tight: 'Inter Tight', 'Inter', sans-serif;
}

@layer base {
  body { @apply font-sans text-base leading-relaxed text-neutral-900 antialiased; }
  h1   { @apply font-sans font-extrabold tracking-tight leading-[1.1]; }
  code { @apply font-mono text-sm; }
  blockquote { @apply font-serif italic text-3xl; }
}
```

---

## 7. Checklist (tolong lakukan sebelum merge)

- [ ] Inter jadi satu-satunya body & heading font
- [ ] `font-display: swap` di semua @font-face
- [ ] Mono cuma untuk code/stat/address
- [ ] Heading pakai tracking negative
- [ ] Max 3 font family di load
- [ ] Preload Inter buat LCP
- [ ] Type scale konsisten (pakai tabel role mapping di atas, jangan invent angka random)

---

*File ini dibikin dari audit font framer.com (Inter utama + Azeret Mono code + EB Garamond aksen). Sumber teknis: browser font-face dump. Dibuat: Aug 2026.*