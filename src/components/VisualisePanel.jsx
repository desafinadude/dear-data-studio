import { useMemo, useRef, useState } from "react"
import { T, mkId, inp } from "../theme.js"
import { buildOutputSVG, downloadSVG } from "../utils/renderer.js"
import { parseStamp } from "../utils/svg.js"
import SlotAssign from "./SlotAssign.jsx"

export default function VisualisePanel({ stamps, setStamps, dataMap, setDataMap, csv, columns }) {
  const [error, setError] = useState(null)
  const [drag, setDrag] = useState(false)
  const [layoutConfig, setLayoutConfig] = useState({
    type: "grid",
    scale: 1.0,
    cols: 5,
    cellW: 110,
    colGap: 16,
    rowGap: 18
  })
  const fileRef = useRef()
  
  const setDM = (slotId, encType, field, val) =>
    setDataMap(p => ({ ...p, [slotId]: { ...p[slotId], [encType]: { ...(p[slotId]?.[encType] || {}), [field]: val } } }))

  const setSlotProp = (stampId, slotId, field, val) =>
    setStamps(p => p.map(s => s.id !== stampId ? s : { ...s, slots: s.slots.map(sl => sl.id !== slotId ? sl : { ...sl, [field]: val }) }))

  const svgOut = useMemo(() => buildOutputSVG(stamps, dataMap, csv, layoutConfig), [stamps, dataMap, csv, layoutConfig])

  const loadStamp = text => {
    setError(null)
    try {
      const p = parseStamp(text)
      if (!p.slots.length) throw new Error("No dd- layers found. Add at least one layer with a dd- prefix.")
      setStamps(prev => [...prev, { ...p, id: mkId(), name: `stamp ${prev.length + 1}`, svgText: text }])
    } catch (e) {
      setError(e.message)
    }
  }

  const onFile = e => {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader(); r.onload = ev => loadStamp(ev.target.result); r.readAsText(f)
  }

  const onDrop = e => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]; if (!f) return
    const r = new FileReader(); r.onload = ev => loadStamp(ev.target.result); r.readAsText(f)
  }

  if (!csv) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: T.muted, fontSize: 14 }}>
        Import data first — go to step ①
      </div>
    )
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <div style={{ width: 360, flexShrink: 0, borderRight: `1px solid ${T.border}`, overflowY: "auto", background: T.p1, padding: "16px 15px" }}>
        <div style={{ fontFamily: "'Caveat',cursive", fontSize: 22, fontWeight: 700, color: T.accent, marginBottom: 3 }}>② assign</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>import stamp · connect slots to columns</div>
        
        {/* Stamp importer */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current.click()}
          style={{ 
            border: `2px dashed ${drag ? T.accent : T.border}`, 
            borderRadius: 6, 
            padding: "16px 12px", 
            textAlign: "center", 
            background: drag ? `${T.accent}08` : T.p2, 
            cursor: "pointer", 
            marginBottom: 14,
            transition: "all .15s"
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 4, opacity: .5 }}>⬆</div>
          <div style={{ fontSize: 12, color: T.mid }}>drop SVG or click</div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>dd- layers encode data</div>
          <input ref={fileRef} type="file" accept=".svg" onChange={onFile} style={{ display: "none" }}/>
        </div>

        {error && (
          <div style={{ background: "#fcebeb", border: "1px solid #f7c1c1", borderRadius: 4, padding: "9px 13px", fontSize: 12, color: "#a32d2d", marginBottom: 14 }}>
            {error}
          </div>
        )}

        {stamps.map(stamp => (
          <div key={stamp.id} style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${T.ghost}` }}>
              <input
                value={stamp.name}
                onChange={e => setStamps(p => p.map(x => x.id === stamp.id ? { ...x, name: e.target.value } : x))}
                style={{ ...inp, flex: 1, fontFamily: "'Caveat',cursive", fontSize: 15, padding: "4px 8px" }}
                placeholder="stamp name"
              />
              <button 
                onClick={() => setStamps(p => p.filter(x => x.id !== stamp.id))} 
                style={{ background: "none", border: "none", fontSize: 14, color: T.ghost, cursor: "pointer", padding: "2px 6px" }}
              >✕</button>
            </div>
            {stamp.slots.map(slot => (
              <SlotAssign key={slot.id} stamp={stamp} slot={slot} dataMap={dataMap} setDM={setDM} setSlotProp={setSlotProp} columns={columns} csv={csv}/>
            ))}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#e8e6e2" }}>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, background: T.p1, display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: T.muted }}>live preview</span>
          
          {/* Layout controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: T.mid }}>scale</span>
            <input 
              type="range" 
              min="0.3" 
              max="2" 
              step="0.1" 
              value={layoutConfig.scale} 
              onChange={e => setLayoutConfig(p => ({ ...p, scale: parseFloat(e.target.value) }))}
              style={{ width: 80, accentColor: T.accent }}
            />
            <span style={{ fontSize: 11, color: T.muted, minWidth: 35 }}>{layoutConfig.scale.toFixed(1)}x</span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: T.mid }}>cols</span>
            <input 
              type="number" 
              min="1" 
              max="20" 
              value={layoutConfig.cols} 
              onChange={e => setLayoutConfig(p => ({ ...p, cols: parseInt(e.target.value) || 5 }))}
              style={{ ...inp, width: 50, fontSize: 11, padding: "2px 6px" }}
            />
          </div>
          
          {svgOut && (
            <button onClick={() => downloadSVG(svgOut)} style={{ marginLeft: "auto", padding: "5px 14px", borderRadius: 4, border: `1px solid ${T.navy}`, background: "transparent", color: T.navy, fontSize: 12, cursor: "pointer", fontFamily: "'Courier Prime',monospace" }}>
              ↓ download SVG
            </button>
          )}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
          {!svgOut
            ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 60, gap: 12 }}>
                <svg width={56} height={56} viewBox="0 0 56 56">
                  <rect x={6} y={6} width={44} height={44} rx={4} fill="none" stroke={T.ghost} strokeWidth={1.5} strokeDasharray="4 4"/>
                  <circle cx={28} cy={28} r={7} fill="none" stroke={T.ghost} strokeWidth={1}/>
                </svg>
                <div style={{ fontFamily: "'Caveat',cursive", fontSize: 18, color: T.ghost }}>assign a column to see output</div>
              </div>
            : <div style={{ background: "#fff", borderRadius: 2, boxShadow: "0 2px 24px rgba(0,0,0,0.10)", border: "1px solid #ddd", maxWidth: "100%", overflow: "auto" }} dangerouslySetInnerHTML={{ __html: svgOut }}/>
          }
        </div>
      </div>
    </div>
  )
}
