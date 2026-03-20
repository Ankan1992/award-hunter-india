import Dropdown from "./Dropdown.jsx";
import { CABINS, MONTHS } from "../data/programs.js";
import { AIRPORTS } from "../data/airports.js";

export default function SearchForm({ fr, setFr, to, setTo, cab, setCab, mo, setMo, yr, setYr, search, ld }) {
  return (
    <div style={{ background: "#111827", borderRadius: 14, padding: 20, border: "1px solid #1e293b", marginBottom: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
        <Dropdown label="From" icon={"\u{1F6EB}"} value={fr} onChange={setFr} options={AIRPORTS} placeholder="Origin" />
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 6 }}>
          <button onClick={() => { setFr(to); setTo(fr); }} style={{ background: "#151d2e", border: "1px solid #1e293b", borderRadius: "50%", width: 34, height: 34, cursor: "pointer", fontSize: 15, color: "#f59e0b" }}>{"\u21C4"}</button>
        </div>
        <Dropdown label="To" icon={"\u{1F6EC}"} value={to} onChange={setTo} options={AIRPORTS} placeholder="Destination" />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>{"\u{1F3AB}"} Cabin</label>
          <div style={{ display: "flex", gap: 4 }}>
            {CABINS.map(c => <button key={c.id} onClick={() => setCab(c.id)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid", borderColor: cab === c.id ? "#f59e0b" : "#1e293b", background: cab === c.id ? "#f59e0b15" : "#151d2e", color: cab === c.id ? "#f59e0b" : "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{c.icon} {c.label}</button>)}
          </div>
        </div>
        <Dropdown label="Month" icon={"\u{1F4C5}"} value={mo} onChange={setMo} options={MONTHS} placeholder="Month" />
        <Dropdown label="Year" icon={"\u{1F4C6}"} value={String(yr)} onChange={v => setYr(+v)} options={["2025", "2026", "2027"]} placeholder="Year" />
        <div>
          <label style={{ display: "block", fontSize: 10, color: "transparent", marginBottom: 4 }}>.</label>
          <button onClick={search} disabled={!fr || !to} style={{ padding: "10px 28px", borderRadius: 8, border: "none", background: fr && to ? "linear-gradient(135deg,#f59e0b,#f97316)" : "#334155", color: fr && to ? "#000" : "#64748b", fontSize: 13, fontWeight: 700, cursor: fr && to ? "pointer" : "not-allowed", minHeight: 42 }}>{ld ? "Searching..." : "Search \u27F6"}</button>
        </div>
      </div>
    </div>
  );
}
