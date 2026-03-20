import { PG, BK } from "../data/programs.js";
import { gX, fmt, fD } from "../utils/calc.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";

export default function ResultCard({ rt, idx, isExpanded, onToggle, cards }) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const xf = cards ? gX(rt.program, rt.miles, cards) : gX(rt.program, rt.miles);
  const bst = xf[0];
  const bkL = BK[rt.program];

  const fsLabels = { none: "None", low: "Low", medium: "Medium", high: "High", very_high: "Very High" };
  const fsColors = { none: "#22c55e", low: "#84cc16", medium: "#eab308", high: "#f97316", very_high: "#ef4444" };

  return (
    <div style={{ background: "#111827", borderRadius: 10, border: `1px solid ${isExpanded ? "#f59e0b" : "#1e293b"}`, overflow: "hidden" }}>
      <div onClick={onToggle} style={{ padding: "14px 16px", cursor: "pointer", display: isMobile ? "flex" : "grid", flexDirection: isMobile ? "column" : undefined, gridTemplateColumns: isMobile ? undefined : "30px 1.2fr 1fr 100px 90px 80px 55px", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 8 : 10 }} onMouseEnter={e => e.currentTarget.style.background = "#1a2236"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

        {isMobile ? (
          <>
            {/* Mobile: stacked layout */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: idx === 0 ? "#f59e0b" : idx < 3 ? "#e2e8f0" : "#64748b" }}>{idx === 0 ? "\u{1F3C6}" : `#${idx + 1}`}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{rt.logo} {rt.pn}</div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{rt.airline} {"\u00B7"} {rt.alliance} <span style={{ marginLeft: 4, padding: "1px 5px", borderRadius: 6, background: "#3b82f615", color: "#3b82f6", fontSize: 8, fontWeight: 700 }}>{rt.src}</span></div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "monospace", fontSize: 17, fontWeight: 700, color: "#f59e0b" }}>{fmt(rt.miles)}</div>
                <div style={{ fontSize: 9, color: "#64748b" }}>MILES</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{rt.route}</span>
                <span style={{ padding: "2px 8px", borderRadius: 16, fontSize: 10, fontWeight: 700, background: rt.stops === 0 ? "#22c55e20" : "#eab30820", color: rt.stops === 0 ? "#22c55e" : "#eab308" }}>{rt.stops === 0 ? "Non-stop" : "1 Stop"}</span>
                <span style={{ fontSize: 10, color: "#64748b" }}>{fD(rt.dur)}</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: rt.taxes > 15e3 ? "#ef4444" : rt.taxes > 8e3 ? "#eab308" : "#22c55e" }}>{"\u20B9"}{fmt(rt.taxes)}</span>
                <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: rt.avail === "available" ? "#22c55e" : "#eab308" }} />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Desktop: grid layout */}
            <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: idx === 0 ? "#f59e0b" : idx < 3 ? "#e2e8f0" : "#64748b", textAlign: "center" }}>{idx === 0 ? "\u{1F3C6}" : `#${idx + 1}`}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{rt.logo} {rt.pn}</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>{rt.airline} {"\u00B7"} {rt.alliance} <span style={{ marginLeft: 4, padding: "1px 5px", borderRadius: 6, background: "#3b82f615", color: "#3b82f6", fontSize: 8, fontWeight: 700 }}>{rt.src}</span></div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{rt.route}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ padding: "2px 8px", borderRadius: 16, fontSize: 10, fontWeight: 700, background: rt.stops === 0 ? "#22c55e20" : "#eab30820", color: rt.stops === 0 ? "#22c55e" : "#eab308" }}>{rt.stops === 0 ? "Non-stop" : "1 Stop"}</span>
                <span style={{ fontSize: 10, color: "#64748b" }}>{fD(rt.dur)}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "monospace", fontSize: 17, fontWeight: 700, color: "#f59e0b" }}>{fmt(rt.miles)}</div>
              <div style={{ fontSize: 9, color: "#64748b" }}>MILES</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: rt.taxes > 15e3 ? "#ef4444" : rt.taxes > 8e3 ? "#eab308" : "#22c55e" }}>{"\u20B9"}{fmt(rt.taxes)}</div>
              <div style={{ fontSize: 9, color: "#64748b" }}>TAX</div>
            </div>
            <div style={{ textAlign: "center" }}>
              {bst ? <><div style={{ fontSize: 10, fontWeight: 600, color: bst.color }}>{fmt(bst.pts)}</div><div style={{ fontSize: 8, color: "#64748b" }}>{bst.cn}</div></> : <span style={{ fontSize: 9, color: "#64748b" }}>{"\u2014"}</span>}
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: rt.avail === "available" ? "#22c55e" : "#eab308", marginRight: 3 }} />
              <span style={{ fontSize: 10, color: rt.avail === "available" ? "#22c55e" : "#eab308", fontWeight: 600 }}>{rt.avail === "available" ? "Yes" : "Wait"}</span>
            </div>
          </>
        )}
      </div>

      {/* Expanded detail */}
      {isExpanded && <div style={{ borderTop: "1px solid #1e293b", padding: 18, background: "linear-gradient(180deg, #0d1420, #111827)" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {bkL && <a href={bkL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "9px 18px", borderRadius: 7, background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>{"\u2705"} Verify & Book on {PG[rt.program]?.n}</a>}
          <a href="https://www.pointsyeah.com/" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "9px 14px", borderRadius: 7, border: "1px solid #FF6B3550", background: "#FF6B3510", color: "#FF6B35", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>{"\u{1F50D}"} PointsYeah</a>
          <a href="https://awardfares.com/search" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "9px 14px", borderRadius: 7, border: "1px solid #4F46E550", background: "#4F46E510", color: "#4F46E5", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>{"\u{1F3AF}"} AwardFares</a>
          <a href="https://seats.aero/search" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "9px 14px", borderRadius: 7, border: "1px solid #05966950", background: "#05966910", color: "#059669", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>{"\u{1F4BA}"} Seats.aero</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 10, textTransform: "uppercase" }}>Taxes & Surcharges</h4>
            <div style={{ background: "#111827", borderRadius: 7, padding: 12, border: "1px solid #1e293b" }}>
              {[{ l: "Airport taxes", p: .35 }, { l: "Carrier surcharge", p: .5 }, { l: "Booking fee", p: .15 }].map((t, i) =>
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{t.l}</span>
                  <span style={{ fontSize: 11, fontFamily: "monospace" }}>{"\u20B9"}{fmt(Math.round(rt.taxes * t.p))}</span>
                </div>
              )}
              <div style={{ borderTop: "1px solid #1e293b", paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
                <strong style={{ fontSize: 12 }}>Total</strong>
                <strong style={{ fontSize: 12, color: "#f59e0b", fontFamily: "monospace" }}>{"\u20B9"}{fmt(rt.taxes)}</strong>
              </div>
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 10, color: "#64748b" }}>Fuel surcharge: </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: fsColors[rt.fs] }}>{fsLabels[rt.fs]}</span>
              </div>
            </div>
            {rt.layDur > 0 && <div style={{ marginTop: 10, padding: 10, background: "#151d2e", borderRadius: 6, border: "1px solid #1e293b" }}>
              <div style={{ fontSize: 11, color: "#64748b" }}>Layover at <strong style={{ color: "#e2e8f0" }}>{rt.layCity}</strong>: {fD(rt.layDur)}</div>
              <div style={{ fontSize: 10, color: "#22c55e", marginTop: 3 }}>{"\u2705"} No transit visa needed</div>
            </div>}
          </div>
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 10, textTransform: "uppercase" }}>{"\u{1F4B3}"} Transfer ({fmt(rt.miles)} mi)</h4>
            {xf.length === 0 ? <p style={{ fontSize: 11, color: "#64748b" }}>No Indian card partners.</p> :
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {xf.slice(0, 6).map((t, ti) =>
                  <div key={ti} style={{ background: "#111827", borderRadius: 7, padding: 10, border: ti === 0 ? `2px solid ${t.color}` : "1px solid #1e293b", position: "relative" }}>
                    {ti === 0 && <span style={{ position: "absolute", top: -7, right: 10, fontSize: 8, fontWeight: 700, background: t.color, color: "#fff", padding: "1px 6px", borderRadius: 3 }}>BEST</span>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: t.color }}>{t.cn}</div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>{fmt(t.pts)}</div>
                        <div style={{ fontSize: 9, color: "#64748b" }}>pts ({t.ratio})</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>}
            <div style={{ marginTop: 12, fontSize: 10, color: "#64748b", lineHeight: 1.5 }}>Transfer: 24-72 hrs {"\u00B7"} Taxes in cash {"\u00B7"} Marriott: +5K per 60K {"\u00B7"} Amex Plat: 2 MR = 1 mile {"\u00B7"} Verify before transferring</div>
          </div>
        </div>
      </div>}
    </div>
  );
}
