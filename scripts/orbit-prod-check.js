const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("https://nodea-app.vercel.app");
  await page.waitForTimeout(4000);

  // Check orbit distances from center
  const results = await page.evaluate(() => {
    const container = document.querySelector('[aria-hidden="true"]');
    if (!container) return { error: "no container" };
    const size = 264;
    const cx = size / 2, cy = size / 2;
    const coreR = size * 0.3 / 2; // ~39.6

    // Find all icon wrapper divs (absolute positioned, inside the orbit component)
    const allDivs = container.querySelectorAll("div");
    const icons = [];
    allDivs.forEach(d => {
      const s = window.getComputedStyle(d);
      if (s.position !== "absolute") return;
      const w = parseFloat(s.width), h = parseFloat(s.height);
      if (w < 20 || w > 50) return; // icon wrappers are 30-40px
      const rect = d.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();
      const ix = rect.left - contRect.left + w/2;
      const iy = rect.top - contRect.top + h/2;
      const dist = Math.sqrt(Math.pow(ix - cx, 2) + Math.pow(iy - cy, 2));
      icons.push({ dist: Math.round(dist), w: Math.round(w), h: Math.round(h) });
    });

    return {
      coreRadius: Math.round(coreR),
      totalAbsoluteDivs: allDivs.length,
      iconCandidates: icons.length,
      icons,
      allOutsideCore: icons.every(i => i.dist > coreR + 15),
    };
  });

  console.log("=== PROD ORBIT VERIFY ===");
  console.log(JSON.stringify(results, null, 2));

  if (results.icons && results.icons.length >= 5) {
    const outside = results.icons.filter(i => i.dist > results.coreRadius + 15);
    console.log(`\n✅ ${outside.length}/5 icons outside core zone (min ${results.coreRadius + 15}px)`);
    console.log(`   Distances from center: ${results.icons.map(i => i.dist + "px").join(", ")}`);
  }

  await page.screenshot({ path: "/tmp/orbit-prod-verify.png", fullPage: false });
  console.log("\nScreenshot: /tmp/orbit-prod-verify.png");

  await browser.close();
}

main().catch(console.error);
