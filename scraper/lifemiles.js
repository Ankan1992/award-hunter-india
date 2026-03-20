import { chromium } from "playwright";

const USD_TO_INR = 83;
const CABIN_MAP = { business: "J", first: "F", premium_economy: "W" };

/**
 * Scrape LifeMiles award availability via form interaction + network interception.
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
    await delay(2000);

    // Dismiss cookie consent if present
    try {
      const cookieBtns = [
        "#onetrust-accept-btn-handler",
        "button:has-text('Accept')",
        "[class*='cookie'] button",
        "button:has-text('I agree')",
        "button:has-text('Accept All')",
      ];
      for (const sel of cookieBtns) {
        const btn = await page.$(sel);
        if (btn) { await btn.click().catch(() => {}); await delay(1000); break; }
      }
    } catch {}

    for (const route of routes) {
      try {
        const cabin = CABIN_MAP[route.cabin] || "J";
        const captured = [];

        // Broad network interception
        const responseHandler = async (response) => {
          const url = response.url();
          const ct = response.headers()["content-type"] || "";
          if (
            ct.includes("json") &&
            response.status() === 200 &&
            (url.includes("search") || url.includes("availability") || url.includes("flight") ||
             url.includes("offer") || url.includes("itinerar") || url.includes("lifemiles") ||
             url.includes("avianca"))
          ) {
            try {
              const text = await response.text();
              if (text.length > 100 && (text.includes("miles") || text.includes("Miles") ||
                  text.includes("flight") || text.includes("segment") || text.includes("price"))) {
                const body = JSON.parse(text);
                captured.push(body);
                console.log(`    [LifeMiles] Captured API response from ${url.substring(0, 80)}...`);
              }
            } catch {}
          }
        };
        page.on("response", responseHandler);

        console.log(`  [LifeMiles] Searching ${route.from}→${route.to} ${cabin} ${targetDate}`);

        // Navigate to search page
        await page.goto("https://www.lifemiles.com/flight/search", {
          waitUntil: "domcontentloaded",
          timeout: 25000,
        }).catch(() => {});
        await delay(3000);

        // Try form interaction
        try {
          // Select one-way if available
          const oneWayBtn = await page.$("button:has-text('One way'), label:has-text('One way'), [data-testid='one-way'], input[value='oneway']");
          if (oneWayBtn) { await oneWayBtn.click().catch(() => {}); await delay(500); }

          // Fill origin
          const originInput = await page.$("input[placeholder*='Origin' i], input[placeholder*='From' i], input[aria-label*='origin' i], input[name*='origin' i], #origin");
          if (originInput) {
            await originInput.click();
            await delay(300);
            await originInput.fill("");
            await originInput.type(route.from, { delay: 100 });
            await delay(1500);
            const suggestion = await page.$("[role='option']:first-child, [class*='suggestion']:first-child, li[class*='item']:first-child, .autocomplete-item:first-child, [class*='dropdown'] li:first-child");
            if (suggestion) { await suggestion.click().catch(() => {}); }
            else { await page.keyboard.press("Enter"); }
            await delay(500);
          }

          // Fill destination
          const destInput = await page.$("input[placeholder*='Destination' i], input[placeholder*='To' i], input[aria-label*='destination' i], input[name*='destination' i], #destination");
          if (destInput) {
            await destInput.click();
            await delay(300);
            await destInput.fill("");
            await destInput.type(route.to, { delay: 100 });
            await delay(1500);
            const suggestion = await page.$("[role='option']:first-child, [class*='suggestion']:first-child, li[class*='item']:first-child, .autocomplete-item:first-child, [class*='dropdown'] li:first-child");
            if (suggestion) { await suggestion.click().catch(() => {}); }
            else { await page.keyboard.press("Enter"); }
            await delay(500);
          }

          // Fill date
          const dateInput = await page.$("input[type='date'], input[aria-label*='date' i], input[placeholder*='Date' i], input[name*='date' i]");
          if (dateInput) {
            await dateInput.click();
            await delay(300);
            await dateInput.fill(targetDate);
            await delay(500);
          }

          // Click search
          const searchBtn = await page.$("button[type='submit'], button:has-text('Search'), button:has-text('Find'), [data-testid='search-button'], button:has-text('Search flights')");
          if (searchBtn) {
            await searchBtn.click().catch(() => {});
            console.log(`    [LifeMiles] Clicked search button, waiting for results...`);
            await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
            await delay(5000);
          }
        } catch (formErr) {
          console.log(`    [LifeMiles] Form interaction failed: ${formErr.message}`);
        }

        // Direct URL fallback
        if (captured.length === 0) {
          const directUrl = `https://www.lifemiles.com/flight/search?origin=${route.from}&destination=${route.to}&date=${targetDate}&cabin=${cabin}&adults=1&children=0&infants=0&type=oneway`;
          await page.goto(directUrl, { waitUntil: "networkidle", timeout: 25000 }).catch(() => {});
          await delay(5000);
        }

        // Parse captured responses
        for (const body of captured) {
          const flights = extractLifemilesFlights(body, route, targetDate);
          results.push(...flights);
        }

        // DOM fallback
        if (captured.length === 0 || results.length === 0) {
          const domResults = await scrapeLifemilesDOM(page, route, targetDate);
          results.push(...domResults);
        }

        page.removeListener("response", responseHandler);
        await delay(randomDelay(2000, 5000));
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
    const candidates = [
      body?.data?.flights,
      body?.flights,
      body?.data?.results,
      body?.results,
      body?.data?.itineraries,
      body?.itineraries,
      body?.data?.offers,
      body?.offers,
    ].filter(Boolean);

    for (const data of candidates) {
      const items = Array.isArray(data) ? data : [];

      for (const item of items) {
        const segments = item.segments || item.flights || item.legs || [];
        const miles =
          item.milesRequired || item.miles || item.price?.miles || item.cost?.miles || 0;
        const taxesUsd =
          item.taxes?.total || item.price?.taxes || item.cost?.taxes || item.copay || item.tax || 0;

        if (!miles) continue;

        const firstSeg = segments[0] || {};
        const lastSeg = segments[segments.length - 1] || firstSeg;
        const airline = firstSeg.carrier || firstSeg.airline || firstSeg.marketingCarrier || "AV";
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
          program: "lifemiles",
          airline,
          miles: Math.round(miles),
          taxes: Math.round(taxesUsd * USD_TO_INR),
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
    }
  } catch (err) {
    console.warn(`  [LifeMiles] Parse error: ${err.message}`);
  }

  return flights;
}

async function scrapeLifemilesDOM(page, route, date) {
  try {
    const selectors = [
      ".flight-card",
      ".result-card",
      "[data-testid='flight-result']",
      "[class*='FlightCard']",
      "[class*='flight-row']",
      "[class*='itinerary']",
      ".offer-card",
    ];

    let cards = [];
    for (const sel of selectors) {
      cards = await page.$$(sel);
      if (cards.length > 0) {
        console.log(`    [LifeMiles] Found ${cards.length} DOM results with selector: ${sel}`);
        break;
      }
    }

    const flights = [];
    for (const card of cards) {
      const text = await card.innerText().catch(() => "");
      const milesMatch = text.match(/([\d,]+)\s*(?:miles|mi|Miles)/i);
      const taxMatch = text.match(/(?:US?\$|USD|\$)\s*([\d,.]+)/i);

      if (milesMatch) {
        const stopsMatch = text.match(/(\d)\s*stop/i);
        flights.push({
          program: "lifemiles",
          airline: "AV",
          miles: parseInt(milesMatch[1].replace(/,/g, ""), 10),
          taxes: Math.round(parseFloat((taxMatch?.[1] || "0").replace(/,/g, "")) * USD_TO_INR),
          stops: stopsMatch ? parseInt(stopsMatch[1], 10) : 0,
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
