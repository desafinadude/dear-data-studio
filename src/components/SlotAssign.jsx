import { T, inp } from "../theme.js"
import { isNumCol } from "../utils/color.js"
import { PALETTES, DEFAULT_PALETTE } from "../utils/palettes.js"
import Lbl from "./Lbl.jsx"
import ColorRange from "./ColorRange.jsx"

const EL = {
  size: "size", "size-range": "size", color: "colour", opacity: "opacity",
  visible: "visible if", repeat: "repeat", "repeat-indexed": "repeat", count: "count",
  rotation: "rotation", text: "text",
}

export default function SlotAssign({ stamp, slot, dataMap, setDM, setSlotProp, columns, csv }) {

  if (slot.type === "size-range") {
    const cfg = (dataMap[slot.id] || {})["size-range"] || {}
    const additionalEncs = slot.encs.filter(e => e.type !== "size-range")
    
    return (
      <div style={{ marginBottom: 10, padding: "11px 13px", background: T.p2, borderRadius: 5, border: `1px solid ${T.ghost}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, flexWrap: "wrap" }}>
          <code style={{ fontSize: 12, background: T.navy, color: "#f7f2e8", borderRadius: 3, padding: "3px 8px" }}>{slot.id}</code>
          <span style={{ fontSize: 11, background: `${T.accent}18`, color: T.accent, borderRadius: 8, padding: "2px 8px", border: `1px solid ${T.accent}33` }}>size range</span>
          <span style={{ fontSize: 11, color: T.muted }}>
            min {slot.startGeom.primarySize.toFixed(0)}px → max {slot.endGeom.primarySize.toFixed(0)}px (from SVG geometry)
          </span>
          {slot.anchor && (
            <span style={{ fontSize: 11, color: T.accent }}>
              ⚓ anchor ({slot.anchor.cx.toFixed(0)}, {slot.anchor.cy.toFixed(0)})
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: T.mid, flexShrink: 0, width: 60 }}>column</span>
          <select value={cfg.col || ""} onChange={e => setDM(slot.id, "size-range", "col", e.target.value)} style={{ ...inp, flex: 1, fontSize: 12 }}>
            <option value="">— numeric column —</option>
            {columns.filter(c => isNumCol(c, csv)).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        
        {/* Scale origin controls */}
        {cfg.col && (
          <div style={{ marginBottom: additionalEncs.length > 0 ? 12 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: T.mid, flexShrink: 0, width: 60 }}>origin</span>
              <select 
                value={cfg.origin || "center"} 
                onChange={e => setDM(slot.id, "size-range", "origin", e.target.value)}
                style={{ ...inp, fontSize: 11, flex: 1 }}
              >
                <option value="top-left">Top Left</option>
                <option value="top">Top Center</option>
                <option value="top-right">Top Right</option>
                <option value="left">Left Center</option>
                <option value="center">Center</option>
                <option value="right">Right Center</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>
          </div>
        )}
        
        {/* Additional encodings (color, opacity, rotation) */}
        {additionalEncs.length > 0 && (
          <div style={{ borderTop: `1px dashed ${T.ghost}`, paddingTop: 10 }}>
            <Lbl>additional encodings</Lbl>
            {additionalEncs.map((enc, ei) => {
              const encCfg = (dataMap[slot.id] || {})[enc.type] || {}
              return (
                <div key={ei} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: T.mid, width: 60, flexShrink: 0, fontStyle: "italic" }}>{EL[enc.type] || enc.type}</span>
                    <select value={encCfg.col || ""} onChange={e => setDM(slot.id, enc.type, "col", e.target.value)} style={{ ...inp, flex: 1, fontSize: 12 }}>
                      <option value="">— column —</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {enc.type === "color" && encCfg.col && (
                    <div style={{ paddingLeft: 68, marginBottom: 4 }}>
                      {isNumCol(encCfg.col, csv) ? (
                        <ColorRange cfg={encCfg} onA={v => setDM(slot.id, enc.type, "colorA", v)} onB={v => setDM(slot.id, enc.type, "colorB", v)} onC={v => setDM(slot.id, enc.type, "colorC", v)}/>
                      ) : (
                        <div>
                          <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>categorical — choose palette</div>
                          <select 
                            value={encCfg.palette || DEFAULT_PALETTE} 
                            onChange={e => setDM(slot.id, enc.type, "palette", e.target.value)} 
                            style={{ ...inp, fontSize: 10, marginBottom: 4, padding: "2px 6px" }}
                          >
                            {Object.entries(PALETTES).map(([key, pal]) => (
                              <option key={key} value={key}>{pal.name}</option>
                            ))}
                          </select>
                          <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                            {PALETTES[encCfg.palette || DEFAULT_PALETTE].colors.slice(0, 8).map((c, i) => (
                              <div key={i} style={{ width: 12, height: 12, background: c, borderRadius: 2, border: `1px solid ${T.ghost}` }} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (slot.type === "repeat-indexed") {
    const cfg = (dataMap[slot.id] || {})["count"] || {}
    const tog = f => setDM(slot.id, "count", f, !cfg[f])
    const groupEncs = slot.encs.filter(e => e.type !== "repeat-indexed")
    const hasItemEncs = slot.items.some(item => item.encs && item.encs.length > 0)
    
    return (
      <div style={{ marginBottom: 10, padding: "11px 13px", background: T.p2, borderRadius: 5, border: `1px solid ${T.ghost}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, flexWrap: "wrap" }}>
          <code style={{ fontSize: 12, background: T.navy, color: "#f7f2e8", borderRadius: 3, padding: "3px 8px" }}>{slot.id}</code>
          <span style={{ fontSize: 11, background: `${T.accent}18`, color: T.accent, borderRadius: 8, padding: "2px 8px", border: `1px solid ${T.accent}33` }}>indexed repeat · max {slot.maxCount}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: T.mid, flexShrink: 0, width: 60 }}>count</span>
          <select value={cfg.col || ""} onChange={e => setDM(slot.id, "count", "col", e.target.value)} style={{ ...inp, flex: 1, fontSize: 12 }}>
            <option value="">— numeric column —</option>
            {columns.filter(c => isNumCol(c, csv)).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>capped at {slot.maxCount}</span>
        </div>
        
        {/* Group-level encodings (dd-repeat-NAME-color, dd-repeat-NAME-opacity) */}
        {groupEncs.length > 0 && (
          <div style={{ borderTop: `1px dashed ${T.ghost}`, paddingTop: 10, marginBottom: 12 }}>
            <Lbl>group-level encodings (apply to all items)</Lbl>
            {groupEncs.map((enc, ei) => {
              const encCfg = (dataMap[slot.id] || {})[enc.type] || {}
              return (
                <div key={ei} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: T.mid, width: 60, flexShrink: 0, fontStyle: "italic" }}>{EL[enc.type] || enc.type}</span>
                    <select value={encCfg.col || ""} onChange={e => setDM(slot.id, enc.type, "col", e.target.value)} style={{ ...inp, flex: 1, fontSize: 12 }}>
                      <option value="">— column —</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {enc.type === "color" && encCfg.col && (
                    <div style={{ paddingLeft: 68, marginBottom: 4 }}>
                      {isNumCol(encCfg.col, csv) ? (
                        <ColorRange cfg={encCfg} onA={v => setDM(slot.id, enc.type, "colorA", v)} onB={v => setDM(slot.id, enc.type, "colorB", v)} onC={v => setDM(slot.id, enc.type, "colorC", v)}/>
                      ) : (
                        <div>
                          <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>categorical palette</div>
                          <select 
                            value={encCfg.palette || DEFAULT_PALETTE} 
                            onChange={e => setDM(slot.id, enc.type, "palette", e.target.value)} 
                            style={{ ...inp, fontSize: 10, marginBottom: 4, padding: "2px 6px" }}
                          >
                            {Object.entries(PALETTES).map(([key, pal]) => (
                              <option key={key} value={key}>{pal.name}</option>
                            ))}
                          </select>
                          <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                            {PALETTES[encCfg.palette || DEFAULT_PALETTE].colors.slice(0, 8).map((c, i) => (
                              <div key={i} style={{ width: 12, height: 12, background: c, borderRadius: 2, border: `1px solid ${T.ghost}` }} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        
        {/* Item-level encodings (dd-repeat-1-color, dd-repeat-2-opacity, etc.) */}
        {hasItemEncs && (
          <div style={{ borderTop: `1px dashed ${T.ghost}`, paddingTop: 10, marginBottom: 12 }}>
            <Lbl>item-level encodings</Lbl>
            {slot.items.filter(item => item.encs && item.encs.length > 0).map(item => (
              <div key={item.itemId} style={{ marginBottom: 12, padding: "8px 10px", background: T.p1, borderRadius: 4 }}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
                  <code style={{ fontSize: 11, color: T.navy }}>{item.itemId}</code>
                </div>
                {item.encs.map((enc, ei) => {
                  const encCfg = (dataMap[item.itemId] || {})[enc.type] || {}
                  return (
                    <div key={ei} style={{ marginBottom: ei < item.encs.length - 1 ? 8 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: T.mid, width: 50, flexShrink: 0, fontStyle: "italic" }}>{EL[enc.type] || enc.type}</span>
                        <select value={encCfg.col || ""} onChange={e => setDM(item.itemId, enc.type, "col", e.target.value)} style={{ ...inp, flex: 1, fontSize: 11 }}>
                          <option value="">— column —</option>
                          {columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      {enc.type === "color" && encCfg.col && (
                        <div style={{ paddingLeft: 58, marginBottom: 4 }}>
                          {isNumCol(encCfg.col, csv) ? (
                            <ColorRange cfg={encCfg} onA={v => setDM(item.itemId, enc.type, "colorA", v)} onB={v => setDM(item.itemId, enc.type, "colorB", v)} onC={v => setDM(item.itemId, enc.type, "colorC", v)}/>
                          ) : (
                            <div>
                              <div style={{ fontSize: 9, color: T.muted, marginBottom: 3 }}>categorical palette</div>
                              <select 
                                value={encCfg.palette || DEFAULT_PALETTE} 
                                onChange={e => setDM(item.itemId, enc.type, "palette", e.target.value)} 
                                style={{ ...inp, fontSize: 9, marginBottom: 3, padding: "2px 4px" }}
                              >
                                {Object.entries(PALETTES).map(([key, pal]) => (
                                  <option key={key} value={key}>{pal.name}</option>
                                ))}
                              </select>
                              <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                                {PALETTES[encCfg.palette || DEFAULT_PALETTE].colors.slice(0, 6).map((c, i) => (
                                  <div key={i} style={{ width: 10, height: 10, background: c, borderRadius: 1, border: `1px solid ${T.ghost}` }} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
        
        <div style={{ borderTop: `1px dashed ${T.ghost}`, paddingTop: 10 }}>
          <Lbl>vary copies by index (first → last)</Lbl>
          <label style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={!!cfg.colorGrad} onChange={() => tog("colorGrad")} style={{ accentColor: T.accent, flexShrink: 0 }}/>
            <span style={{ fontSize: 13, color: T.mid }}>colour gradient</span>
          </label>
          {cfg.colorGrad && (
            <div style={{ paddingLeft: 24, marginBottom: 8 }}>
              <ColorRange cfg={cfg} onA={v => setDM(slot.id, "count", "colorA", v)} onB={v => setDM(slot.id, "count", "colorB", v)} onC={v => setDM(slot.id, "count", "colorC", v)} label="first"/>
            </div>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={!!cfg.opacityFade} onChange={() => tog("opacityFade")} style={{ accentColor: T.accent, flexShrink: 0 }}/>
            <span style={{ fontSize: 13, color: T.mid }}>opacity fade</span>
            <span style={{ fontSize: 12, color: T.muted }}>ghost → solid</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
            <input type="checkbox" checked={!!cfg.sizeGrad} onChange={() => tog("sizeGrad")} style={{ accentColor: T.accent, flexShrink: 0 }}/>
            <span style={{ fontSize: 13, color: T.mid }}>size ramp</span>
            <span style={{ fontSize: 12, color: T.muted }}>small → large</span>
          </label>
        </div>
      </div>
    )
  }

  // Standard encoding slot
  return (
    <div style={{ marginBottom: 10, padding: "11px 13px", background: T.p2, borderRadius: 5, border: `1px solid ${T.ghost}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, flexWrap: "wrap" }}>
        <code style={{ fontSize: 12, background: T.navy, color: "#f7f2e8", borderRadius: 3, padding: "3px 8px" }}>{slot.id}</code>
        {slot.encs.map((e, i) => (
          <span key={i} style={{ fontSize: 11, background: `${T.accent}18`, color: T.accent, borderRadius: 8, padding: "2px 8px", border: `1px solid ${T.accent}33` }}>
            {EL[e.type] || e.type}{e.dir ? " " + e.dir : ""}{e.copyEnc ? " · " + e.copyEnc : ""}
          </span>
        ))}
      </div>
      {slot.encs.map((enc, ei) => {
        const cfg = (dataMap[slot.id] || {})[enc.type] || {}
        return (
          <div key={ei} style={{ marginBottom: ei < slot.encs.length - 1 ? 10 : 0, paddingBottom: ei < slot.encs.length - 1 ? 10 : 0, borderBottom: ei < slot.encs.length - 1 ? `1px dashed ${T.ghost}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: T.mid, width: 60, flexShrink: 0, fontStyle: "italic" }}>{EL[enc.type] || enc.type}</span>
              <select value={cfg.col || ""} onChange={e => setDM(slot.id, enc.type, "col", e.target.value)} style={{ ...inp, flex: 1, fontSize: 12 }}>
                <option value="">— column —</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {enc.type === "color" && (
              <div style={{ paddingLeft: 68, marginBottom: 4 }}>
                {cfg.col && isNumCol(cfg.col, csv) ? (
                  <ColorRange cfg={cfg} onA={v => setDM(slot.id, enc.type, "colorA", v)} onB={v => setDM(slot.id, enc.type, "colorB", v)} onC={v => setDM(slot.id, enc.type, "colorC", v)}/>
                ) : cfg.col ? (
                  <div>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>categorical — choose palette</div>
                    <select 
                      value={cfg.palette || DEFAULT_PALETTE} 
                      onChange={e => setDM(slot.id, enc.type, "palette", e.target.value)} 
                      style={{ ...inp, fontSize: 11, marginBottom: 6 }}
                    >
                      {Object.entries(PALETTES).map(([key, pal]) => (
                        <option key={key} value={key}>{pal.name}</option>
                      ))}
                    </select>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {PALETTES[cfg.palette || DEFAULT_PALETTE].colors.map((c, i) => (
                        <div key={i} style={{ width: 16, height: 16, background: c, borderRadius: 2, border: `1px solid ${T.ghost}` }} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <ColorRange cfg={cfg} onA={v => setDM(slot.id, enc.type, "colorA", v)} onB={v => setDM(slot.id, enc.type, "colorB", v)} onC={v => setDM(slot.id, enc.type, "colorC", v)}/>
                )}
              </div>
            )}
            {enc.type === "visible" && cfg.col && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, paddingLeft: 68 }}>
                {isNumCol(cfg.col, csv)
                  ? <><span style={{ fontSize: 12, color: T.mid }}>show if {">"}</span><input value={cfg.threshold || ""} onChange={e => setDM(slot.id, enc.type, "threshold", e.target.value)} placeholder="0" style={{ ...inp, width: 52, fontSize: 12 }}/></>
                  : <><span style={{ fontSize: 12, color: T.mid }}>show if =</span><input value={cfg.matchVal || ""} onChange={e => setDM(slot.id, enc.type, "matchVal", e.target.value)} placeholder="value" style={{ ...inp, width: 76, fontSize: 12 }}/></>
                }
              </div>
            )}
            {enc.type === "repeat" && cfg.col && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, paddingLeft: 68 }}>
                <span style={{ fontSize: 12, color: T.muted, flexShrink: 0 }}>spacing</span>
                <input type="range" min={4} max={80} value={slot.spacing || 20} onChange={e => setSlotProp(stamp.id, slot.id, "spacing", +e.target.value)} style={{ flex: 1, accentColor: T.accent }}/>
                <span style={{ fontSize: 12, color: T.muted, flexShrink: 0, minWidth: 28 }}>{slot.spacing || 20}px</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
