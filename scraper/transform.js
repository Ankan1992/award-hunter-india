import { PG, ALLIANCES } from "./programData.js";

let idCounter = 0;

/**
 * Transform raw scraped flight data into the app's result format.
 * Expected output matches the shape used by ResultCard.jsx
 */
export function transformResults(rawFlights) {
  idCounter = 0;
  return rawFlights.map((f) => transformOne(f)).filter(Boolean);
}

function transformOne(f) {
  const pg = PG[f.program];
  if (!pg) return null;

  idCounter++;
  const alliance = ALLIANCES[pg.al] || pg.al;

  // Visa-free transit check for Indian passports (common hubs)
  const visaFreeHubs = new Set([
    "SIN", "BKK", "KUL", "DOH", "DXB", "AUH", "IST", "ADD",
    "NRT", "ICN", "HKG", "TPE", "CMB", "DAC", "KTM", "MLE",
    "MCT", "BAH", "JED", "RUH", "GVA", "ZRH", "FRA", "MUC",
    "AMS", "CDG", "VIE", "ETH",
  ]);
  const visaRequired = f.layAp && !visaFreeHubs.has(f.layAp);

  return {
    id: `scrape_${f.program}_${idCounter}`,
    program: f.program,
    pn: pg.n,
    airline: f.airline,
    alliance,
    miles: f.miles,
    taxes: f.taxes,
    stops: f.stops,
    route: f.route,
    dur: f.dur || 0,
    layDur: f.layDur || 0,
    layAp: f.layAp || "",
    layCity: f.layCity || "",
    visa: visaRequired ? "required" : "free",
    avail: f.avail || "available",
    fs: pg.fs,
    logo: pg.l,
    src: "Live Scrape",
  };
}
