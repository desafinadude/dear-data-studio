import { useState } from "react"
import { T } from "./theme.js"
import ImportPanel from "./components/ImportPanel.jsx"
import DataPanel from "./components/DataPanel.jsx"
import VisualisePanel from "./components/VisualisePanel.jsx"

const TABS = [
  { id: "data",   label: "① data" },
  { id: "assign", label: "② assign" },
]

export default function App() {
  const [tab,      setTab]      = useState("data")
  const [stamps,   setStamps]   = useState([])
  const [dataMap,  setDataMap]  = useState({})
  const [csv,      setCsv]      = useState(null)
  const [columns,  setColumns]  = useState([])
  const [colorMappings, setColorMappings] = useState({}) // { columnName: { value: color } }
  const [canvasSVG, setCanvasSVG] = useState(null) // Canvas state for preset loading
  const [layoutConfig, setLayoutConfig] = useState({
    type: "grid",
    scale: 1.0,
    spacing: 1.0,
    cols: 5,
    cellW: 110,
    colGap: 16,
    rowGap: 18,
    chartTitle: "Dear Data Portrait"
  })

  const tabs = TABS.map(t => ({ 
    ...t, 
    avail: t.id === "data" || (t.id === "assign" && csv)
  }))
  const goTab = id => { if (tabs.find(t => t.id === id)?.avail) setTab(id) }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "'Courier Prime',monospace", color: T.ink, background: T.bg, overflow: "hidden" }}>
      <header style={{ height: 52, flexShrink: 0, background: T.p1, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 2 }}>
        <div style={{ fontFamily: "'Caveat',cursive", fontSize: 22, fontWeight: 700, color: T.accent, marginRight: 18 }}>✦ Dear Data Studio</div>
        {tabs.map(t => (
          <button key={t.id} onClick={() => goTab(t.id)} style={{ padding: "6px 16px", borderRadius: 4, fontSize: 14, letterSpacing: 0.3, background: tab === t.id ? T.navy : "transparent", color: tab === t.id ? "#fff" : t.avail ? T.mid : T.ghost, border: "none", fontFamily: "'Courier Prime',monospace", opacity: t.avail ? 1 : 0.45, cursor: t.avail ? "pointer" : "default" }}>
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          {stamps.length > 0 && <span style={{ fontSize: 12, background: `${T.navy}18`, color: T.navy, borderRadius: 8, padding: "2px 9px", border: `1px solid ${T.navy}33` }}>{stamps.length} stamp{stamps.length > 1 ? "s" : ""}</span>}
          {csv && <span style={{ fontSize: 12, background: `${T.accent}18`, color: T.accent, borderRadius: 8, padding: "2px 9px", border: `1px solid ${T.accent}33` }}>{csv.length} rows</span>}
        </div>
      </header>

      <main style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ height: "100%", overflowY: "auto", display: tab === "data" ? "block" : "none" }}><DataPanel setCsv={setCsv} setColumns={setColumns} setColorMappings={setColorMappings} setStamps={setStamps} setDataMap={setDataMap} stamps={stamps} setCanvasSVG={setCanvasSVG} layoutConfig={layoutConfig} setLayoutConfig={setLayoutConfig}/></div>
        <div style={{ height: "100%", display: tab === "assign" ? "block" : "none" }}><VisualisePanel stamps={stamps} setStamps={setStamps} dataMap={dataMap} setDataMap={setDataMap} csv={csv} columns={columns} colorMappings={colorMappings} canvasSVG={canvasSVG} setCanvasSVG={setCanvasSVG} layoutConfig={layoutConfig} setLayoutConfig={setLayoutConfig}/></div>
      </main>
    </div>
  )
}
