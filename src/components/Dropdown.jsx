import { useState, useRef, useEffect } from "react";

export default function Dropdown({ label, value, onChange, options, placeholder, icon }) {
  const [op, setOp] = useState(false);
  const [fi, setFi] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOp(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fl = options.filter(o => {
    const t = typeof o === "string" ? o : `${o.code} ${o.city} ${o.c || ""}`;
    return t.toLowerCase().includes(fi.toLowerCase());
  });

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 170 }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>{icon} {label}</label>
      <div onClick={() => setOp(!op)} style={{ background: "#151d2e", border: `1px solid ${op ? "#f59e0b" : "#1e293b"}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontSize: 14, color: value ? "#e2e8f0" : "#64748b", display: "flex", justifyContent: "space-between", minHeight: 42 }}>
        <span>{value || placeholder}</span><span style={{ fontSize: 10, opacity: .5 }}>{"\u25BC"}</span>
      </div>
      {op && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#111827", border: "1px solid #1e293b", borderRadius: 8, marginTop: 4, maxHeight: 280, overflow: "auto", boxShadow: "0 12px 40px rgba(0,0,0,.4)" }}>
        <input autoFocus placeholder="Search..." value={fi} onChange={e => setFi(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", border: "none", borderBottom: "1px solid #1e293b", background: "transparent", color: "#e2e8f0", fontSize: 13, outline: "none" }} />
        {fl.map((o, i) => <div key={i} onClick={() => { onChange(typeof o === "string" ? o : o.code); setOp(false); setFi(""); }} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, color: "#e2e8f0", borderBottom: "1px solid #1e293b20" }} onMouseEnter={e => e.currentTarget.style.background = "#1e293b"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          {typeof o === "string" ? o : <span><strong>{o.code}</strong> <span style={{ opacity: .6 }}>{"\u2013"} {o.city}</span> {o.c && <span style={{ marginLeft: 4, padding: "1px 5px", borderRadius: 3, background: "#f59e0b15", color: "#f59e0b", fontSize: 9, fontWeight: 700 }}>{o.c}</span>}</span>}
        </div>)}
      </div>}
    </div>
  );
}
