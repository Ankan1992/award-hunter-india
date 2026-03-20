import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function handler(req, res) {
  const { from, to, cabin, month, year } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: "from and to are required" });
  }

  // 1. Check scraped data first (free, from GitHub Actions)
  try {
    const scrapedPath = resolve(__dirname, "../data/scraped.json");
    const scraped = JSON.parse(readFileSync(scrapedPath, "utf-8"));

    if (scraped.scrapedAt) {
      const age = Date.now() - new Date(scraped.scrapedAt).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (age < maxAge) {
        const key = `${from}-${to}-${cabin || "business"}`;
        const routeData = scraped.routes[key];

        if (routeData && routeData.length > 0) {
          return res.status(200).json({
            source: "scraped",
            data: routeData,
            scrapedAt: scraped.scrapedAt,
          });
        }
      }
    }
  } catch {
    // Fall through if scraped data unavailable
  }

  // 2. Try Seats.aero Partner API if key configured
  const apiKey = process.env.SEATS_AERO_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch(
        `https://seats.aero/partnerapi/search?origin=${from}&destination=${to}&cabin=${cabin || "business"}`,
        { headers: { "Partner-Authorization": apiKey, "Accept": "application/json" } }
      );
      if (response.ok) {
        const data = await response.json();
        return res.status(200).json({ source: "seats.aero", data });
      }
    } catch {
      // Fall through to simulated data
    }
  }

  // 3. No live data — frontend will use local generation
  return res.status(200).json({ source: "simulated", data: null });
}
