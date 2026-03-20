import { PG, MONTHS } from "../data/programs.js";
import { CARDS } from "../data/cards.js";
import { AIRPORTS, CO, VFT, IND, HUBS, HUBS2 } from "../data/airports.js";

export function dist(a, b) {
  const c1 = CO[a] || [20, 78], c2 = CO[b] || [20, 78], R = 6371;
  const dL = (c2[0] - c1[0]) * Math.PI / 180, dN = (c2[1] - c1[1]) * Math.PI / 180;
  const x = Math.sin(dL / 2) ** 2 + Math.cos(c1[0] * Math.PI / 180) * Math.cos(c2[0] * Math.PI / 180) * Math.sin(dN / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

export function cMi(d, cab, prog) {
  const cm = { business: 1, first: 1.8, premium_economy: .6 };
  const pm = { krisflyer: 1, flying_blue: .85, avios_ba: .9, skywards: 1.1, etihad_guest: 1.05, miles_smiles: .75, asia_miles: .95, intermiles: 1.2, flying_returns: .9, club_vistara: .85, sheba_miles: .7, lifemiles: .8, aeroplan: .85 };
  let b = d < 2e3 ? 25e3 + d * 3 : d < 5e3 ? 4e4 + d * 2.5 : d < 8e3 ? 6e4 + d * 2 : 8e4 + d * 1.5;
  return Math.round(b * (cm[cab] || 1) * (pm[prog] || 1) / 500) * 500;
}

export function cTx(cab, fs, d) {
  const bt = { premium_economy: 3e3, business: 5500, first: 8e3 };
  const sm = { none: 0, low: .3, medium: .7, high: 1.2, very_high: 2 };
  const b = (bt[cab] || 5500) * (d / 5e3);
  return Math.round((b + b * (sm[fs] || .5)) / 100) * 100;
}

export function gX(pid, mi, cards = CARDS) {
  const o = [];
  cards.forEach(c => c.tp.forEach(t => {
    if (t.p === pid) {
      const [f, x] = t.r.split(":").map(Number);
      o.push({ cn: c.name, ratio: t.r, pts: Math.ceil(mi * f / x), color: c.color, cid: c.id });
    }
  }));
  return o.sort((a, b) => a.pts - b.pts);
}

export function genR(fr, to, cab, mo, yr) {
  const seed = (fr + to + cab + mo + yr).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = n => ((seed * 9301 + 49297 + n * 1723) % 233280) / 233280;
  const d = dist(fr, to), r = [], u = new Set(), srcs = ["PointsYeah", "AwardFares", "Seats.aero"];
  const dir = [];
  if (IND.has(fr) || IND.has(to)) {
    dir.push({ o: "AI", p: "flying_returns" });
    const dt = IND.has(fr) ? to : fr;
    if (dt === "SIN") dir.push({ o: "SQ", p: "krisflyer" });
    if (dt === "DXB" || dt === "AUH") dir.push({ o: "EK", p: "skywards" }, { o: "EY", p: "etihad_guest" });
    if (dt === "LHR") dir.push({ o: "BA", p: "avios_ba" });
    if (dt === "DOH") dir.push({ o: "QR", p: "avios_ba" });
    if (dt === "IST") dir.push({ o: "TK", p: "miles_smiles" });
    if (["BKK", "HKG", "KUL", "DPS"].includes(dt)) dir.push({ o: "CX", p: "asia_miles" });
    if (["CDG", "AMS", "FRA", "MUC"].includes(dt)) dir.push({ o: "AF/LH", p: "flying_blue" });
    if (["JFK", "SFO", "ORD", "LAX", "EWR"].includes(dt)) dir.push({ o: "AI", p: "flying_returns" });
    if (dt === "ADD") dir.push({ o: "ET", p: "sheba_miles" });
    if (["JFK", "SFO", "ORD", "LAX", "EWR", "LHR", "FRA", "CDG", "ZRH", "MUC"].includes(dt)) dir.push({ o: "AV*", p: "lifemiles" }, { o: "AC*", p: "aeroplan" });
    if (["SIN", "BKK", "HKG", "NRT", "ICN"].includes(dt)) dir.push({ o: "AV*", p: "lifemiles" });
    if (["YYZ", "YVR"].includes(dt)) dir.push({ o: "AC", p: "aeroplan" });
  }
  dir.forEach((da, i) => {
    const pg = PG[da.p]; if (!pg) return;
    r.push({ id: `d-${da.p}-${i}`, program: da.p, pn: pg.n, airline: pg.a, alliance: pg.al, miles: cMi(d, cab, da.p), taxes: cTx(cab, pg.fs, d), stops: 0, route: `${fr} \u2192 ${to}`, dur: Math.round(d / 850 * 60 + rng(i * 100) * 30), layDur: 0, visa: false, avail: rng(i * 50) > .4 ? "available" : "waitlist", fs: pg.fs, logo: pg.l, src: srcs[Math.floor(rng(i * 99) * 3)] });
  });
  Object.entries(HUBS).forEach(([hub, prog], i) => {
    if (hub === fr || hub === to || !VFT.has(hub)) return;
    const key = `${prog}-${hub}`; if (u.has(key)) return; u.add(key);
    const pg = PG[prog]; if (!pg) return;
    const d1 = dist(fr, hub), d2 = dist(hub, to);
    const du1 = Math.round(d1 / 850 * 60 + rng(i * 30) * 20), du2 = Math.round(d2 / 850 * 60 + rng(i * 31) * 20), ly = Math.round(90 + rng(i * 32) * 240);
    r.push({ id: `1-${prog}-${hub}`, program: prog, pn: pg.n, airline: pg.a, alliance: pg.al, miles: cMi(d, cab, prog), taxes: cTx(cab, pg.fs, d * 1.2), stops: 1, route: `${fr} \u2192 ${hub} \u2192 ${to}`, dur: du1 + du2 + ly, layDur: ly, layAp: hub, layCity: AIRPORTS.find(a => a.code === hub)?.city || hub, visa: false, avail: rng(i * 60) > .35 ? "available" : "waitlist", fs: pg.fs, logo: pg.l, src: srcs[Math.floor(rng(i * 77) * 3)] });
  });
  Object.entries(HUBS2).forEach(([hub, prog], i) => {
    if (hub === fr || hub === to || !VFT.has(hub)) return;
    const key = `${prog}-${hub}`; if (u.has(key)) return; u.add(key);
    const pg = PG[prog]; if (!pg) return;
    const d1 = dist(fr, hub), d2 = dist(hub, to);
    const du1 = Math.round(d1 / 850 * 60 + rng(i * 30 + 500) * 20), du2 = Math.round(d2 / 850 * 60 + rng(i * 31 + 500) * 20), ly = Math.round(90 + rng(i * 32 + 500) * 240);
    r.push({ id: `1-${prog}-${hub}-2`, program: prog, pn: pg.n, airline: pg.a, alliance: pg.al, miles: cMi(d, cab, prog), taxes: cTx(cab, pg.fs, d * 1.2), stops: 1, route: `${fr} \u2192 ${hub} \u2192 ${to}`, dur: du1 + du2 + ly, layDur: ly, layAp: hub, layCity: AIRPORTS.find(a => a.code === hub)?.city || hub, visa: false, avail: rng(i * 60 + 500) > .35 ? "available" : "waitlist", fs: pg.fs, logo: pg.l, src: srcs[Math.floor(rng(i * 77 + 500) * 3)] });
  });
  return r.sort((a, b) => a.miles - b.miles);
}

export function genD(fr, to, cab, mo, yr) {
  const m = MONTHS.indexOf(mo), dim = new Date(yr, m + 1, 0).getDate();
  const seed = (fr + to + cab + mo).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = n => ((seed * 9301 + 49297 + n * 1723) % 233280) / 233280;
  const base = cMi(dist(fr, to), cab, "miles_smiles");
  const days = []; let cd = null, cm = Infinity;
  for (let i = 1; i <= dim; i++) {
    const dow = new Date(yr, m, i).getDay();
    let mul = dow === 2 || dow === 3 ? .85 : dow >= 5 ? 1.15 : .95;
    mul *= (.9 + rng(i * 31 + seed) * .2);
    const mi = Math.round(base * mul / 500) * 500, av = rng(i * 17) > .25;
    days.push({ date: i, miles: mi, available: av });
    if (av && mi < cm) { cm = mi; cd = i; }
  }
  return { days, cheapDay: cd, cheapMiles: cm };
}

export const fmt = n => n.toLocaleString("en-IN");
export const fD = m => `${Math.floor(m / 60)}h ${m % 60}m`;
