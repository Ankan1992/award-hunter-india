import { useState, useMemo, useCallback, useEffect } from "react";
import { CABINS, MONTHS, PG } from "./data/programs.js";
import { CARDS, CARDS_LAST_UPDATED, fetchCards } from "./data/cards.js";
import { AIRPORTS } from "./data/airports.js";
import { genR, genD, gX, fmt } from "./utils/calc.js";
import { searchAwards } from "./utils/api.js";
import { usePreferences } from "./hooks/usePreferences.js";
import SearchForm from "./components/SearchForm.jsx";
import Filters from "./components/Filters.jsx";
import ResultCard from "./components/ResultCard.jsx";
import Calendar from "./components/Calendar.jsx";
import Preferences from "./components/Preferences.jsx";

export default function App() {
  const [fr, setFr] = useState("");
  const [to, setTo] = useState("");
  const [cab, setCab] = useState("business");
  const [mo, setMo] = useState("April");
  const [yr, setYr] = useState(2026);
  const [res, setRes] = useState(null);
  const [ld, setLd] = useState(false);
  const [exp, setExp] = useState(null);
  const [sort, setSort] = useState("miles");
  const [fSt, setFSt] = useState("all");
  const [fAv, setFAv] = useState("all");
  const [tab, setTab] = useState("results");
  const [alerts, setAlerts] = useState([]);
  const [daily, setDaily] = useState(null);
  const [bestDate, setBestDate] = useState(null);
  const [alEmail, setAlEmail] = useState("");
  const [alThresh, setAlThresh] = useState("");
  const [shAlF, setShAlF] = useState(false);
  const [sCards, setSCards] = useState([]);
  const [fAlliance, setFAlliance] = useState([]);
  const [fPrograms, setFPrograms] = useState([]);
  const [showPrefs, setShowPrefs] = useState(false);
  const [scrapedAt, setScrapedAt] = useState(null);
  const [cards, setCards] = useState(CARDS);
  const [cardsUpdated, setCardsUpdated] = useState(CARDS_LAST_UPDATED);

  const { prefs, updatePrefs, clearPrefs, hasPrefs } = usePreferences();

  // Load dynamic card transfer ratios on mount
  useEffect(() => {
    fetchCards("/data/cards.json").then(data => {
      if (data.cards?.length) setCards(data.cards);
      if (data.lastUpdated) setCardsUpdated(data.lastUpdated);
    });
  }, []);

  // Apply saved preferences on mount
  useEffect(() => {
    if (prefs.alliances.length) setFAlliance(prefs.alliances);
    if (prefs.cards.length) setSCards(prefs.cards);
    if (prefs.programs.length) setFPrograms(prefs.programs);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const search = useCallback(async () => {
    if (!fr || !to) return;
    setLd(true); setExp(null); setBestDate(null); setScrapedAt(null);
    // Try API first, fall back to local
    const apiResult = await searchAwards(fr, to, cab, mo, yr);
    if ((apiResult.source === "scraped" || apiResult.source === "api") && apiResult.results?.length) {
      setRes(apiResult.results);
      if (apiResult.scrapedAt) setScrapedAt(apiResult.scrapedAt);
    } else {
      setRes(genR(fr, to, cab, mo, yr));
    }
    setDaily(genD(fr, to, cab, mo, yr));
    setLd(false);
  }, [fr, to, cab, mo, yr]);

  const filtered = useMemo(() => {
    if (!res) return [];
    let r = [...res];
    if (fAlliance.length) r = r.filter(x => fAlliance.includes(x.alliance));
    if (fPrograms.length) r = r.filter(x => fPrograms.includes(x.program));
    if (fSt !== "all") r = r.filter(x => x.stops === +fSt);
    if (fAv === "available") r = r.filter(x => x.avail === "available");
    if (sCards.length) r = r.filter(x => gX(x.program, x.miles, cards).some(t => sCards.includes(t.cid)));
    if (sort === "miles") r.sort((a, b) => a.miles - b.miles);
    else if (sort === "taxes") r.sort((a, b) => a.taxes - b.taxes);
    else if (sort === "duration") r.sort((a, b) => a.dur - b.dur);
    else r.sort((a, b) => (a.miles + a.taxes * 2) - (b.miles + b.taxes * 2));
    return r;
  }, [res, fSt, fAv, sort, sCards, fAlliance, fPrograms, cards]);

  const stats = useMemo(() => {
    if (!res?.length) return null;
    return {
      total: res.length, ns: res.filter(r => r.stops === 0).length, os: res.filter(r => r.stops === 1).length,
      best: Math.min(...res.map(r => r.miles)), ltax: Math.min(...res.map(r => r.taxes)),
      avail: res.filter(r => r.avail === "available").length, wait: res.filter(r => r.avail === "waitlist").length,
    };
  }, [res]);

  const fc = AIRPORTS.find(a => a.code === fr)?.city || fr;
  const tc = AIRPORTS.find(a => a.code === to)?.city || to;
  const addAl = () => {
    if (!alEmail || !alThresh || !fr || !to) return;
    setAlerts(p => [...p, { id: Date.now(), fr, to, cab, mo, yr, email: alEmail, thresh: +alThresh, fc, tc }]);
    setAlEmail(""); setAlThresh(""); setShAlF(false);
  };

  const lastUpdated = new Date(cardsUpdated).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: "#0a0e17", minHeight: "100vh", color: "#e2e8f0" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1e1b4b,#0f172a)", borderBottom: "1px solid #1e293b", padding: "22px 28px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 24 }}>{"\u2708"}</span>
              <h1 style={{ fontSize: 20, fontWeight: 700, background: "linear-gradient(135deg,#f59e0b,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AwardHunter India</h1>
              <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#f59e0b20", color: "#f59e0b", fontWeight: 700 }}>BETA</span>
              {hasPrefs && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#8B5CF620", color: "#8B5CF6", fontWeight: 700 }}>Prefs Active</span>}
            </div>
            <p style={{ fontSize: 12, color: "#64748b" }}>Data from PointsYeah {"\u00B7"} AwardFares {"\u00B7"} Seats.aero {"\u2014"} Indian credit card points</p>
          </div>
          <button onClick={() => setShowPrefs(true)} style={{ background: "#151d2e", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 14px", color: "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>{"\u2699\uFE0F"} Preferences</button>
        </div>
      </div>

      {/* Preferences slide-in */}
      {showPrefs && <Preferences prefs={prefs} updatePrefs={updatePrefs} clearPrefs={clearPrefs} onClose={() => setShowPrefs(false)} />}

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "20px 28px" }}>
        <SearchForm fr={fr} setFr={setFr} to={to} setTo={setTo} cab={cab} setCab={setCab} mo={mo} setMo={setMo} yr={yr} setYr={setYr} search={search} ld={ld} />

        {ld && <div style={{ textAlign: "center", padding: 50 }}>
          <div style={{ display: "inline-block", width: 40, height: 40, border: "3px solid #1e293b", borderTop: "3px solid #f59e0b", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 14 }}>Scanning PointsYeah, AwardFares & Seats.aero...</p>
        </div>}

        {res && !ld && <div>
          {/* Stats */}
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#64748b", marginBottom: 8 }}>Overview</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, marginBottom: 16 }}>
            {[{ l: "Total", v: stats.total, c: "#3b82f6" }, { l: "Non-stop", v: stats.ns, c: "#22c55e" }, { l: "1 Stop", v: stats.os, c: "#eab308" }, { l: "Best Miles", v: fmt(stats.best), c: "#f59e0b" }, { l: "Lowest Tax", v: `\u20B9${fmt(stats.ltax)}`, c: "#22c55e" }, { l: "Available", v: stats.avail, c: "#22c55e" }, { l: "Waitlist", v: stats.wait, c: "#eab308" }].map((s, i) =>
              <div key={i} style={{ background: "#111827", borderRadius: 10, padding: "12px 14px", border: "1px solid #1e293b" }}>
                <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: ".08em", marginBottom: 3 }}>{s.l}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: s.c, fontFamily: "monospace" }}>{s.v}</div>
              </div>)}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, marginBottom: 16, background: "#111827", borderRadius: 8, padding: 3, border: "1px solid #1e293b", width: "fit-content" }}>
            {[{ id: "results", l: `\u{1F50D} Results (${filtered.length})` }, { id: "calendar", l: "\u{1F4C5} Best Dates" }, { id: "alerts", l: `\u{1F514} Alerts (${alerts.length})` }].map(t =>
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "9px 16px", borderRadius: 6, border: "none", background: tab === t.id ? "#f59e0b" : "transparent", color: tab === t.id ? "#000" : "#64748b", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{t.l}</button>)}
          </div>

          {/* Calendar */}
          {tab === "calendar" && <Calendar daily={daily} mo={mo} yr={yr} bestDate={bestDate} setBestDate={setBestDate} />}

          {/* Alerts */}
          {tab === "alerts" && <div style={{ background: "#111827", borderRadius: 12, border: "1px solid #1e293b", padding: 18, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>{"\u{1F514}"} Price Alerts</h3>
              <button onClick={() => setShAlF(!shAlF)} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${shAlF ? "#ef4444" : "#f59e0b"}`, background: "transparent", color: shAlF ? "#ef4444" : "#f59e0b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{shAlF ? "\u2715 Cancel" : "+ Create Alert"}</button>
            </div>
            {shAlF && <div style={{ background: "#151d2e", borderRadius: 8, padding: 14, marginBottom: 14, border: "1px dashed #f59e0b" }}>
              <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, marginBottom: 10 }}>{fc} {"\u2192"} {tc} {"\u00B7"} {CABINS.find(c => c.id === cab)?.label} {"\u00B7"} {mo} {yr}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <input value={alEmail} onChange={e => setAlEmail(e.target.value)} placeholder="your@email.com" type="email" style={{ flex: 1, minWidth: 180, padding: "9px 12px", borderRadius: 6, border: "1px solid #1e293b", background: "#111827", color: "#e2e8f0", fontSize: 12, outline: "none" }} />
                <input value={alThresh} onChange={e => setAlThresh(e.target.value)} placeholder="Max miles e.g. 80000" type="number" style={{ flex: 1, minWidth: 140, padding: "9px 12px", borderRadius: 6, border: "1px solid #1e293b", background: "#111827", color: "#e2e8f0", fontSize: 12, outline: "none", fontFamily: "monospace" }} />
                <button onClick={addAl} disabled={!alEmail || !alThresh} style={{ padding: "9px 18px", borderRadius: 6, border: "none", background: alEmail && alThresh ? "#f59e0b" : "#334155", color: alEmail && alThresh ? "#000" : "#64748b", fontSize: 12, fontWeight: 700, cursor: alEmail && alThresh ? "pointer" : "not-allowed" }}>Set Alert {"\u{1F514}"}</button>
              </div>
            </div>}
            {alerts.length === 0 && !shAlF && <p style={{ color: "#64748b", fontSize: 12, textAlign: "center", padding: 16 }}>No alerts yet. Search a route, then create one.</p>}
            {alerts.map(al => <div key={al.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#151d2e", borderRadius: 8, border: "1px solid #1e293b", marginBottom: 6 }}>
              <div><div style={{ fontSize: 12, fontWeight: 600 }}>{al.fc} {"\u2192"} {al.tc} {"\u00B7"} {CABINS.find(c => c.id === al.cab)?.label} {"\u00B7"} {al.mo} {al.yr}</div><div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Below <span style={{ color: "#f59e0b", fontFamily: "monospace", fontWeight: 700 }}>{fmt(al.thresh)}</span> mi {"\u00B7"} {al.email}</div></div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ padding: "2px 8px", borderRadius: 10, background: "#22c55e20", color: "#22c55e", fontSize: 9, fontWeight: 700 }}>{"\u25CF"} Active</span><button onClick={() => setAlerts(p => p.filter(a => a.id !== al.id))} style={{ background: "transparent", border: "1px solid #ef4444", borderRadius: 4, padding: "3px 8px", color: "#ef4444", fontSize: 9, cursor: "pointer" }}>Remove</button></div>
            </div>)}
          </div>}

          {/* Results */}
          {tab === "results" && <>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#64748b", marginBottom: 8 }}>Filter Results</div>
            <Filters fSt={fSt} setFSt={setFSt} fAv={fAv} setFAv={setFAv} sort={sort} setSort={setSort} sCards={sCards} setSCards={setSCards} fAlliance={fAlliance} setFAlliance={setFAlliance} fPrograms={fPrograms} setFPrograms={setFPrograms} cards={cards} />

            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
              <strong style={{ color: "#e2e8f0" }}>{filtered.length}</strong> for <strong style={{ color: "#f59e0b" }}>{fc} {"\u2192"} {tc}</strong> {"\u00B7"} {CABINS.find(c => c.id === cab)?.label} {"\u00B7"} {mo} {yr}
              {fAlliance.length > 0 && <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 10, background: "#C9A94D15", color: "#C9A94D", fontSize: 10, fontWeight: 700 }}>{fAlliance.join(", ")}</span>}
              {fPrograms.length > 0 && <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 10, background: "#8B5CF615", color: "#8B5CF6", fontSize: 10, fontWeight: 700 }}>{fPrograms.length} program{fPrograms.length > 1 ? "s" : ""}</span>}
              {fAv === "available" && <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 10, background: "#22c55e15", color: "#22c55e", fontSize: 10, fontWeight: 700 }}>{"\u2705"} Available only</span>}
              {bestDate && <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 10, background: "#3b82f615", color: "#3b82f6", fontSize: 10, fontWeight: 700 }}>{"\u{1F4CC}"} {mo.slice(0, 3)} {bestDate}</span>}
              {daily?.cheapDay && !bestDate && <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 10, background: "#22c55e15", color: "#22c55e", fontSize: 10, fontWeight: 700 }}>{"\u2B50"} Best: {mo.slice(0, 3)} {daily.cheapDay}</span>}
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#64748b", marginBottom: 8 }}>Award Options</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.length === 0 && <div style={{ textAlign: "center", padding: 30, color: "#64748b" }}>No results match filters.</div>}
              {filtered.map((rt, idx) => <ResultCard key={rt.id} rt={rt} idx={idx} isExpanded={exp === rt.id} onToggle={() => setExp(exp === rt.id ? null : rt.id)} cards={cards} />)}
            </div>

            <div style={{ marginTop: 24, padding: 16, background: "#111827", borderRadius: 10, border: "1px solid #1e293b", fontSize: 10, color: "#64748b", lineHeight: 1.5 }}>
              {scrapedAt && <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
                <span style={{ color: "#22c55e", fontWeight: 700 }}>Live data</span>
                <span>{"\u00B7"} Scraped {(() => { const h = Math.round((Date.now() - new Date(scrapedAt).getTime()) / 3600000); return h < 1 ? "less than 1 hour ago" : `${h} hour${h !== 1 ? "s" : ""} ago`; })()}</span>
              </div>}
              <strong style={{ color: "#94a3b8" }}>Sources:</strong> {scrapedAt ? "Live scrape from Aeroplan & LifeMiles via Playwright." : "Data from PointsYeah, AwardFares & Seats.aero."} Always verify on airline site. Transfer ratios updated {lastUpdated}. Transit visa checked for Indian passports.
            </div>
          </>}
        </div>}

        {/* Empty state */}
        {!res && !ld && <div style={{ textAlign: "center", padding: "50px 20px" }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>{"\u{1F3AF}"}</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Find Your Best Award Redemption</h2>
          <p style={{ fontSize: 13, color: "#64748b", maxWidth: 440, margin: "0 auto", lineHeight: 1.5 }}>Data from PointsYeah, AwardFares & Seats.aero. Business, First & Premium Economy.</p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 20 }}>
            {cards.slice(0, 7).map(c => <span key={c.id} style={{ padding: "4px 10px", borderRadius: 16, border: `1px solid ${c.color}40`, background: `${c.color}10`, color: c.color, fontSize: 10, fontWeight: 600 }}>{c.name}</span>)}
            <span style={{ padding: "4px 10px", borderRadius: 16, border: "1px solid #1e293b", color: "#64748b", fontSize: 10, fontWeight: 600 }}>+{cards.length - 7} more</span>
          </div>
        </div>}
      </div>
    </div>
  );
}
