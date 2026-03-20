import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Mapping tables ---

// Map scraped partner names → program_id (from src/data/programs.js)
const PROGRAM_MAP = {
  "krisflyer": "krisflyer", "singapore airlines": "krisflyer", "singapore krisflyer": "krisflyer",
  "flying blue": "flying_blue", "air france klm": "flying_blue",
  "avios": "avios_ba", "british airways": "avios_ba", "british airways avios": "avios_ba", "ba avios": "avios_ba",
  "skywards": "skywards", "emirates": "skywards", "emirates skywards": "skywards",
  "etihad guest": "etihad_guest", "etihad": "etihad_guest",
  "miles&smiles": "miles_smiles", "miles & smiles": "miles_smiles", "turkish airlines": "miles_smiles",
  "asia miles": "asia_miles", "cathay pacific": "asia_miles", "cathay": "asia_miles",
  "intermiles": "intermiles", "jet privilege": "intermiles",
  "flying returns": "flying_returns", "air india": "flying_returns",
  "club vistara": "club_vistara", "vistara": "club_vistara",
  "shebamiles": "sheba_miles", "ethiopian": "sheba_miles",
  "lifemiles": "lifemiles", "avianca": "lifemiles", "avianca lifemiles": "lifemiles",
  "aeroplan": "aeroplan", "air canada": "aeroplan", "air canada aeroplan": "aeroplan",
};

// Map card names from blog → card IDs
const CARD_MAP = {
  "hdfc infinia": "hdfc_inf",
  "hdfc diners black": "hdfc_dcb",
  "hdfc diners club black": "hdfc_dcb",
  "hsbc premier": "hsbc",
  "hsbc smart value": "hsbc",
  "axis atlas": "axis_atlas",
  "axis magnus": "axis_magnus",
  "axis burgundy": "axis_burg",
  "axis burgundy private": "axis_burg",
};

// Cards NOT covered by scraping — use baseline data
const BASELINE_ONLY_CARDS = new Set([
  "icici_epm", "icici_tb", "amex_pt", "amex_mr", "sbi", "marriott", "au", "idfc"
]);

// Known program IDs for validation
const VALID_PROGRAMS = new Set([
  "krisflyer", "flying_blue", "avios_ba", "skywards", "etihad_guest",
  "miles_smiles", "asia_miles", "intermiles", "flying_returns",
  "club_vistara", "sheba_miles", "lifemiles", "aeroplan"
]);

// --- Sources to scrape ---
const SOURCES = [
  {
    url: "https://pointsmath.com/hdfc-bank-points-transfer-partners/",
    cards: ["hdfc_inf", "hdfc_dcb"],
    label: "HDFC",
  },
  {
    url: "https://pointsmath.com/hsbc-points-transfer-partners-india/",
    cards: ["hsbc"],
    label: "HSBC",
  },
  {
    url: "https://pointsmath.com/axis-bank-transfer-partners/",
    cards: ["axis_atlas", "axis_magnus", "axis_burg"],
    label: "Axis",
  },
];

// --- Main ---

async function main() {
  console.log("=== AwardHunter Transfer Ratio Scraper ===\n");

  // Load baseline
  const baselinePath = resolve(__dirname, "cards-baseline.json");
  const baseline = JSON.parse(readFileSync(baselinePath, "utf-8"));
  const baselineMap = new Map(baseline.cards.map(c => [c.id, c]));

  // Load existing output for diff
  const outputPath = resolve(__dirname, "../public/data/cards.json");
  let existing = null;
  try {
    existing = JSON.parse(readFileSync(outputPath, "utf-8"));
  } catch {}

  // Scrape each source
  const scrapedCards = new Map();

  for (const source of SOURCES) {
    console.log(`[${source.label}] Fetching ${source.url}`);
    try {
      const html = await fetchPage(source.url);
      const partners = parseTransferTable(html, source.label);
      console.log(`  Found ${partners.length} transfer partner entries\n`);

      // Group by card
      for (const cardId of source.cards) {
        const cardPartners = partners.filter(p => p.cardId === cardId || p.cardId === null);
        if (cardPartners.length > 0) {
          const tp = cardPartners.map(p => ({
            a: p.displayName,
            r: p.ratio,
            p: p.programId,
          })).filter(t => t.p && VALID_PROGRAMS.has(t.p));

          if (tp.length > 0) {
            const baseCard = baselineMap.get(cardId);
            if (baseCard) {
              scrapedCards.set(cardId, { ...baseCard, tp });
            }
          }
        }
      }
    } catch (err) {
      console.warn(`  [${source.label}] Failed: ${err.message}\n`);
    }
  }

  // Build final card list: scraped data + baseline for non-scrapeable cards
  const finalCards = [];
  for (const baseCard of baseline.cards) {
    if (scrapedCards.has(baseCard.id)) {
      finalCards.push(scrapedCards.get(baseCard.id));
    } else {
      finalCards.push(baseCard); // Use baseline
    }
  }

  // Validate
  let valid = true;
  for (const card of finalCards) {
    if (!card.tp || card.tp.length === 0) {
      console.error(`[VALIDATION] ${card.name} has no transfer partners!`);
      valid = false;
    }
    for (const t of card.tp || []) {
      if (!/^\d+:\d+$/.test(t.r)) {
        console.error(`[VALIDATION] ${card.name} → ${t.a}: invalid ratio "${t.r}"`);
        valid = false;
      }
      if (!VALID_PROGRAMS.has(t.p)) {
        console.error(`[VALIDATION] ${card.name} → ${t.a}: unknown program "${t.p}"`);
        valid = false;
      }
    }
  }

  if (!valid) {
    console.error("\nValidation failed. Using baseline data.");
    writeOutput(outputPath, baseline);
    return;
  }

  // Diff report
  if (existing?.cards) {
    const existingMap = new Map(existing.cards.map(c => [c.id, c]));
    let changes = 0;
    for (const card of finalCards) {
      const old = existingMap.get(card.id);
      if (!old) { console.log(`[NEW] ${card.name}`); changes++; continue; }
      const oldTpMap = new Map(old.tp.map(t => [`${t.p}`, t.r]));
      const newTpMap = new Map(card.tp.map(t => [`${t.p}`, t.r]));
      for (const [prog, ratio] of newTpMap) {
        const oldRatio = oldTpMap.get(prog);
        if (!oldRatio) { console.log(`[NEW]    ${card.name} → ${prog}: ${ratio}`); changes++; }
        else if (oldRatio !== ratio) { console.log(`[CHANGE] ${card.name} → ${prog}: ${oldRatio} → ${ratio}`); changes++; }
      }
      for (const [prog] of oldTpMap) {
        if (!newTpMap.has(prog)) { console.log(`[REMOVED] ${card.name} → ${prog}`); changes++; }
      }
    }
    console.log(`\n${changes} change(s) detected.`);
  } else {
    console.log("\nNo existing cards.json — creating fresh.");
  }

  // Write output
  const output = {
    lastUpdated: new Date().toISOString().split("T")[0],
    cards: finalCards,
  };
  writeOutput(outputPath, output);
}

function writeOutput(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`\n✅ Saved public/data/cards.json (${data.cards.length} cards)`);
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

/**
 * Parse HTML page to extract transfer partner tables.
 * pointsmath.com typically presents data in <table> or structured <div> elements.
 */
function parseTransferTable(html, sourceLabel) {
  const $ = cheerio.load(html);
  const partners = [];

  // Strategy 1: Look for HTML tables with transfer data
  $("table").each((_, table) => {
    const headers = [];
    $(table).find("thead th, tr:first-child th, tr:first-child td").each((_, cell) => {
      headers.push($(cell).text().trim().toLowerCase());
    });

    // Check if this looks like a transfer partner table
    const hasPartner = headers.some(h => h.includes("partner") || h.includes("program") || h.includes("airline"));
    const hasRatio = headers.some(h => h.includes("ratio") || h.includes("transfer") || h.includes("conversion") || h.includes("rate"));

    if (hasPartner || hasRatio || headers.length >= 2) {
      $(table).find("tbody tr, tr").each((idx, row) => {
        if (idx === 0 && $(row).find("th").length > 0) return; // skip header row
        const cells = [];
        $(row).find("td, th").each((_, cell) => {
          cells.push($(cell).text().trim());
        });
        if (cells.length >= 2) {
          const entry = parseTableRow(cells, headers, sourceLabel);
          if (entry) partners.push(entry);
        }
      });
    }
  });

  // Strategy 2: Look for structured lists if no tables found
  if (partners.length === 0) {
    $("li, .transfer-partner, [class*='partner']").each((_, el) => {
      const text = $(el).text().trim();
      const entry = parseTextEntry(text, sourceLabel);
      if (entry) partners.push(entry);
    });
  }

  // Strategy 3: Parse from paragraphs/divs containing ratio patterns
  if (partners.length === 0) {
    const bodyText = $("article, .entry-content, .post-content, main").text();
    const ratioPattern = /(\w[\w\s&']+?)\s*[-–—:]\s*(\d+)\s*[:=]\s*(\d+)/g;
    let match;
    while ((match = ratioPattern.exec(bodyText)) !== null) {
      const name = match[1].trim();
      const ratio = `${match[2]}:${match[3]}`;
      const programId = resolveProgram(name);
      if (programId) {
        partners.push({
          displayName: prettifyName(name),
          ratio,
          programId,
          cardId: null,
        });
      }
    }
  }

  return partners;
}

function parseTableRow(cells, headers, sourceLabel) {
  let partnerName = "";
  let ratio = "";
  let cardName = "";

  for (let i = 0; i < cells.length; i++) {
    const h = headers[i] || "";
    const val = cells[i];

    if (h.includes("partner") || h.includes("program") || h.includes("airline") || i === 0) {
      if (!partnerName) partnerName = val;
    }
    if (h.includes("ratio") || h.includes("transfer") || h.includes("conversion") || h.includes("rate")) {
      ratio = val;
    }
    if (h.includes("card")) {
      cardName = val;
    }
  }

  // Try to extract ratio from any cell if not found by header
  if (!ratio) {
    for (const cell of cells) {
      const ratioMatch = cell.match(/(\d+)\s*[:=]\s*(\d+)/);
      if (ratioMatch) {
        ratio = `${ratioMatch[1]}:${ratioMatch[2]}`;
        break;
      }
    }
  }

  if (!partnerName || !ratio) return null;

  // Normalize ratio format
  const ratioMatch = ratio.match(/(\d+)\s*[:=]\s*(\d+)/);
  if (!ratioMatch) return null;
  const normalizedRatio = `${ratioMatch[1]}:${ratioMatch[2]}`;

  const programId = resolveProgram(partnerName);
  if (!programId) return null;

  const cardId = cardName ? resolveCard(cardName) : null;

  return {
    displayName: prettifyName(partnerName),
    ratio: normalizedRatio,
    programId,
    cardId,
  };
}

function parseTextEntry(text, sourceLabel) {
  // Try patterns like "KrisFlyer - 1:1" or "Flying Blue (1:2)"
  const patterns = [
    /(.+?)\s*[-–—]\s*(\d+:\d+)/,
    /(.+?)\s*\((\d+:\d+)\)/,
    /(.+?)\s+(\d+:\d+)/,
  ];

  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const name = m[1].trim();
      const ratio = m[2];
      const programId = resolveProgram(name);
      if (programId) {
        return { displayName: prettifyName(name), ratio, programId, cardId: null };
      }
    }
  }
  return null;
}

function resolveProgram(name) {
  const lower = name.toLowerCase().trim();
  // Direct match
  if (PROGRAM_MAP[lower]) return PROGRAM_MAP[lower];
  // Partial match
  for (const [key, val] of Object.entries(PROGRAM_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  return null;
}

function resolveCard(name) {
  const lower = name.toLowerCase().trim();
  if (CARD_MAP[lower]) return CARD_MAP[lower];
  for (const [key, val] of Object.entries(CARD_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

function prettifyName(name) {
  // Clean up and standardize display names
  const map = {
    krisflyer: "KrisFlyer", "singapore airlines": "KrisFlyer",
    "flying blue": "Flying Blue", avios: "Avios", "british airways": "Avios",
    skywards: "Skywards", "etihad guest": "Etihad Guest",
    "miles&smiles": "Miles&Smiles", "miles & smiles": "Miles&Smiles",
    "asia miles": "Asia Miles", intermiles: "InterMiles",
    "flying returns": "Flying Returns", "club vistara": "Club Vistara",
    lifemiles: "LifeMiles", aeroplan: "Aeroplan",
  };
  const lower = name.toLowerCase().trim();
  return map[lower] || name.replace(/\b\w/g, c => c.toUpperCase());
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
