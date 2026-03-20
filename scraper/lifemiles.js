import { chromium } from "playwright";

const USD_TO_INR = 83;
const CABIN_MAP = { business: "J", first: "F", premium_economy: "W" };
const LIFEMILES_SEARCH = "https://www.lifemiles.com/flight/search";

/**
 * Scrape LifeMiles award availability for a single route+date.
 * Uses network interception to capture the JSON API response.
 */
export async function scrapeLifemiles(routes, targetDate) {
  const results = [];
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
    });

    const page = await context.newPage();

    // Navigate to LifeMiles first to get cookies
    await page.goto("https://www.lifemiles.com", { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});

    // Dismiss cookie consent if present
    try {
      const cookieBtn = await page.$("button:has-text('Accept'), #onetrust-accept-btn-handler, .cookie-accept");
      if (cookieBtn) await cookieBtn.click();
      await delay(1000);
    } catch {}

    for (const route of routes) {
      try {
        const cabin = CABIN_MAP[route.cabin] || "J";
        const captured = [];

        // Intercept API responses
        page.on("response", async (response) => {
          const url = response.url();
          if (
            (url.includes("lifemiles.com") || url.includes("avianca")) &&
            (url.includes("search") || url.includes("availability") || url.includes("flight")) &&
            response.status() === 200 &&
            response.headers()["content-type"]?.includes("json")
          ) {
            try {
              const body = await response.json();
              captured.push(body);
            } catch {}
          }
        });

        // Build search URL with parameters
        const [year, month, day] = targetDate.split("-");
        const searchUrl = `${LIFEMILES_SEARCH}?origin=${route.from}&destination=${route.to}&date=${targetDate}&cabin=${cabin}&adults=1&children=0&infants=0&type=oneway`;

        console.log(`  [LifeMiles] Searching ${route.from}→${route.to} ${cabin} ${targetDate}`);
        await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});

        // Wait for results
        await delay(randomDelay(4000, 8000));

        // Parse captured API responses
        for (const body of captured) {
          const flights = extractLifemilesFlights(body, route, targetDate);
          results.push(...flights);
        }

        // Fallback: try DOM scraping
        if (captured.length === 0) {
          const domResults = await scrapeLifemilesDOM(page, route, targetDate);
          results.push(...domResults);
        }

        page.removeAllListeners("response");
        await delay(randomDelay(3000, 7000));
      } catch (err) {
        console.warn(`  [LifeMiles] Failed ${route.from}→${route.to}: ${err.message}`);
      }
    }

    await context.close();
  } catch (err) {
    console.error(`[LifeMiles] Browser error: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }

  return results;
}

function extractLifemilesFlights(body, route, date) {
  const flights = [];

  try {
    // LifeMiles API structures vary; try common patterns
    const data =
      body?.data?.flights ||
      body?.flights ||
      body?.data?.results ||
      body?.results ||
      body?.data?.itineraries ||
      body?.itineraries ||
      [];

    const items = Array.isArray(data) ? data : [];

    for (const item of items) {
      const segments = item.segments || item.flights || item.legs || [];
      const miles =
        item.milesRequired ||
        item.miles ||
        item.price?.miles ||
        item.cost?.miles ||
        0;
      const taxesUsd =
        item.taxes?.total ||
        item.price?.taxes ||
        item.cost?.taxes ||
        item.copay ||
        0;

      if (!miles) continue;

      const firstSeg = segments[0] || {};
      const lastSeg = segments[segments.length - 1] || firstSeg;
      const airline = firstSeg.carrier || firstSeg.airline || firstSeg.marketingCarrier || "AV";
      const stops = Math.max(0, segments.length - 1);

      // Duration
      let dur = item.duration || item.totalDuration || 0;
      if (!dur) {
        try {
          const dep = firstSeg.departure?.dateTime || firstSeg.departureDateTime;
          const arr = lastSeg.arrival?.dateTime || lastSeg.arrivalDateTime;
          if (dep && arr) {
            dur = Math.round((new Date(arr) - new Date(dep)) / 60000);
            if (dur <= 0) dur += 1440;
          }
        } catch { dur = 0; }
      }

      // Layover
      let layAp = "", layCity = "", layDur = 0;
      if (stops > 0 && segments.length >= 2) {
        layAp = segments[0].arrival?.airport || segments[0].destination || "";
        layCity = layAp;
        try {
          const layStart = segments[0].arrival?.dateTime;
          const layEnd = segments[1].departure?.dateTime;
          if (layStart && layEnd) {
            layDur = Math.round((new Date(layEnd) - new Date(layStart)) / 60000);
          }
        } catch { layDur = 0; }
      }

      flights.push({
        program: "lifemiles",
        airline,
        miles: Math.round(miles),
        taxes: Math.round(taxesUsd * USD_TO_INR), // LifeMiles: zero/low fuel surcharges
        stops,
        dur,
        layAp,
        layCity,
        layDur,
        route: `${route.from}-${stops > 0 ? layAp + "-" : ""}${route.to}`,
        cabin: route.cabin,
        date,
        avail: "available",
        raw: "lifemiles-api",
      });
    }
  } catch (err) {
    console.warn(`  [LifeMiles] Parse error: ${err.message}`);
  }

  return flights;
}

async function scrapeLifemilesDOM(page, route, date) {
  try {
    const cards = await page.$$(".flight-card, .result-card, [data-testid='flight-result']");
    const flights = [];

    for (const card of cards) {
      const text = await card.innerText().catch(() => "");
      const milesMatch = text.match(/([\d,]+)\s*(?:miles|mi)/i);
      const taxMatch = text.match(/(?:US?\$|USD)\s*([\d,.]+)/i);

      if (milesMatch) {
        flights.push({
          program: "lifemiles",
          airline: "AV",
          miles: parseInt(milesMatch[1].replace(/,/g, ""), 10),
          taxes: Math.round(parseFloat((taxMatch?.[1] || "0").replace(/,/g, "")) * USD_TO_INR),
          stops: 0,
          dur: 0,
          layAp: "",
          layCity: "",
          layDur: 0,
          route: `${route.from}-${route.to}`,
          cabin: route.cabin,
          date,
          avail: "available",
          raw: "lifemiles-dom",
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
