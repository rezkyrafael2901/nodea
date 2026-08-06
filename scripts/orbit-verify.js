// Playwright script to verify SourceOrbit fix:
// All 5 brand icons visible, positioned at correct distances from center,
// none overlapping the core Nodea logo.
const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("http://localhost:3123");
  await page.waitForTimeout(3000); // wait for animations to settle

  // Evaluate in browser context
  const results = await page.evaluate(() => {
    const container = document.querySelector('[aria-hidden="true"] .relative.mx-auto');
    if (!container) return { error: "SourceOrbit container not found" };

    const size = 264;
    const centerX = size / 2;
    const centerY = size / 2;
    const coreRadius = size * 0.3 / 2; // ~39.6

    // Find all brand icon wrappers (the divs with absolute positioning inside the arm)
    const arms = container.querySelectorAll(":scope > div[class*='absolute']");
    // The orbiting sources are direct children that are absolute positioned divs
    // containing the icon circle divs

    // Better: find the SourceOrbit component's direct children that are absolute
    // and contain BrandIcon
    const sourceDivs = Array.from(container.querySelectorAll("div")).filter(el => {
      const style = window.getComputedStyle(el);
      return style.position === "absolute" && el.querySelector("svg, img") !== null;
    });

    // Actually, let's use a different approach: find all BrandIcon elements
    const brandIcons = container.querySelectorAll("[class*='rounded-full'][style*='background']");

    const iconData = [];
    brandIcons.forEach((icon, i) => {
      const rect = icon.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const iconCenterX = rect.left - containerRect.left + rect.width / 2;
      const iconCenterY = rect.top - containerRect.top + rect.height / 2;
      const distFromCenter = Math.sqrt(
        Math.pow(iconCenterX - centerX, 2) + Math.pow(iconCenterY - centerY, 2)
      );
      iconData.push({
        index: i,
        distFromCenter: Math.round(distFromCenter),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    });

    // Also check if core logo is visible
    const coreEl = container.querySelector("div.rounded-full[style*='linear-gradient']");
    const coreVisible = coreEl ? {
      visible: true,
      rect: coreEl.getBoundingClientRect()
    } : { visible: false };

    return {
      containerFound: true,
      containerSize: { width: container.offsetWidth, height: container.offsetHeight },
      coreRadius: Math.round(coreRadius),
      coreVisible: coreVisible.visible,
      icons: iconData,
      totalIcons: iconData.length,
    };
  });

  console.log("=== ORBIT VERIFICATION ===");
  console.log(JSON.stringify(results, null, 2));

  // Check: all 5 icons at distance > core radius (with margin)
  const minSafeDist = results.coreRadius + 25; // 25px gap from core edge
  const allOutsideCore = results.icons.every(ic => ic.distFromCenter > minSafeDist);
  const maxDist = Math.max(...results.icons.map(i => i.distFromCenter));
  const maxAllowed = (results.containerSize.width / 2) - 20; // 20px padding
  const allInsideContainer = results.icons.every(ic => ic.distFromCenter < maxAllowed);

  console.log(`\n--- CHECKS ---`);
  console.log(`Total icons found: ${results.totalIcons} (expected: 5)`);
  console.log(`All outside core (min ${minSafeDist}px): ${allOutsideCore}`);
  console.log(`All inside container (max ${maxAllowed}px): ${allInsideContainer}`);
  console.log(`Max icon distance: ${maxDist}px`);
  console.log(`Core radius: ${results.coreRadius}px`);

  if (results.totalIcons === 5 && allOutsideCore && allInsideContainer) {
    console.log("\n✅ ALL CHECKS PASSED — all 5 logos visible and orbiting correctly");
  } else {
    console.log("\n❌ ISSUES FOUND:");
    if (results.totalIcons !== 5) console.log(`  - Expected 5 icons, found ${results.totalIcons}`);
    if (!allOutsideCore) console.log(`  - Some icons too close to core (need >${minSafeDist}px)`);
    if (!allInsideContainer) console.log(`  - Some icons outside container bounds`);
  }

  // Also take screenshot for visual verification
  await page.screenshot({ path: "/tmp/orbit-fix-verify.png", fullPage: false });
  console.log("\nScreenshot saved to /tmp/orbit-fix-verify.png");

  await browser.close();
}

main().catch(console.error);
