import { chromium } from "playwright";

const GBP_TO_INR = 106;
const CABIN_MAP = { business: "J", first: "F", premium_economy: "W" };

/**
 * Scrape BA Avios award availability via ba.com.
 */
export async function scrapeAvios(routes, targetDate) {
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
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
    ];
    const userAgent = UA_LIST[Math.floor(Math.random() * UA_LIST.length)];
    const viewportWidth = 1280 + Math.floor(Math.random() * 640);
    const viewportHeight = 800 + Math.floor(Math.random() * 280);

    const context = await browser.newContext({
      userAgent,
      viewport: { width: viewportWidth, height: viewportHeight },
      locale: "en-GB",
      extraHTTPHeaders: {
        "sec-ch-ua": '"Chromium";v="131", "Google Chrome";v="131"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "accept-language": "en-GB,en;q=0.9",
      },
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-GB", "en"] });
    });

    for (const route of routes) {
      try {
        const cabin = CABIN_MAP[route.cabin] || "J";
        const captured = [];

        // Network interception for BA API responses
        const responseHandler = async (response) => {
          const url = response.url();
          const ct = response.headers()["content-type"] || "";
          if (
            ct.includes("json") &&
            response.status() === 200 &&
            (url.includes("search") || url.includes("availability") || url.includes("offer") ||
             url.includes("flight") || url.includes("avios") || url.includes("reward") ||
             url.includes("redemption") || url.includes("calendar") || url.includes("bound"))
          ) {
            try {
              const text = await response.text();
              if (text.length > 100 && (text.includes("avios") || text.includes("Avios") ||
                  text.includes("miles") || text.includes("flight") || text.includes("price") ||
                  text.includes("segment"))) {
                const body = JSON.parse(text);
                captured.push(body);
                console.log(`    [Avios] Captured API response from ${url.substring(0, 80)}...`);
              }
            } catch {}
          }
        };
        page.on("response", responseHandler);

        console.log(`  [Avios] Searching ${route.from}→${route.to} ${cabin} ${targetDate}`);

        // BA booking search URL
        const [year, month, day] = targetDate.split("-");
        const directUrl = `https://www.britishairways.com/travel/redeem/execclub/_gf/en_gb?eId=111001&tab_selected=redeem&departurePoint=${route.from}&arrivalPoint=${route.to}&outboundDate=${day}/${month}/${year}&cabin=${cabin}&AD=1&YNG=0&CH=0&INF=0&class=J&SearchSubmit=1`;

        await page.goto(directUrl, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
        await delay(4000);

        // Accept cookies
        try {
          const cookieBtn = await page.$("#accept-recommended-btn-handler, [id*='cookie'] button, button:has-text('Accept'), button:has-text('I agree')");
          if (cookieBtn) { await cookieBtn.click().catch(() => {}); await delay(1000); }
        } catch {}

        // Wait for results
        await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
        await delay(3000);

        // Also try the reward flight finder URL
        if (captured.length === 0) {
          try {
            const rffUrl = `https://www.britishairways.com/travel/finder/execclub/_gf/en_gb?departurePoint=${route.from}&arrivalPoint=${route.to}&cabin=${cabin}&outboundDate=${year}-${month}-${day}`;
            await page.goto(rffUrl, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
            await delay(5000);
          } catch {}
        }

        // Parse captured responses
        for (const body of captured) {
          const flights = extractAviosFlights(body, route, targetDate);
          results.push(...flights);
        }

        // DOM fallback
        if (captured.length === 0 || results.length === 0) {
          const domResults = await scrapeAviosDOM(page, route, targetDate);
          results.push(...domResults);
        }

        page.removeListener("response", responseHandler);
        await delay(randomDelay(3000, 7000));
      } catch (err) {
        console.warn(`  [Avios] Failed ${route.from}→${route.to}: ${err.message}`);
      }
    }

    await context.close();
  } catch (err) {
    console.error(`[Avios] Browser error: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }

  return results;
}

function extractAviosFlights(body, route, date) {
  const flights = [];

  try {
    const candidates = [
      body?.data?.flights, body?.flights,
      body?.data?.results, body?.results,
      body?.data?.offers, body?.offers,
      body?.data?.itineraries, body?.itineraries,
      body?.data?.outbound, body?.outbound,
      body?.data?.journeys, body?.journeys,
    ].filter(Boolean);

    for (const data of candidates) {
      const items = Array.isArray(data) ? data : [];

      for (const item of items) {
        const segments = item.segments || item.flights || item.legs || item.sectors || [];

        const miles =
          item.avios || item.aviosRequired ||
          item.milesRequired || item.miles ||
          item.price?.avios || item.price?.miles ||
          item.cost?.avios || item.cost?.miles || 0;

        const taxesGbp =
          item.taxes?.total || item.price?.taxes || item.price?.cash ||
          item.cost?.taxes || item.tax || item.cashAmount || 0;

        if (!miles) continue;

        const firstSeg = segments[0] || {};
        const lastSeg = segments[segments.length - 1] || firstSeg;
        const airline = firstSeg.carrier || firstSeg.airline || firstSeg.marketingCarrier || "BA";
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
          program: "avios_ba",
          airline,
          miles: Math.round(miles),
          taxes: Math.round(taxesGbp * GBP_TO_INR),
          stops, dur, layAp, layCity, layDur,
          route: `${route.from}-${stops > 0 ? layAp + "-" : ""}${route.to}`,
          cabin: route.cabin, date,
          avail: "available",
          raw: "avios-api",
        });
      }
    }
  } catch (err) {
    console.warn(`  [Avios] Parse error: ${err.message}`);
  }

  return flights;
}

async function scrapeAviosDOM(page, route, date) {
  try {
    const selectors = [
      "[data-testid='flight-card']", ".flight-card",
      "[class*='FlightCard']", "[class*='flight-row']",
      "[class*='journey']", "[class*='result-item']",
      "[class*='avios']", ".offer-card",
      "[role='listitem']",
    ];

    let cards = [];
    for (const sel of selectors) {
      cards = await page.$$(sel);
      if (cards.length > 0) {
        console.log(`    [Avios] Found ${cards.length} DOM results with selector: ${sel}`);
        break;
      }
    }

    const flights = [];
    for (const card of cards) {
      const text = await card.innerText().catch(() => "");
      const milesMatch = text.match(/([\d,]+)\s*(?:Avios|avios|miles)/i);
      const taxMatch = text.match(/(?:£|GBP)\s*([\d,.]+)/i);

      if (milesMatch) {
        const stopsMatch = text.match(/(\d)\s*stop/i);
        flights.push({
          program: "avios_ba",
          airline: "BA",
          miles: parseInt(milesMatch[1].replace(/,/g, ""), 10),
          taxes: Math.round(parseFloat((taxMatch?.[1] || "0").replace(/,/g, "")) * GBP_TO_INR),
          stops: stopsMatch ? parseInt(stopsMatch[1], 10) : 0,
          dur: 0, layAp: "", layCity: "", layDur: 0,
          route: `${route.from}-${route.to}`,
          cabin: route.cabin, date,
          avail: "available",
          raw: "avios-dom",
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
