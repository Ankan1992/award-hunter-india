import { ALLIANCES, PG } from "../data/programs.js";
import { CARDS } from "../data/cards.js";

export default function Preferences({ prefs, updatePrefs, clearPrefs, onClose }) {
  const toggleItem = (key, id) => {
    const arr = prefs[key] || [];
    updatePrefs({ [key]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] });
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,.5)", zIndex: 199 }} />

      {/* Panel */}
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 340, maxWidth: "90vw", background: "#111827", borderLeft: "1px solid #1e293b", zIndex: 200, overflow: "auto", padding: 20, boxShadow: "-4px 0 20px rgba(0,0,0,.4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{"\u2699\uFE0F"} Preferences</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid #1e293b", borderRadius: 6, padding: "4px 10px", color: "#64748b", fontSize: 12, cursor: "pointer" }}>{"\u2715"}</button>
        </div>

        <p style={{ fontSize: 11, color: "#64748b", marginBottom: 20, lineHeight: 1.5 }}>Set your defaults. These will auto-apply as filters on every search. You can override them anytime.</p>

        {/* Alliances */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#94a3b8", marginBottom: 8 }}>Preferred Alliances</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ALLIANCES.map(al => {
              const sel = prefs.alliances.includes(al.id);
              return <button key={al.id} onClick={() => toggleItem("alliances", al.id)} style={{ padding: "6px 14px", borderRadius: 20, border: `2px solid ${sel ? al.color : "#1e293b"}`, background: sel ? al.color + "20" : "transparent", color: sel ? al.color : "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{al.label}</button>;
            })}
          </div>
        </div>

        {/* Credit Cards */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#94a3b8", marginBottom: 8 }}>Owned Credit Cards</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CARDS.map(c => {
              const sel = prefs.cards.includes(c.id);
              return <button key={c.id} onClick={() => toggleItem("cards", c.id)} style={{ padding: "5px 12px", borderRadius: 20, border: `2px solid ${sel ? c.color : "#1e293b"}`, background: sel ? c.color + "20" : "transparent", color: sel ? c.color : "#64748b", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{c.name}</button>;
            })}
          </div>
        </div>

        {/* Programs */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#94a3b8", marginBottom: 8 }}>Preferred Programs</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Object.entries(PG).map(([id, pg]) => {
              const sel = prefs.programs.includes(id);
              const alColor = ALLIANCES.find(a => a.id === pg.al)?.color || "#64748b";
              return <button key={id} onClick={() => toggleItem("programs", id)} style={{ padding: "5px 12px", borderRadius: 20, border: `2px solid ${sel ? alColor : "#1e293b"}`, background: sel ? alColor + "20" : "transparent", color: sel ? alColor : "#64748b", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{pg.l} {pg.n}</button>;
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Done</button>
          <button onClick={clearPrefs} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #ef4444", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Clear All</button>
        </div>
      </div>
    </>
  );
}
