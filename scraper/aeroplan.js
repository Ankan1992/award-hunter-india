import { chromium } from "playwright";

const CAD_TO_INR = 62;
const CABIN_MAP = { business: "Business", first: "First", premium_economy: "PremiumEconomy" };
const AEROPLAN_URL = "https://www.aircanada.com/aeroplan/redeem/availability/outbound";

/**
 * Scrape Aeroplan award availability for a single route+date.
 * Uses network interception to capture the JSON API response.
 */
export async function scrapeAeroplan(routes, targetDate) {
  const results = [];
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
    });

    const page = await context.newPage();

    for (const route of routes) {
      try {
        const cabin = CABIN_MAP[route.cabin] || "Business";
        const captured = [];

        // Intercept XHR/fetch responses from Aeroplan's availability API
        page.on("response", async (response) => {
          const url = response.url();
          if (
            url.includes("/aeroplan/") &&
            (url.includes("availability") || url.includes("search")) &&
            response.status() === 200
          ) {
            try {
              const body = await response.json();
              captured.push(body);
            } catch {
              // Not JSON, skip
            }
          }
        });

        // Build search URL
        const searchUrl = `${AEROPLAN_URL}?org0=${route.from}&dest0=${route.to}&departureDate0=${targetDate}&ADT=1&YTH=0&CHD=0&INF=0&INS=0&cabin=${cabin}&lang=en-CA`;

        console.log(`  [Aeroplan] Searching ${route.from}→${route.to} ${cabin} ${targetDate}`);
        await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});

        // Wait for API responses to settle
        await delay(randomDelay(4000, 8000));

        // Parse captured responses
        for (const body of captured) {
          const flights = extractAeroplanFlights(body, route, targetDate);
          results.push(...flights);
        }

        // If no API interception worked, try scraping the DOM as fallback
        if (captured.length === 0) {
          const domResults = await scrapeAeroplanDOM(page, route, targetDate);
          results.push(...domResults);
        }

        // Remove listener to avoid duplicates
        page.removeAllListeners("response");

        // Random delay between searches
        await delay(randomDelay(3000, 7000));
      } catch (err) {
        console.warn(`  [Aeroplan] Failed ${route.from}→${route.to}: ${err.message}`);
      }
    }

    await context.close();
  } catch (err) {
    console.error(`[Aeroplan] Browser error: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }

  return results;
}

function extractAeroplanFlights(body, route, date) {
  const flights = [];

  try {
    // Aeroplan API typically returns data in air_bounds or similar structure
    const bounds =
      body?.data?.air_bounds ||
      body?.air_bounds ||
      body?.data?.results ||
      body?.results ||
      [];

    const items = Array.isArray(bounds) ? bounds : [];

    for (const bound of items) {
      const segments = bound.segments || bound.flights || [];
      const miles =
        bound.prices?.milesConversion?.convertedMiles?.base ||
        bound.miles ||
        bound.price?.miles ||
        0;
      const taxesCad = bound.prices?.milesConversion?.remainingNonConverted?.total?.value ||
        bound.taxes?.total ||
        bound.price?.taxes ||
        0;

      if (!miles) continue;

      const firstSeg = segments[0] || {};
      const lastSeg = segments[segments.length - 1] || firstSeg;
      const airline = firstSeg.marketingCarrier || firstSeg.airline || "AC";
      const depTime = firstSeg.departure?.time || firstSeg.departureTime || "";
      const arrTime = lastSeg.arrival?.time || lastSeg.arrivalTime || "";
      const stops = Math.max(0, segments.length - 1);

      // Calculate duration
      const depDt = firstSeg.departure?.dateTime || `${date}T${depTime}`;
      const arrDt = lastSeg.arrival?.dateTime || `${date}T${arrTime}`;
      let dur = 0;
      try {
        dur = Math.round((new Date(arrDt) - new Date(depDt)) / 60000);
        if (dur <= 0) dur += 1440; // next day arrival
      } catch { dur = 0; }

      // Layover info
      let layAp = "", layCity = "", layDur = 0;
      if (stops > 0 && segments.length >= 2) {
        const layoverAirport = segments[0].arrival?.airport || segments[0].destination || "";
        layAp = layoverAirport;
        layCity = layoverAirport; // Could resolve to city name
        try {
          const layStart = segments[0].arrival?.dateTime;
          const layEnd = segments[1].departure?.dateTime;
          if (layStart && layEnd) {
            layDur = Math.round((new Date(layEnd) - new Date(layStart)) / 60000);
          }
        } catch { layDur = 0; }
      }

      flights.push({
        program: "aeroplan",
        airline,
        miles: Math.round(miles),
        taxes: Math.round(taxesCad * CAD_TO_INR),
        stops,
        dur,
        layAp,
        layCity,
        layDur,
        route: `${route.from}-${stops > 0 ? layAp + "-" : ""}${route.to}`,
        cabin: route.cabin,
        date,
        avail: "available",
        raw: "aeroplan-api",
      });
    }
  } catch (err) {
    console.warn(`  [Aeroplan] Parse error: ${err.message}`);
  }

  return flights;
}

async function scrapeAeroplanDOM(page, route, date) {
  // Fallback DOM scraping if API interception didn't capture anything
  try {
    const cards = await page.$$("[data-testid='flight-card'], .flight-result, .availability-result");
    const flights = [];

    for (const card of cards) {
      const text = await card.innerText().catch(() => "");
      const milesMatch = text.match(/([\d,]+)\s*(?:miles|pts|points)/i);
      const taxMatch = text.match(/(?:CA?\$|CAD)\s*([\d,.]+)/i);

      if (milesMatch) {
        flights.push({
          program: "aeroplan",
          airline: "AC",
          miles: parseInt(milesMatch[1].replace(/,/g, ""), 10),
          taxes: Math.round(parseFloat((taxMatch?.[1] || "0").replace(/,/g, "")) * CAD_TO_INR),
          stops: 0,
          dur: 0,
          layAp: "",
          layCity: "",
          layDur: 0,
          route: `${route.from}-${route.to}`,
          cabin: route.cabin,
          date,
          avail: "available",
          raw: "aeroplan-dom",
        });
      }
    }

    return flights;
  } catch {
    return [];
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
