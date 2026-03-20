import { MONTHS } from "../data/programs.js";
import { fmt } from "../utils/calc.js";

export default function Calendar({ daily, mo, yr, bestDate, setBestDate }) {
  if (!daily) return null;

  return (
    <div style={{ background: "#111827", borderRadius: 12, border: "1px solid #1e293b", padding: 18, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700 }}>{"\u{1F4C5}"} {mo} {yr} {"\u2014"} Click a date to select</h3>
        {daily.cheapDay && <button onClick={() => setBestDate(daily.cheapDay)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(34,197,94,.3)" }}>{"\u2B50"} Use Best Date: {mo.slice(0, 3)} {daily.cheapDay} {"\u2014"} {fmt(daily.cheapMiles)} mi</button>}
      </div>

      {bestDate && <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "#22c55e10", border: "1px solid #22c55e40", borderRadius: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>{"\u{1F4CC}"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>Selected: {mo} {bestDate}, {yr}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {daily.days.find(d => d.date === bestDate)?.available
              ? <span>Available {"\u2014"} <strong style={{ color: "#f59e0b", fontFamily: "monospace" }}>{fmt(daily.days.find(d => d.date === bestDate)?.miles || 0)}</strong> miles (best across programs)</span>
              : <span style={{ color: "#ef4444" }}>No availability on this date</span>}
          </div>
        </div>
        <button onClick={() => setBestDate(null)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #ef444460", background: "transparent", color: "#ef4444", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{"\u2715"} Clear</button>
      </div>}

      <div style={{ display: "flex", gap: 2, marginBottom: 6 }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <div key={d} style={{ flex: 1, textAlign: "center", fontSize: 9, fontWeight: 700, color: "#64748b" }}>{d}</div>)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {Array.from({ length: new Date(yr, MONTHS.indexOf(mo), 1).getDay() }).map((_, i) => <div key={`e${i}`} style={{ flex: "0 0 calc(14.28% - 2px)", aspectRatio: "1.3" }} />)}
        {daily.days.map(day => {
          const avD = daily.days.filter(d => d.available);
          const mn = avD.length ? Math.min(...avD.map(d => d.miles)) : 0;
          const mx = avD.length ? Math.max(...avD.map(d => d.miles)) : 0;
          const rg = mx - mn || 1;
          const int = day.available ? Math.max(0, 1 - (day.miles - mn) / rg) : 0;
          const best = day.date === daily.cheapDay;
          const sel = day.date === bestDate;
          return <div key={day.date} onClick={() => { if (day.available) setBestDate(day.date); }} style={{ flex: "0 0 calc(14.28% - 2px)", aspectRatio: "1.3", borderRadius: 5, padding: 3, background: !day.available ? "#1e293b30" : sel ? "#3b82f625" : best ? "#22c55e20" : `rgba(245,158,11,${.05 + int * .25})`, border: sel ? "2px solid #3b82f6" : best ? "2px solid #22c55e" : "1px solid #1e293b40", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: day.available ? 1 : .35, position: "relative", cursor: day.available ? "pointer" : "default", transition: "all .15s" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: sel ? "#3b82f6" : best ? "#22c55e" : "#e2e8f0" }}>{day.date}</div>
            {day.available ? <div style={{ fontSize: 8, fontWeight: 600, color: sel ? "#3b82f6" : best ? "#22c55e" : int > .6 ? "#84cc16" : "#64748b", fontFamily: "monospace" }}>{(day.miles / 1e3).toFixed(1)}k</div> : <div style={{ fontSize: 7, color: "#ef4444" }}>N/A</div>}
            {best && !sel && <div style={{ position: "absolute", top: -5, right: -2, fontSize: 9 }}>{"\u2B50"}</div>}
            {sel && <div style={{ position: "absolute", top: -5, right: -2, fontSize: 9 }}>{"\u{1F4CC}"}</div>}
          </div>;
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 10, color: "#64748b" }}>{"\u{1F7E2}"} Cheap {"\u00B7"} {"\u{1F7E1}"} Mid {"\u00B7"} {"\u{1F534}"} Expensive {"\u00B7"} {"\u25AA"} N/A {"\u00B7"} {"\u{1F4CC}"} Selected {"\u00B7"} {"\u2B50"} Best</span>
        {(() => {
          const top3 = daily.days.filter(d => d.available).sort((a, b) => a.miles - b.miles).slice(0, 3);
          return top3.length > 0 && <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "#64748b" }}>Top 3:</span>
            {top3.map((d, i) => <button key={d.date} onClick={() => setBestDate(d.date)} style={{ padding: "3px 10px", borderRadius: 12, border: `1px solid ${i === 0 ? "#22c55e" : "#f59e0b"}50`, background: i === 0 ? "#22c55e15" : "#f59e0b10", color: i === 0 ? "#22c55e" : "#f59e0b", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}>{mo.slice(0, 3)} {d.date} {"\u2014"} {(d.miles / 1e3).toFixed(1)}k</button>)}
          </div>;
        })()}
      </div>
    </div>
  );
}
