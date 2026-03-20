export async function searchAwards(from, to, cabin, month, year) {
  try {
    const params = new URLSearchParams({ from, to, cabin, month, year: String(year) });
    const res = await fetch(`/api/search?${params}`);
    if (!res.ok) throw new Error("API error");
    const json = await res.json();

    // Live scraped data from GitHub Actions
    if (json.source === "scraped" && json.data?.length) {
      return { source: "scraped", results: json.data, scrapedAt: json.scrapedAt };
    }

    // Seats.aero API data
    if (json.source === "seats.aero" && json.data) {
      return { source: "api", results: transformSeatsAeroData(json.data) };
    }
  } catch {
    // Fall through to local generation
  }
  return { source: "local", results: null };
}

function transformSeatsAeroData(raw) {
  // Placeholder: map Seats.aero response shape to app's result shape
  // Expected fields: { id, program, pn, airline, alliance, miles, taxes, stops, route, dur, layDur, visa, avail, fs, logo, src }
  return [];
}
