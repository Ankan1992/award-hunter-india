// Minimal program data for the scraper's transform step.
// Mirrors the relevant subset from src/data/programs.js

export const PG = {
  aeroplan: { n: "Aeroplan", a: "AC", al: "Star", fs: "low", l: "\uD83D\uDD34" },
  lifemiles: { n: "LifeMiles", a: "AV", al: "Star", fs: "none", l: "\uD83D\uDFE2" },
  krisflyer: { n: "KrisFlyer", a: "SQ", al: "Star", fs: "medium", l: "\uD83D\uDFE0" },
  flying_blue: { n: "Flying Blue", a: "AF/KL", al: "SkyTeam", fs: "medium", l: "\uD83D\uDD35" },
  avios_ba: { n: "Avios (BA)", a: "BA", al: "oneworld", fs: "very_high", l: "\uD83D\uDD34" },
};

export const ALLIANCES = {
  Star: "Star",
  SkyTeam: "SkyTeam",
  oneworld: "oneworld",
  "Ind.": "Ind.",
};
