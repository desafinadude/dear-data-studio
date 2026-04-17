import { useMemo, useRef, useState } from "react"
import { T, mkId, inp } from "../theme.js"
import { buildOutputSVG, downloadSVG } from "../utils/renderer.js"
import { parseStamp } from "../utils/svg.js"
import { isNumCol } from "../utils/color.js"
import { applyRoughness } from "../utils/rough.js"
import SlotAssign from "./SlotAssign.jsx"

export default function VisualisePanel({ stamps, setStamps, dataMap, setDataMap, csv, columns, colorMappings, canvasSVG, setCanvasSVG, layoutConfig, setLayoutConfig }) {
  const [error, setError] = useState(null)
  const [drag, setDrag] = useState(false)
  const [selectedStampId, setSelectedStampId] = useState(null) // Currently selected stamp
  const [showTitleModal, setShowTitleModal] = useState(false)
  const [showRoughnessModal, setShowRoughnessModal] = useState(false)
  const [tempTitle, setTempTitle] = useState(layoutConfig.chartTitle)
  const fileRef = useRef()
  const canvasRef = useRef()
  
  // Auto-select first stamp when stamps change
  if (stamps.length > 0 && !selectedStampId) {
    setSelectedStampId(stamps[0].id)
  }
  
  // Get currently selected stamp
  const selectedStamp = stamps.find(s => s.id === selectedStampId)
  
  const setDM = (slotId, encType, field, val) =>
    setDataMap(p => ({ ...p, [slotId]: { ...p[slotId], [encType]: { ...(p[slotId]?.[encType] || {}), [field]: val } } }))

  const setSlotProp = (stampId, slotId, field, val) =>
    setStamps(p => p.map(s => s.id !== stampId ? s : { ...s, slots: s.slots.map(sl => sl.id !== slotId ? sl : { ...sl, [field]: val }) }))

  const svgOut = useMemo(() => {
    const baseSvg = buildOutputSVG(stamps, dataMap, csv, layoutConfig, canvasSVG, colorMappings)
    if (!baseSvg) return null
    
    // Apply roughness if enabled
    return layoutConfig.roughness?.enabled 
      ? applyRoughness(baseSvg, layoutConfig.roughness)
      : baseSvg
  }, [stamps, dataMap, csv, layoutConfig, canvasSVG, colorMappings])

  const loadStamp = text => {
    setError(null)
    try {
      const p = parseStamp(text)
      if (!p.slots.length) throw new Error("No dd- layers found. Add at least one layer with a dd- prefix.")
      // Get filename from fileRef if available
      const fileName = fileRef.current?.files[0]?.name || `stamp ${stamps.length + 1}`
      const stampName = fileName.replace(/\.svg$/i, '')
      setStamps(prev => [...prev, { ...p, id: mkId(), name: stampName, svgText: text }])
    } catch (e) {
      setError(e.message)
    }
  }

  const loadCanvas = text => {
    setError(null)
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, "image/svg+xml")
      if (doc.querySelector("parsererror")) throw new Error("Invalid SVG file")
      
      const svgEl = doc.querySelector("svg")
      const vb = (svgEl.getAttribute("viewBox") || "0 0 100 100").split(/[\s,]+/).map(Number)
      const [vbX, vbY, vbW, vbH] = vb
      
      // Extract ALL paths with IDs (anywhere in the SVG, including nested in groups)
      const pathElements = [...svgEl.querySelectorAll("path[id]")]
      const paths = pathElements.map(p => {
        const id = p.getAttribute("id")
        return {
          id: id,
          d: p.getAttribute("d"),
          name: id // Use the ID directly as the name
        }
      })
      
      if (paths.length === 0) {
        throw new Error("No paths with IDs found. Add an 'id' attribute to your <path> elements (e.g., id='spiral', id='path-1', etc.)")
      }
      
      console.log("Found paths:", paths)
      
      // Clone the SVG and remove the paths from the clone
      const clonedSVG = svgEl.cloneNode(true)
      pathElements.forEach(p => {
        const clone = clonedSVG.querySelector(`#${p.getAttribute("id")}`)
        if (clone) clone.remove()
      })
      
      const baseSVG = new XMLSerializer().serializeToString(clonedSVG)
        .replace(/<\?xml[^?]*\?>\s*/, "")
      
      console.log("Canvas loaded:", { vbW, vbH, pathCount: paths.length, baseSVGLength: baseSVG.length })
      
      setCanvasSVG({
        viewBox: `${vbX} ${vbY} ${vbW} ${vbH}`,
        vbX, vbY, vbW, vbH,
        baseSVG,
        paths,
        svgText: text
      })
      
      // Auto-enable path layout for all stamps when canvas is loaded
      setStamps(p => p.map(stamp => ({
        ...stamp,
        pathConfig: {
          ...stamp.pathConfig,
          enabled: true,
          pathAssignments: stamp.pathConfig?.pathAssignments?.length > 0
            ? stamp.pathConfig.pathAssignments
            : [{ canvasPath: paths[0]?.name, indexStart: 0, indexEnd: csv?.length || 0, scale: 1, spacing: 1, followPath: false, showPath: false }]
        }
      })))
    } catch (e) {
      setError(e.message)
    }
  }

  const onFile = e => {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader(); r.onload = ev => loadStamp(ev.target.result); r.readAsText(f)
  }

  const onCanvasFile = e => {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader(); r.onload = ev => loadCanvas(ev.target.result); r.readAsText(f)
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
        
        {/* Canvas importer */}
        <div style={{ marginBottom: 16, padding: "10px 12px", background: canvasSVG ? "#e8f5e9" : T.bg, border: `1px solid ${canvasSVG ? "#81c784" : T.ghost}`, borderRadius: 4 }}>
          <div style={{ fontSize: 12, color: T.mid, fontWeight: 600, marginBottom: 6 }}>
            {canvasSVG ? "✓ Canvas loaded" : "Canvas SVG (optional)"}
          </div>
          {canvasSVG ? (
            <div style={{ fontSize: 10, color: T.muted, marginBottom: 6 }}>
              {canvasSVG.vbW} × {canvasSVG.vbH} · {canvasSVG.paths.length} path{canvasSVG.paths.length !== 1 ? 's' : ''}: {canvasSVG.paths.map(p => p.name).join(", ")}
            </div>
          ) : (
            <div style={{ fontSize: 10, color: T.muted, marginBottom: 6 }}>
              Import SVG with paths (id="path-1", etc.) for layout
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button 
              onClick={() => canvasRef.current.click()} 
              style={{ flex: 1, padding: "4px 8px", borderRadius: 3, border: `1px solid ${T.border}`, background: "white", fontSize: 11, cursor: "pointer" }}
            >
              {canvasSVG ? "Replace" : "Import Canvas"}
            </button>
            {canvasSVG && (
              <button 
                onClick={() => setCanvasSVG(null)} 
                style={{ padding: "4px 8px", borderRadius: 3, border: `1px solid ${T.border}`, background: "white", fontSize: 11, cursor: "pointer", color: T.ghost }}
              >
                ✕
              </button>
            )}
          </div>
          <input ref={canvasRef} type="file" accept=".svg" onChange={onCanvasFile} style={{ display: "none" }}/>
        </div>
        
        {/* Stamp selector dropdown - only show if there are stamps */}
        {stamps.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Stamp</div>
            <select 
              value={selectedStampId || ""} 
              onChange={e => setSelectedStampId(e.target.value)}
              style={{ ...inp, width: "100%", fontSize: 13, padding: "6px 8px", fontFamily: "'Courier Prime', monospace", fontWeight: 400 }}
            >
              {stamps.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        
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

        {/* Selected stamp details and slot assignments */}
        {selectedStamp && (
          <div>
            {/* Path Layout Configuration (only if canvas loaded) */}
            {canvasSVG && (
              <div style={{ marginBottom: 12, padding: "10px", background: T.bg, borderRadius: 4, border: `1px solid ${T.ghost}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.mid, marginBottom: 10 }}>Path Layout Settings</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Path Assignments */}
                  {(selectedStamp.pathConfig?.pathAssignments || []).map((assignment, idx) => (
                    <div key={idx} style={{ padding: 8, background: "#fff", borderRadius: 4, border: `1px solid ${T.ghost}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: T.mid }}>Path {idx + 1}</span>
                        <button 
                          onClick={() => setStamps(p => p.map(s => s.id === selectedStamp.id ? {
                            ...s,
                            pathConfig: {
                              ...s.pathConfig,
                              pathAssignments: s.pathConfig.pathAssignments.filter((_, i) => i !== idx)
                            }
                          } : s))}
                          style={{ background: "none", border: "none", fontSize: 12, color: T.ghost, cursor: "pointer", padding: "2px 6px" }}
                        >✕</button>
                      </div>
                      
                      {/* Canvas Path Selection */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: T.muted, width: 50 }}>path</span>
                        <select 
                          value={assignment.canvasPath || canvasSVG.paths[0]?.name} 
                          onChange={e => setStamps(p => p.map(s => s.id === selectedStamp.id ? {
                            ...s,
                            pathConfig: {
                              ...s.pathConfig,
                              pathAssignments: s.pathConfig.pathAssignments.map((a, i) => i === idx ? { ...a, canvasPath: e.target.value } : a)
                            }
                          } : s))}
                          style={{ ...inp, flex: 1, fontSize: 10, padding: "2px 6px" }}
                        >
                          {canvasSVG.paths.map(p => (
                            <option key={p.name} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Data Range */}
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: T.muted, marginBottom: 3 }}>Data range:</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input 
                            type="number" 
                            min="0" 
                            max={csv?.length ? csv.length - 1 : 0} 
                            value={assignment.indexStart ?? 0} 
                            placeholder="Start"
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0
                              setStamps(p => p.map(s => s.id === selectedStamp.id ? {
                                ...s,
                                pathConfig: {
                                  ...s.pathConfig,
                                  pathAssignments: s.pathConfig.pathAssignments.map((a, i) => i === idx ? {
                                    ...a,
                                    indexStart: Math.max(0, Math.min(val, csv?.length - 1 || 0))
                                  } : a)
                                }
                              } : s))
                            }}
                            style={{ ...inp, flex: 1, fontSize: 10, padding: "3px 6px" }}
                          />
                          <span style={{ fontSize: 10, color: T.muted, alignSelf: "center" }}>to</span>
                          <input 
                            type="number" 
                            min="1" 
                            max={csv?.length || 0} 
                            value={assignment.indexEnd ?? (csv?.length || 0)} 
                            placeholder="End"
                            onChange={e => {
                              const val = parseInt(e.target.value) || (csv?.length || 0)
                              setStamps(p => p.map(s => s.id === selectedStamp.id ? {
                                ...s,
                                pathConfig: {
                                  ...s.pathConfig,
                                  pathAssignments: s.pathConfig.pathAssignments.map((a, i) => i === idx ? {
                                    ...a,
                                    indexEnd: Math.max(1, Math.min(val, csv?.length || 0))
                                  } : a)
                                }
                              } : s))
                            }}
                            style={{ ...inp, flex: 1, fontSize: 10, padding: "3px 6px" }}
                          />
                        </div>
                        <div style={{ fontSize: 9, color: T.muted, marginTop: 2, fontStyle: "italic" }}>
                          {Math.max(0, (assignment.indexEnd ?? (csv?.length || 0)) - (assignment.indexStart ?? 0))} rows
                        </div>
                      </div>
                      
                      {/* Scale & Spacing */}
                      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 9, color: T.muted, marginBottom: 2 }}>Scale: {(assignment.scale || 1).toFixed(1)}×</div>
                          <input 
                            type="range" 
                            min="0.3" 
                            max="3" 
                            step="0.1" 
                            value={assignment.scale || 1} 
                            onChange={e => setStamps(p => p.map(s => s.id === selectedStamp.id ? {
                              ...s,
                              pathConfig: {
                                ...s.pathConfig,
                                pathAssignments: s.pathConfig.pathAssignments.map((a, i) => i === idx ? { ...a, scale: parseFloat(e.target.value) } : a)
                              }
                            } : s))}
                            style={{ width: "100%" }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 9, color: T.muted, marginBottom: 2 }}>Spacing: {(assignment.spacing || 1).toFixed(1)}×</div>
                          <input 
                            type="range" 
                            min="0.5" 
                            max="3" 
                            step="0.1" 
                            value={assignment.spacing || 1} 
                            onChange={e => setStamps(p => p.map(s => s.id === selectedStamp.id ? {
                              ...s,
                              pathConfig: {
                                ...s.pathConfig,
                                pathAssignments: s.pathConfig.pathAssignments.map((a, i) => i === idx ? { ...a, spacing: parseFloat(e.target.value) } : a)
                              }
                            } : s))}
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>
                      
                      {/* Options */}
                      <div style={{ display: "flex", gap: 12 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={!!assignment.followPath} 
                            onChange={e => setStamps(p => p.map(s => s.id === selectedStamp.id ? {
                              ...s,
                              pathConfig: {
                                ...s.pathConfig,
                                pathAssignments: s.pathConfig.pathAssignments.map((a, i) => i === idx ? { ...a, followPath: e.target.checked } : a)
                              }
                            } : s))}
                            style={{ accentColor: T.accent }}
                          />
                          <span style={{ fontSize: 9, color: T.mid }}>rotate</span>
                        </label>
                        
                        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={!!assignment.showPath} 
                            onChange={e => setStamps(p => p.map(s => s.id === selectedStamp.id ? {
                              ...s,
                              pathConfig: {
                                ...s.pathConfig,
                                pathAssignments: s.pathConfig.pathAssignments.map((a, i) => i === idx ? { ...a, showPath: e.target.checked } : a)
                              }
                            } : s))}
                            style={{ accentColor: T.accent }}
                          />
                          <span style={{ fontSize: 9, color: T.mid }}>show path</span>
                        </label>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Path Button */}
                  <button
                    onClick={() => setStamps(p => p.map(s => s.id === selectedStamp.id ? {
                      ...s,
                      pathConfig: {
                        ...s.pathConfig,
                        pathAssignments: [
                          ...(s.pathConfig.pathAssignments || []),
                          {
                            canvasPath: canvasSVG?.paths[0]?.name,
                            indexStart: 0,
                            indexEnd: csv?.length || 0,
                            scale: 1,
                            spacing: 1,
                            followPath: false,
                            showPath: false
                          }
                        ]
                      }
                    } : s))}
                    style={{ ...inp, padding: "6px 10px", fontSize: 11, background: T.accent, color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                  >
                    + Add Path
                  </button>
                </div>
              </div>
            )}
            
            {/* Slot Assignments */}
            {selectedStamp.slots.map(slot => (
              <SlotAssign key={slot.id} stamp={selectedStamp} slot={slot} dataMap={dataMap} setDM={setDM} setSlotProp={setSlotProp} columns={columns} csv={csv} colorMappings={colorMappings}/>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#e8e6e2" }}>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, background: T.p1, display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: T.muted }}>live preview</span>
          
          {/* Layout controls - hide if canvas is active and any stamp has path layout enabled */}
          {(!canvasSVG || !stamps.some(s => s.pathConfig?.enabled)) ? (
            <>
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
                <span style={{ fontSize: 11, color: T.muted, minWidth: 35 }}>{layoutConfig.scale.toFixed(1)}×</span>
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
            </>
          ) : null}
          
          <button 
            onClick={() => {
              setTempTitle(layoutConfig.chartTitle)
              setShowTitleModal(true)
            }} 
            style={{ padding: "5px 14px", borderRadius: 4, border: `1px solid ${T.border}`, background: "white", color: T.mid, fontSize: 12, cursor: "pointer", fontFamily: "'Courier Prime',monospace" }}
          >
            Set Title
          </button>
          
          <button 
            onClick={() => setShowRoughnessModal(true)} 
            style={{ 
              padding: "5px 14px", 
              borderRadius: 4, 
              border: `1px solid ${layoutConfig.roughness?.enabled ? T.accent : T.border}`, 
              background: layoutConfig.roughness?.enabled ? `${T.accent}18` : "white", 
              color: layoutConfig.roughness?.enabled ? T.accent : T.mid, 
              fontSize: 12, 
              cursor: "pointer", 
              fontFamily: "'Courier Prime',monospace",
              fontWeight: layoutConfig.roughness?.enabled ? 600 : 400
            }}
          >
            ✏️ Roughness
          </button>
          
          {svgOut && (
            <button onClick={() => downloadSVG(svgOut)} style={{ marginLeft: "auto", padding: "5px 14px", borderRadius: 4, border: `1px solid ${T.navy}`, background: "transparent", color: T.navy, fontSize: 12, cursor: "pointer", fontFamily: "'Courier Prime',monospace" }}>
              ↓ download SVG
            </button>
          )}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
          {!svgOut ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 60, gap: 12 }}>
              <svg width={56} height={56} viewBox="0 0 56 56">
                <rect x={6} y={6} width={44} height={44} rx={4} fill="none" stroke={T.ghost} strokeWidth={1.5} strokeDasharray="4 4"/>
                <circle cx={28} cy={28} r={7} fill="none" stroke={T.ghost} strokeWidth={1}/>
              </svg>
              <div style={{ fontFamily: "'Caveat',cursive", fontSize: 18, color: T.ghost }}>assign a column to see output</div>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 2, boxShadow: "0 2px 24px rgba(0,0,0,0.10)", border: "1px solid #ddd", maxWidth: "100%", overflow: "auto" }} dangerouslySetInnerHTML={{ __html: svgOut }}/>
          )}
        </div>
      </div>
      
      {/* Title Modal */}
      {showTitleModal && (
        <div 
          style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: "rgba(0,0,0,0.5)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            zIndex: 1000 
          }}
          onClick={() => setShowTitleModal(false)}
        >
          <div 
            style={{ 
              background: "white", 
              borderRadius: 8, 
              padding: "24px", 
              minWidth: "400px", 
              boxShadow: "0 4px 24px rgba(0,0,0,0.2)" 
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 600, color: T.mid, marginBottom: 16, fontFamily: "'Caveat',cursive" }}>
              Set Chart Title
            </div>
            <input 
              type="text" 
              value={tempTitle} 
              onChange={e => setTempTitle(e.target.value)}
              style={{ 
                ...inp, 
                width: "100%", 
                fontSize: 14, 
                padding: "8px 12px", 
                marginBottom: 16,
                fontFamily: "Georgia,serif"
              }}
              placeholder="Enter chart title"
              autoFocus
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button 
                onClick={() => setShowTitleModal(false)}
                style={{ 
                  padding: "8px 16px", 
                  borderRadius: 4, 
                  border: `1px solid ${T.border}`, 
                  background: "white", 
                  color: T.mid, 
                  fontSize: 12, 
                  cursor: "pointer" 
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setLayoutConfig(p => ({ ...p, chartTitle: tempTitle }))
                  setShowTitleModal(false)
                }}
                style={{ 
                  padding: "8px 16px", 
                  borderRadius: 4, 
                  border: "none", 
                  background: T.accent, 
                  color: "white", 
                  fontSize: 12, 
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Roughness Settings Modal */}
      {showRoughnessModal && (
        <div 
          style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: "rgba(0,0,0,0.5)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            zIndex: 1000 
          }}
          onClick={() => setShowRoughnessModal(false)}
        >
          <div 
            style={{ 
              background: "white", 
              borderRadius: 8, 
              padding: "24px", 
              minWidth: "450px", 
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 4px 24px rgba(0,0,0,0.2)" 
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 600, color: T.mid, marginBottom: 8, fontFamily: "'Caveat',cursive" }}>
              ✏️ Hand-Drawn Style Settings
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
              Apply rough.js styling for a hand-drawn aesthetic
            </div>
            
            {/* Enable/Disable */}
            <div style={{ marginBottom: 20, padding: "12px", background: T.p1, borderRadius: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={layoutConfig.roughness?.enabled || false}
                  onChange={e => setLayoutConfig(p => ({ 
                    ...p, 
                    roughness: { ...p.roughness, enabled: e.target.checked }
                  }))}
                  style={{ width: 18, height: 18, accentColor: T.accent }}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: T.mid }}>
                  Enable Hand-Drawn Style
                </span>
              </label>
            </div>
            
            {layoutConfig.roughness?.enabled && (
              <>
                {/* Roughness */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: T.mid, fontWeight: 600 }}>Roughness</span>
                    <span style={{ fontSize: 12, color: T.muted }}>{(layoutConfig.roughness?.roughness || 1).toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="5" 
                    step="0.1" 
                    value={layoutConfig.roughness?.roughness || 1}
                    onChange={e => setLayoutConfig(p => ({ 
                      ...p, 
                      roughness: { ...p.roughness, roughness: parseFloat(e.target.value) }
                    }))}
                    style={{ width: "100%", accentColor: T.accent }}
                  />
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                    Higher = more sketchy
                  </div>
                </div>
                
                {/* Bowing */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: T.mid, fontWeight: 600 }}>Bowing</span>
                    <span style={{ fontSize: 12, color: T.muted }}>{(layoutConfig.roughness?.bowing || 1).toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="10" 
                    step="0.1" 
                    value={layoutConfig.roughness?.bowing || 1}
                    onChange={e => setLayoutConfig(p => ({ 
                      ...p, 
                      roughness: { ...p.roughness, bowing: parseFloat(e.target.value) }
                    }))}
                    style={{ width: "100%", accentColor: T.accent }}
                  />
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                    Controls curve of lines
                  </div>
                </div>
                
                {/* Fill Style */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: T.mid, fontWeight: 600, marginBottom: 6 }}>Fill Style</div>
                  <select 
                    value={layoutConfig.roughness?.fillStyle || 'hachure'}
                    onChange={e => setLayoutConfig(p => ({ 
                      ...p, 
                      roughness: { ...p.roughness, fillStyle: e.target.value }
                    }))}
                    style={{ ...inp, width: "100%", fontSize: 12, padding: "6px 8px" }}
                  >
                    <option value="hachure">Hachure (lines)</option>
                    <option value="solid">Solid</option>
                    <option value="zigzag">Zigzag</option>
                    <option value="cross-hatch">Cross-Hatch</option>
                    <option value="dots">Dots</option>
                    <option value="dashed">Dashed</option>
                    <option value="zigzag-line">Zigzag Line</option>
                  </select>
                </div>
                
                {/* Hachure Angle */}
                {(layoutConfig.roughness?.fillStyle === 'hachure' || layoutConfig.roughness?.fillStyle === 'cross-hatch') && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: T.mid, fontWeight: 600 }}>Hachure Angle</span>
                      <span style={{ fontSize: 12, color: T.muted }}>{layoutConfig.roughness?.hachureAngle || -41}°</span>
                    </div>
                    <input 
                      type="range" 
                      min="-180" 
                      max="180" 
                      step="5" 
                      value={layoutConfig.roughness?.hachureAngle || -41}
                      onChange={e => setLayoutConfig(p => ({ 
                        ...p, 
                        roughness: { ...p.roughness, hachureAngle: parseInt(e.target.value) }
                      }))}
                      style={{ width: "100%", accentColor: T.accent }}
                    />
                  </div>
                )}
                
                {/* Hachure Gap */}
                {(layoutConfig.roughness?.fillStyle === 'hachure' || layoutConfig.roughness?.fillStyle === 'cross-hatch') && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: T.mid, fontWeight: 600 }}>Hachure Gap</span>
                      <span style={{ fontSize: 12, color: T.muted }}>{(layoutConfig.roughness?.hachureGap || 4).toFixed(1)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      step="0.5" 
                      value={layoutConfig.roughness?.hachureGap || 4}
                      onChange={e => setLayoutConfig(p => ({ 
                        ...p, 
                        roughness: { ...p.roughness, hachureGap: parseFloat(e.target.value) }
                      }))}
                      style={{ width: "100%", accentColor: T.accent }}
                    />
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                      Spacing between fill lines
                    </div>
                  </div>
                )}
                
                {/* Stroke Width */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: T.mid, fontWeight: 600 }}>Stroke Width</span>
                    <span style={{ fontSize: 12, color: T.muted }}>{(layoutConfig.roughness?.strokeWidth || 1).toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="5" 
                    step="0.1" 
                    value={layoutConfig.roughness?.strokeWidth || 1}
                    onChange={e => setLayoutConfig(p => ({ 
                      ...p, 
                      roughness: { ...p.roughness, strokeWidth: parseFloat(e.target.value) }
                    }))}
                    style={{ width: "100%", accentColor: T.accent }}
                  />
                </div>
                
                {/* Fill Weight */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: T.mid, fontWeight: 600 }}>Fill Weight</span>
                    <span style={{ fontSize: 12, color: T.muted }}>{(layoutConfig.roughness?.fillWeight || 1).toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="5" 
                    step="0.1" 
                    value={layoutConfig.roughness?.fillWeight || 1}
                    onChange={e => setLayoutConfig(p => ({ 
                      ...p, 
                      roughness: { ...p.roughness, fillWeight: parseFloat(e.target.value) }
                    }))}
                    style={{ width: "100%", accentColor: T.accent }}
                  />
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                    Thickness of fill lines
                  </div>
                </div>
              </>
            )}
            
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.ghost}` }}>
              <button 
                onClick={() => setShowRoughnessModal(false)}
                style={{ 
                  padding: "8px 16px", 
                  borderRadius: 4, 
                  border: "none", 
                  background: T.accent, 
                  color: "white", 
                  fontSize: 12, 
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
