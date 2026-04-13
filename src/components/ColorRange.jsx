import { T, inp } from "../theme.js"

export default function ColorRange({ cfg, onA, onB, onC, label = "low" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ fontSize: 12, color: T.muted }}>{label}</span>
      <input type="color" value={cfg.colorA || "#f4e4d7"} onChange={e => onA(e.target.value)}
        style={{ width: 26, height: 26, border: `1px solid ${T.border}`, borderRadius: 3, padding: 0, cursor: "pointer" }}/>
      <span style={{ fontSize: 12, color: T.muted }}>→ mid</span>
      <input type="color" value={cfg.colorB || "#e09f3e"} onChange={e => onB(e.target.value)}
        style={{ width: 26, height: 26, border: `1px solid ${T.border}`, borderRadius: 3, padding: 0, cursor: "pointer" }}/>
      <span style={{ fontSize: 12, color: T.muted }}>→ high</span>
      <input type="color" value={cfg.colorC || "#9e2a2b"} onChange={e => onC(e.target.value)}
        style={{ width: 26, height: 26, border: `1px solid ${T.border}`, borderRadius: 3, padding: 0, cursor: "pointer" }}/>
    </div>
  )
}
