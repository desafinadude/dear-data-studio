import { useState } from "react"
import Papa from "papaparse"
import { T, inp, mkId } from "../theme.js"
import { PRESETS, genData } from "../presets/index.js"
import Lbl from "./Lbl.jsx"

export default function DataPanel({ setCsv, setColumns }) {
  const [src,   setSrc] = useState("sample")
  const [dvars, setDV]  = useState(PRESETS[0].vars.map((v, i) => ({ ...v, id: i })))
  const [nRows, setNR]  = useState(PRESETS[0].numRows)
  const [prev,  setPrev] = useState(null)
  const [pC,    setPC]   = useState([])

  const push = d => {
    const c = Object.keys(d[0] || {})
    setCsv(d); setColumns(c); setPrev(d); setPC(c)
  }

  const upd = (id, f, v) => setDV(p => p.map(x => x.id === id ? { ...x, [f]: v } : x))

  const onUp = e => {
    const f = e.target.files[0]; if (!f) return
    Papa.parse(f, { header: true, dynamicTyping: true, skipEmptyLines: true, complete: ({ data }) => push(data) })
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 24px" }}>
      <div style={{ fontFamily: "'Caveat',cursive", fontSize: 26, fontWeight: 700, color: T.accent, marginBottom: 4 }}>② load data</div>
      <div style={{ fontSize: 14, color: T.muted, marginBottom: 20 }}>generate a sample dataset or upload your own CSV</div>

      <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: 5, overflow: "hidden", marginBottom: 16, width: 210 }}>
        {["sample", "upload"].map(s => (
          <button key={s} onClick={() => setSrc(s)} style={{ flex: 1, padding: "7px 0", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", background: src === s ? T.accent : "transparent", color: src === s ? "#fff" : T.muted, border: "none", borderRight: s === "sample" ? `1px solid ${T.border}` : "none", cursor: "pointer", fontFamily: "'Courier Prime',monospace" }}>
            {s}
          </button>
        ))}
      </div>

      {src === "sample" && (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {PRESETS.map(p => (
              <button key={p.name} onClick={() => { setDV(p.vars.map((v, i) => ({ ...v, id: i + mkId() }))); setNR(p.numRows); setPrev(null) }}
                style={{ padding: "5px 11px", borderRadius: 3, fontSize: 12, cursor: "pointer", background: T.p2, color: T.mid, border: `1px solid ${T.border}`, fontFamily: "'Courier Prime',monospace" }}>
                {p.emoji} {p.name}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Lbl>rows</Lbl>
            <input type="number" min={1} max={30} value={nRows} onChange={e => setNR(Math.max(1, Math.min(30, +e.target.value)))} style={{ ...inp, width: 52, marginBottom: 0 }}/>
          </div>

          <Lbl>columns</Lbl>
          {dvars.map((v, i) => (
            <div key={v.id} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center", padding: "6px 8px", background: T.p1, borderRadius: 3, border: `1px solid ${T.ghost}` }}>
              <input value={v.name} onChange={e => upd(v.id, "name", e.target.value)} placeholder={`col ${i + 1}`} style={{ ...inp, width: 90, minWidth: 0 }}/>
              <select value={v.type} onChange={e => upd(v.id, "type", e.target.value)} style={inp}>
                <option value="number">num</option>
                <option value="category">cat</option>
              </select>
              {v.type === "number"
                ? <>
                    <span style={{ fontSize: 12, color: T.muted }}>min</span>
                    <input value={v.min} onChange={e => upd(v.id, "min", e.target.value)} style={{ ...inp, width: 38 }}/>
                    <span style={{ fontSize: 12, color: T.muted }}>max</span>
                    <input value={v.max} onChange={e => upd(v.id, "max", e.target.value)} style={{ ...inp, width: 38 }}/>
                  </>
                : <input value={v.options} onChange={e => upd(v.id, "options", e.target.value)} placeholder="a,b,c…" style={{ ...inp, flex: 1, minWidth: 0 }}/>
              }
              <button onClick={() => setDV(p => p.filter(x => x.id !== v.id))} style={{ background: "none", border: "none", fontSize: 13, color: T.ghost, cursor: "pointer" }}>✕</button>
            </div>
          ))}

          <button
            onClick={() => setDV(p => [...p, { id: mkId(), name: "", type: "number", min: 0, max: 10, options: "" }])}
            style={{ width: "100%", padding: "5px 0", fontSize: 11, background: "transparent", color: T.mid, border: `1px dashed ${T.border}`, borderRadius: 3, cursor: "pointer", fontFamily: "'Courier Prime',monospace", marginBottom: 12 }}
          >
            + column
          </button>

          <button
            onClick={() => push(genData(dvars, nRows))}
            style={{ width: "100%", padding: "9px 0", borderRadius: 4, border: "none", background: T.accent, color: "#fff", cursor: "pointer", fontFamily: "'Caveat',cursive", fontSize: 16, fontWeight: 700 }}
          >
            generate ↺
          </button>
        </>
      )}

      {src === "upload" && (
        <div>
          <Lbl>csv file</Lbl>
          <input type="file" accept=".csv" onChange={onUp} style={{ fontSize: 13, color: T.mid }}/>
        </div>
      )}

      {prev?.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <Lbl>preview · {prev.length} rows · {pC.length} columns</Lbl>
          <div style={{ overflowX: "auto", border: `1px solid ${T.ghost}`, borderRadius: 4 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: T.ghost }}>
                  {pC.map(c => <th key={c} style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600, color: T.mid, whiteSpace: "nowrap", borderBottom: `1px solid ${T.border}` }}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {prev.slice(0, 6).map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? T.p1 : "transparent" }}>
                    {pC.map(c => <td key={c} style={{ padding: "3px 8px", color: T.ink, whiteSpace: "nowrap" }}>{String(row[c])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
