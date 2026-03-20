import { useState } from "react";
import { ALLIANCES, PG } from "../data/programs.js";
import { CARDS } from "../data/cards.js";

export default function Filters({ fSt, setFSt, fAv, setFAv, sort, setSort, sCards, setSCards, fAlliance, setFAlliance, fPrograms, setFPrograms }) {
  const [shC, setShC] = useState(false);
  const [shP, setShP] = useState(false);

  const toggleAlliance = (id) => {
    setFAlliance(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleProgram = (id) => {
    setFPrograms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div style={{ background: "#111827", borderRadius: 12, padding: 14, border: "1px solid #1e293b", marginBottom: 14 }}>
      {/* Row 1: Alliance + Programs + Stops + Availability */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginRight: 4 }}>Alliance</span>
          {ALLIANCES.map(al => {
            const sel = fAlliance.includes(al.id);
            return <button key={al.id} onClick={() => toggleAlliance(al.id)} style={{ padding: "4px 10px", borderRadius: 16, border: `1px solid ${sel ? al.color : "#1e293b"}`, background: sel ? al.color + "20" : "transparent", color: sel ? al.color : "#64748b", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{al.label}</button>;
          })}
          {fAlliance.length > 0 && <button onClick={() => setFAlliance([])} style={{ padding: "4px 8px", borderRadius: 16, border: "1px solid #ef4444", color: "#ef4444", fontSize: 9, fontWeight: 600, cursor: "pointer", background: "transparent" }}>{"\u2715"}</button>}
        </div>

        <div style={{ width: 1, height: 20, background: "#1e293b" }} />

        <div style={{ display: "flex", gap: 3 }}>
          {[{ v: "all", l: "All" }, { v: "0", l: "Non-stop" }, { v: "1", l: "1 Stop" }].map(f => <button key={f.v} onClick={() => setFSt(f.v)} style={{ padding: "4px 10px", borderRadius: 16, border: "1px solid", borderColor: fSt === f.v ? "#f59e0b" : "#1e293b", background: fSt === f.v ? "#f59e0b15" : "transparent", color: fSt === f.v ? "#f59e0b" : "#64748b", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{f.l}</button>)}
        </div>

        <div style={{ display: "flex", gap: 3 }}>
          {[{ v: "all", l: "All" }, { v: "available", l: "\u2705 Available" }].map(f => <button key={f.v} onClick={() => setFAv(f.v)} style={{ padding: "4px 10px", borderRadius: 16, border: "1px solid", borderColor: fAv === f.v ? "#22c55e" : "#1e293b", background: fAv === f.v ? "#22c55e15" : "transparent", color: fAv === f.v ? "#22c55e" : "#64748b", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{f.l}</button>)}
        </div>
      </div>

      {/* Row 2: Programs + Cards + Sort */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button onClick={() => setShP(!shP)} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${fPrograms.length ? "#8B5CF6" : "#1e293b"}`, background: fPrograms.length ? "#8B5CF620" : "transparent", color: fPrograms.length ? "#8B5CF6" : "#64748b", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{"\u2708"} Programs {fPrograms.length ? `(${fPrograms.length})` : "(All)"}</button>

        <button onClick={() => setShC(!shC)} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${sCards.length ? "#f59e0b" : "#1e293b"}`, background: sCards.length ? "#f59e0b15" : "transparent", color: sCards.length ? "#f59e0b" : "#64748b", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{"\u{1F4B3}"} Cards {sCards.length ? `(${sCards.length})` : "(All)"}</button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>Sort:</span>
          {[{ v: "miles", l: "Miles" }, { v: "taxes", l: "Taxes" }, { v: "duration", l: "Time" }, { v: "total", l: "Value" }].map(st => <button key={st.v} onClick={() => setSort(st.v)} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid", borderColor: sort === st.v ? "#3b82f6" : "#1e293b", background: sort === st.v ? "#3b82f615" : "transparent", color: sort === st.v ? "#3b82f6" : "#64748b", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{st.l}</button>)}
        </div>
      </div>

      {/* Programs expandable */}
      {shP && <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10, padding: 10, background: "#0d1420", borderRadius: 8, border: "1px solid #1e293b" }}>
        {Object.entries(PG).map(([id, pg]) => {
          const sel = fPrograms.includes(id);
          const alColor = ALLIANCES.find(a => a.id === pg.al)?.color || "#64748b";
          return <button key={id} onClick={() => toggleProgram(id)} style={{ padding: "4px 10px", borderRadius: 16, border: `1px solid ${sel ? alColor : "#1e293b"}`, background: sel ? alColor + "20" : "transparent", color: sel ? alColor : "#64748b", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{pg.l} {pg.n}</button>;
        })}
        {fPrograms.length > 0 && <button onClick={() => setFPrograms([])} style={{ padding: "4px 8px", borderRadius: 16, border: "1px solid #ef4444", color: "#ef4444", fontSize: 9, fontWeight: 600, cursor: "pointer", background: "transparent" }}>{"\u2715"} Clear</button>}
      </div>}

      {/* Cards expandable */}
      {shC && <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10, padding: 10, background: "#0d1420", borderRadius: 8, border: "1px solid #1e293b" }}>
        {CARDS.map(c => {
          const sel = sCards.includes(c.id);
          return <button key={c.id} onClick={() => setSCards(sel ? sCards.filter(x => x !== c.id) : [...sCards, c.id])} style={{ padding: "4px 10px", borderRadius: 16, border: `2px solid ${sel ? c.color : "#1e293b"}`, background: sel ? c.color + "20" : "transparent", color: sel ? c.color : "#64748b", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{c.name}</button>;
        })}
        {sCards.length > 0 && <button onClick={() => setSCards([])} style={{ padding: "4px 8px", borderRadius: 16, border: "1px solid #ef4444", color: "#ef4444", fontSize: 9, fontWeight: 600, cursor: "pointer", background: "transparent" }}>{"\u2715"}</button>}
      </div>}
    </div>
  );
}
