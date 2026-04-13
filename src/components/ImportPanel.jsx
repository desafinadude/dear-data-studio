import { useState, useRef } from "react"
import { T, inp, mkId } from "../theme.js"
import { parseStamp, GUIDE } from "../utils/svg.js"
import Lbl from "./Lbl.jsx"

export default function ImportPanel({ stamps, setStamps }) {
  const [error, setError] = useState(null)
  const [guide, setGuide] = useState(false)
  const [drag,  setDrag]  = useState(false)
  const ref = useRef()

  const load = text => {
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
    const r = new FileReader(); r.onload = ev => load(ev.target.result); r.readAsText(f)
  }

  const onDrop = e => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]; if (!f) return
    const r = new FileReader(); r.onload = ev => load(ev.target.result); r.readAsText(f)
  }

  const slotDesc = slot => {
    if (slot.type === "size-range")     return `size range · ${slot.startGeom.primarySize.toFixed(0)}→${slot.endGeom.primarySize.toFixed(0)}px`
    if (slot.type === "repeat-indexed") return `indexed repeat · max ${slot.maxCount}`
    return slot.encs.map(e => e.type + (e.dir ? " " + e.dir : "") + (e.copyEnc ? " · " + e.copyEnc : "")).join(", ")
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ fontFamily: "'Caveat',cursive", fontSize: 28, fontWeight: 700, color: T.accent, marginBottom: 4 }}>① import a stamp</div>
      <div style={{ fontSize: 14, color: T.muted, marginBottom: 22 }}>
        design in Figma · name layers with <code style={{ background: T.ghost, padding: "1px 5px", borderRadius: 3 }}>dd-</code> prefixes · export SVG · drop here
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => ref.current.click()}
        style={{ border: `2px dashed ${drag ? T.accent : T.border}`, borderRadius: 8, padding: "44px 24px", textAlign: "center", background: drag ? `${T.accent}08` : T.p1, cursor: "pointer", transition: "all .15s", marginBottom: 14 }}
      >
        <div style={{ fontSize: 36, marginBottom: 8, opacity: .5 }}>⬆</div>
        <div style={{ fontSize: 14, color: T.mid }}>drop SVG here or click to browse</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>dd- layers are encoded · everything else is static base art</div>
        <input ref={ref} type="file" accept=".svg" onChange={onFile} style={{ display: "none" }}/>
      </div>

      {error && (
        <div style={{ background: "#fcebeb", border: "1px solid #f7c1c1", borderRadius: 4, padding: "9px 13px", fontSize: 13, color: "#a32d2d", marginBottom: 14 }}>
          {error}
        </div>
      )}

      {stamps.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Lbl>loaded stamps</Lbl>
          {stamps.map(s => (
            <div key={s.id} style={{ padding: "10px 13px", marginBottom: 8, background: T.p1, borderRadius: 5, border: `1px solid ${T.ghost}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                <input
                  value={s.name}
                  onChange={e => setStamps(p => p.map(x => x.id === s.id ? { ...x, name: e.target.value } : x))}
                  style={{ ...inp, flex: 1, fontFamily: "'Caveat',cursive", fontSize: 15 }}
                  placeholder="stamp name"
                />
                <button onClick={() => setStamps(p => p.filter(x => x.id !== s.id))} style={{ background: "none", border: "none", fontSize: 14, color: T.ghost, cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {s.slots.map((sl, i) => (
                  <span key={i} style={{ fontSize: 11, background: T.p2, color: T.mid, borderRadius: 4, padding: "2px 8px", border: `1px solid ${T.ghost}` }}>
                    <code style={{ color: T.navy }}>{sl.id}</code> · {slotDesc(sl)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setGuide(g => !g)} style={{ padding: "6px 13px", fontSize: 12, color: T.mid, background: T.p2, border: `1px solid ${T.border}`, borderRadius: 4, cursor: "pointer", fontFamily: "'Courier Prime',monospace" }}>
          {guide ? "hide" : "show"} convention
        </button>
        <button onClick={() => load(demoStampSvg)} style={{ padding: "6px 13px", fontSize: 12, color: T.mid, background: T.p2, border: `1px solid ${T.border}`, borderRadius: 4, cursor: "pointer", fontFamily: "'Courier Prime',monospace" }}>
          load demo stamp
        </button>
      </div>

      {guide && (
        <pre style={{ background: T.p2, border: `1px solid ${T.ghost}`, borderRadius: 5, padding: "14px 16px", fontSize: 11, color: T.mid, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
          {GUIDE}
        </pre>
      )}
    </div>
  )
}
