import { chromium } from "playwright";

const CAD_TO_INR = 62;
const CABIN_MAP = { business: "business", first: "first", premium_economy: "premiumeconomy" };

/**
 * Scrape Aeroplan award availability via form interaction + network interception.
 */
export async function scrapeAeroplan(routes, targetDate) {
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

    // Remove webdriver flag to avoid detection
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    });

    for (const route of routes) {
      try {
        const cabin = CABIN_MAP[route.cabin] || "business";
        const captured = [];

        // Broad network interception — capture ANY JSON response that looks like flight data
        const responseHandler = async (response) => {
          const url = response.url();
          const ct = response.headers()["content-type"] || "";
          if (
            ct.includes("json") &&
            response.status() === 200 &&
            (url.includes("availability") || url.includes("search") || url.includes("offer") ||
             url.includes("flight") || url.includes("air-bound") || url.includes("aeroplan"))
          ) {
            try {
              const text = await response.text();
              if (text.length > 100 && (text.includes("miles") || text.includes("Miles") ||
                  text.includes("segment") || text.includes("bound") || text.includes("price"))) {
                const body = JSON.parse(text);
                captured.push(body);
                console.log(`    [Aeroplan] Captured API response from ${url.substring(0, 80)}...`);
              }
            } catch {}
          }
        };
        page.on("response", responseHandler);

        console.log(`  [Aeroplan] Searching ${route.from}→${route.to} ${cabin} ${targetDate}`);

        // Navigate to the Aeroplan booking page
        await page.goto("https://www.aircanada.com/aeroplan/redeem/availability/outbound", {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        }).catch(() => {});

        await delay(3000);

        // Try to interact with the search form
        try {
          // Accept cookies if banner present
          const cookieBtn = await page.$("[id*='cookie'] button, [class*='cookie'] button, #onetrust-accept-btn-handler");
          if (cookieBtn) { await cookieBtn.click().catch(() => {}); await delay(1000); }

          // Select one-way
          const oneWayBtn = await page.$("[data-testid='one-way'], button:has-text('One-way'), label:has-text('One-way'), [aria-label*='one-way' i]");
          if (oneWayBtn) { await oneWayBtn.click().catch(() => {}); await delay(500); }

          // Fill origin
          const originInput = await page.$("[data-testid='origin'], input[placeholder*='From' i], input[aria-label*='origin' i], input[aria-label*='from' i], #origin, input[name*='origin' i]");
          if (originInput) {
            await originInput.click();
            await delay(300);
            await originInput.fill(route.from);
            await delay(1000);
            // Select first suggestion
            const suggestion = await page.$("[role='option']:first-child, [class*='suggestion']:first-child, li[data-value], .autocomplete-item:first-child");
            if (suggestion) { await suggestion.click().catch(() => {}); }
            else { await page.keyboard.press("Enter"); }
            await delay(500);
          }

          // Fill destination
          const destInput = await page.$("[data-testid='destination'], input[placeholder*='To' i], input[aria-label*='destination' i], input[aria-label*='to' i], #destination, input[name*='destination' i]");
          if (destInput) {
            await destInput.click();
            await delay(300);
            await destInput.fill(route.to);
            await delay(1000);
            const suggestion = await page.$("[role='option']:first-child, [class*='suggestion']:first-child, li[data-value], .autocomplete-item:first-child");
            if (suggestion) { await suggestion.click().catch(() => {}); }
            else { await page.keyboard.press("Enter"); }
            await delay(500);
          }

          // Fill date
          const dateInput = await page.$("[data-testid='date'], input[type='date'], input[aria-label*='date' i], input[placeholder*='Date' i], input[name*='date' i]");
          if (dateInput) {
            await dateInput.click();
            await delay(300);
            await dateInput.fill(targetDate);
            await delay(500);
          }

          // Click search button
          const searchBtn = await page.$("button[type='submit'], button:has-text('Search'), button:has-text('Find flights'), [data-testid='search-button']");
          if (searchBtn) {
            await searchBtn.click().catch(() => {});
            console.log(`    [Aeroplan] Clicked search button, waiting for results...`);
            // Wait for network to settle after search
            await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
            await delay(5000);
          }
        } catch (formErr) {
          console.log(`    [Aeroplan] Form interaction failed: ${formErr.message}`);
        }

        // Also try direct URL with query params as fallback
        if (captured.length === 0) {
          const directUrl = `https://www.aircanada.com/aeroplan/redeem/availability/outbound?org0=${route.from}&dest0=${route.to}&departureDate0=${targetDate}&ADT=1&YTH=0&CHD=0&INF=0&INS=0&cabin=${cabin}&lang=en-CA`;
          await page.goto(directUrl, { waitUntil: "networkidle", timeout: 25000 }).catch(() => {});
          await delay(5000);
        }

        // Parse captured responses
        for (const body of captured) {
          const flights = extractAeroplanFlights(body, route, targetDate);
          results.push(...flights);
        }

        // DOM fallback
        if (captured.length === 0 || results.length === 0) {
          const domResults = await scrapeAeroplanDOM(page, route, targetDate);
          results.push(...domResults);
        }

        page.removeListener("response", responseHandler);
        await delay(randomDelay(2000, 5000));
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
    // Try many possible response shapes
    const candidates = [
      body?.data?.air_bounds,
      body?.air_bounds,
      body?.data?.results,
      body?.results,
      body?.data?.flights,
      body?.flights,
      body?.data?.offers,
      body?.offers,
      body?.data?.itineraries,
    ].filter(Boolean);

    for (const bounds of candidates) {
      const items = Array.isArray(bounds) ? bounds : [];

      for (const bound of items) {
        const segments = bound.segments || bound.flights || bound.legs || [];

        // Try many price field patterns
        const miles =
          bound.prices?.milesConversion?.convertedMiles?.base ||
          bound.prices?.miles?.base ||
          bound.price?.miles ||
          bound.miles ||
          bound.milesRequired ||
          bound.cost?.miles ||
          0;

        const taxesCad =
          bound.prices?.milesConversion?.remainingNonConverted?.total?.value ||
          bound.prices?.taxes?.total ||
          bound.price?.taxes ||
          bound.taxes?.total ||
          bound.tax ||
          0;

        if (!miles) continue;

        const firstSeg = segments[0] || {};
        const lastSeg = segments[segments.length - 1] || firstSeg;
        const airline = firstSeg.marketingCarrier || firstSeg.carrier || firstSeg.airline || "AC";
        const stops = Math.max(0, segments.length - 1);

        let dur = bound.duration || bound.totalDuration || 0;
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
    }
  } catch (err) {
    console.warn(`  [Aeroplan] Parse error: ${err.message}`);
  }

  return flights;
}

async function scrapeAeroplanDOM(page, route, date) {
  try {
    // Try various selectors that airline sites commonly use
    const selectors = [
      "[data-testid='flight-card']",
      ".flight-result",
      ".availability-result",
      "[class*='FlightCard']",
      "[class*='flight-row']",
      "[class*='bound-result']",
      ".offer-card",
      "[role='listitem']",
    ];

    let cards = [];
    for (const sel of selectors) {
      cards = await page.$$(sel);
      if (cards.length > 0) {
        console.log(`    [Aeroplan] Found ${cards.length} DOM results with selector: ${sel}`);
        break;
      }
    }

    const flights = [];
    for (const card of cards) {
      const text = await card.innerText().catch(() => "");
      const milesMatch = text.match(/([\d,]+)\s*(?:miles|pts|points|Aeroplan)/i);
      const taxMatch = text.match(/(?:CA?\$|CAD|C\$)\s*([\d,.]+)/i);

      if (milesMatch) {
        const stopsMatch = text.match(/(\d)\s*stop/i);
        flights.push({
          program: "aeroplan",
          airline: "AC",
          miles: parseInt(milesMatch[1].replace(/,/g, ""), 10),
          taxes: Math.round(parseFloat((taxMatch?.[1] || "0").replace(/,/g, "")) * CAD_TO_INR),
          stops: stopsMatch ? parseInt(stopsMatch[1], 10) : 0,
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
