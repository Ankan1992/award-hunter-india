import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { scrapeAeroplan } from "./aeroplan.js";
import { scrapeLifemiles } from "./lifemiles.js";
import { transformResults } from "./transform.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Target date: ~30 days from now (typical award search window)
function getTargetDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

async function main() {
  console.log("=== AwardHunter Scraper ===");
  const startTime = Date.now();

  // Load routes
  const routesPath = resolve(__dirname, "routes.json");
  const routes = JSON.parse(readFileSync(routesPath, "utf-8"));
  console.log(`Loaded ${routes.length} routes`);

  const targetDate = getTargetDate();
  console.log(`Target date: ${targetDate}\n`);

  // Load existing scraped data to merge
  const scrapedPath = resolve(__dirname, "../data/scraped.json");
  let existing = { scrapedAt: null, version: 1, routes: {} };
  try {
    existing = JSON.parse(readFileSync(scrapedPath, "utf-8"));
  } catch {}

  let allRawFlights = [];

  // --- Aeroplan ---
  console.log("[1/2] Scraping Aeroplan...");
  try {
    const aeroplanRaw = await scrapeAeroplan(routes, targetDate);
    console.log(`  Aeroplan: ${aeroplanRaw.length} flights found\n`);
    allRawFlights.push(...aeroplanRaw);
  } catch (err) {
    console.error(`  Aeroplan error: ${err.message}\n`);
  }

  // --- LifeMiles ---
  console.log("[2/2] Scraping LifeMiles...");
  try {
    const lifemilesRaw = await scrapeLifemiles(routes, targetDate);
    console.log(`  LifeMiles: ${lifemilesRaw.length} flights found\n`);
    allRawFlights.push(...lifemilesRaw);
  } catch (err) {
    console.error(`  LifeMiles error: ${err.message}\n`);
  }

  // Transform to app format
  const transformed = transformResults(allRawFlights);
  console.log(`Total transformed results: ${transformed.length}`);

  if (transformed.length === 0) {
    console.warn("\n⚠ No results scraped. Keeping existing data intact.");
    // Don't overwrite — exit with code 1 so GitHub Actions knows
    process.exit(1);
  }

  // Group by route key: "FROM-TO-CABIN"
  const routeMap = { ...existing.routes };
  for (const result of transformed) {
    const from = result.route.split("-")[0];
    const to = result.route.split("-").pop();
    const key = `${from}-${to}-${result.miles > 0 ? "business" : "business"}`; // cabin from raw
    if (!routeMap[key]) routeMap[key] = [];
    routeMap[key].push(result);
  }

  // Deduplicate within each route (by program + miles + stops)
  for (const key of Object.keys(routeMap)) {
    const seen = new Set();
    routeMap[key] = routeMap[key].filter((r) => {
      const sig = `${r.program}-${r.miles}-${r.stops}-${r.airline}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
  }

  // Write output
  const output = {
    scrapedAt: new Date().toISOString(),
    version: 1,
    routes: routeMap,
  };

  writeFileSync(scrapedPath, JSON.stringify(output, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Saved to data/scraped.json (${Object.keys(routeMap).length} routes, ${elapsed}s)`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
