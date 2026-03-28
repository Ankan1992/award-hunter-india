import { chromium } from "playwright";

const EUR_TO_INR = 90;
const CABIN_MAP = { business: "BUSINESS", first: "FIRST", premium_economy: "PREMIUM" };

/**
 * Scrape Flying Blue award availability via airfrance.us.
 * Uses the calendar URL trick (open-dates) for broader coverage.
 */
export async function scrapeFlyingblue(routes, targetDate) {
  const results = [];
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
    });

    const UA_LIST = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    ];
    const userAgent = UA_LIST[Math.floor(Math.random() * UA_LIST.length)];
    const viewportWidth = 1280 + Math.floor(Math.random() * 640);
    const viewportHeight = 800 + Math.floor(Math.random() * 280);

    const context = await browser.newContext({
      userAgent,
      viewport: { width: viewportWidth, height: viewportHeight },
      locale: "en-US",
      extraHTTPHeaders: {
        "sec-ch-ua": '"Chromium";v="131", "Google Chrome";v="131"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "accept-language": "en-US,en;q=0.9",
      },
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    });

    for (const route of routes) {
      try {
        const cabin = CABIN_MAP[route.cabin] || "BUSINESS";
        const captured = [];

        // Network interception for AF/KLM API responses
        const responseHandler = async (response) => {
          const url = response.url();
          const ct = response.headers()["content-type"] || "";
          if (
            ct.includes("json") &&
            response.status() === 200 &&
            (url.includes("search") || url.includes("availability") || url.includes("offer") ||
             url.includes("flight") || url.includes("flyingblue") || url.includes("reward") ||
             url.includes("calendar") || url.includes("air-offer") || url.includes("open-date"))
          ) {
            try {
              const text = await response.text();
              if (text.length > 100 && (text.includes("miles") || text.includes("Miles") ||
                  text.includes("price") || text.includes("flight") || text.includes("segment") ||
                  text.includes("reward"))) {
                const body = JSON.parse(text);
                captured.push(body);
                console.log(`    [FlyingBlue] Captured API response from ${url.substring(0, 80)}...`);
              }
            } catch {}
          }
        };
        page.on("response", responseHandler);

        console.log(`  [FlyingBlue] Searching ${route.from}→${route.to} ${cabin} ${targetDate}`);

        // Try the Air France search URL
        const directUrl = `https://wwws.airfrance.us/search/offers?pax1=ADT&cabinClass=${cabin}&activeConnection=0&connections=${route.from}>${route.to}-${targetDate}&bookingFlow=REWARD`;
        await page.goto(directUrl, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
        await delay(4000);

        // Accept cookies
        try {
          const cookieBtn = await page.$("#didomi-notice-agree-button, [id*='cookie'] button, button:has-text('Accept'), button:has-text('Agree')");
          if (cookieBtn) { await cookieBtn.click().catch(() => {}); await delay(1000); }
        } catch {}

        // Wait for network
        await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
        await delay(3000);

        // Also try the calendar/open-dates trick for broader data
        if (captured.length === 0) {
          try {
            const calUrl = `https://wwws.airfrance.us/search/open-dates?pax1=ADT&cabinClass=${cabin}&activeConnection=0&connections=${route.from}>${route.to}-${targetDate}&bookingFlow=REWARD`;
            await page.goto(calUrl, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
            await delay(5000);
          } catch {}
        }

        // Parse captured responses
        for (const body of captured) {
          const flights = extractFlyingblueFlights(body, route, targetDate);
          results.push(...flights);
        }

        // DOM fallback
        if (captured.length === 0 || results.length === 0) {
          const domResults = await scrapeFlyingblueDOM(page, route, targetDate);
          results.push(...domResults);
        }

        page.removeListener("response", responseHandler);
        await delay(randomDelay(3000, 6000));
      } catch (err) {
        console.warn(`  [FlyingBlue] Failed ${route.from}→${route.to}: ${err.message}`);
      }
    }

    await context.close();
  } catch (err) {
    console.error(`[FlyingBlue] Browser error: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }

  return results;
}

function extractFlyingblueFlights(body, route, date) {
  const flights = [];

  try {
    // Flying Blue API has various shapes
    const candidates = [
      body?.data?.flights, body?.flights,
      body?.data?.results, body?.results,
      body?.data?.offers, body?.offers,
      body?.data?.itineraries, body?.itineraries,
      body?.data?.connections, body?.connections,
      body?.data?.rewards, body?.rewards,
      body?.data?.boundList, body?.boundList,
    ].filter(Boolean);

    for (const data of candidates) {
      const items = Array.isArray(data) ? data : [];

      for (const item of items) {
        const segments = item.segments || item.flights || item.legs || item.connections || [];

        const miles =
          item.milesPrice || item.priceInMiles || item.miles ||
          item.milesRequired || item.price?.miles ||
          item.cost?.miles || item.rewardMiles ||
          item.prices?.milesPrice || 0;

        const taxesEur =
          item.taxes?.total || item.price?.taxes ||
          item.cost?.taxes || item.tax ||
          item.taxAmount || 0;

        if (!miles) continue;

        const firstSeg = segments[0] || {};
        const lastSeg = segments[segments.length - 1] || firstSeg;
        const airline = firstSeg.carrier || firstSeg.airline || firstSeg.marketingCarrier || "AF";
        const stops = Math.max(0, segments.length - 1);

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

        let layAp = "", layCity = "", layDur = 0;
        if (stops > 0 && segments.length >= 2) {
          layAp = segments[0].arrival?.airport || segments[0].destination || "";
          layCity = layAp;
          try {
            const ls = segments[0].arrival?.dateTime;
            const le = segments[1].departure?.dateTime;
            if (ls && le) layDur = Math.round((new Date(le) - new Date(ls)) / 60000);
          } catch { layDur = 0; }
        }

        flights.push({
          program: "flying_blue",
          airline,
          miles: Math.round(miles),
          taxes: Math.round(taxesEur * EUR_TO_INR),
          stops, dur, layAp, layCity, layDur,
          route: `${route.from}-${stops > 0 ? layAp + "-" : ""}${route.to}`,
          cabin: route.cabin, date,
          avail: "available",
          raw: "flyingblue-api",
        });
      }
    }
  } catch (err) {
    console.warn(`  [FlyingBlue] Parse error: ${err.message}`);
  }

  return flights;
}

async function scrapeFlyingblueDOM(page, route, date) {
  try {
    const selectors = [
      "[data-testid='flight-card']", ".flight-card",
      "[class*='FlightCard']", "[class*='flight-row']",
      "[class*='bound-result']", "[class*='offer']",
      ".result-card", "[class*='itinerary']",
    ];

    let cards = [];
    for (const sel of selectors) {
      cards = await page.$$(sel);
      if (cards.length > 0) {
        console.log(`    [FlyingBlue] Found ${cards.length} DOM results with selector: ${sel}`);
        break;
      }
    }

    const flights = [];
    for (const card of cards) {
      const text = await card.innerText().catch(() => "");
      const milesMatch = text.match(/([\d,]+)\s*(?:miles|Miles|Flying Blue)/i);
      const taxMatch = text.match(/(?:€|EUR)\s*([\d,.]+)/i);

      if (milesMatch) {
        const stopsMatch = text.match(/(\d)\s*stop/i);
        flights.push({
          program: "flying_blue",
          airline: "AF",
          miles: parseInt(milesMatch[1].replace(/,/g, ""), 10),
          taxes: Math.round(parseFloat((taxMatch?.[1] || "0").replace(/,/g, "")) * EUR_TO_INR),
          stops: stopsMatch ? parseInt(stopsMatch[1], 10) : 0,
          dur: 0, layAp: "", layCity: "", layDur: 0,
          route: `${route.from}-${route.to}`,
          cabin: route.cabin, date,
          avail: "available",
          raw: "flyingblue-dom",
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
