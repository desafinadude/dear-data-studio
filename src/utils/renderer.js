import { lerp, lerp3, lerpN, colRange, norm, catColor } from "./color.js"
import { applyColor, applyText, wrapOp, wrapT, wrapSc, wrapRot, escXML } from "./svg.js"
import { PALETTES, DEFAULT_PALETTE } from "./palettes.js"

export const PALETTE = ["#c1440e","#1d3557","#2d6a4f","#c9972b","#9b2226","#457b9d","#606c38","#7209b7","#ef6c00","#1c1208"]

// ── Instance renderer ──────────────────────────────────────────────────────────
// dataMap shape:
//   encoding:       dataMap[slotId][encType]  = {col, colorA, colorB, palette, threshold, matchVal}
//   size-range:     dataMap["dd-size-range"]["size-range"] = {col}
//   repeat-indexed: dataMap["dd-repeat-indexed"]["count"]  = {col, colorGrad, colorA, colorB, opacityFade, sizeGrad}

export function renderInstance(stamp, dataMap, row, data) {
  let extra = ""
  for (const slot of stamp.slots) {

    if (slot.type === "size-range") {
      const cfg = (dataMap[slot.id] || {})["size-range"] || {}
      if (!cfg.col) { extra += slot.startXML; continue }
      const val = row[cfg.col]
      if (typeof val !== "number") { extra += slot.startXML; continue }
      
      // Hide if value is 0 or negative
      if (val <= 0) {
        extra += ""
        continue
      }
      
      // Normalize: 1 = min size, max value = max size
      const [dataMin, dataMax] = colRange(cfg.col, data)
      const effectiveMin = Math.max(1, dataMin) // Use 1 as minimum, or dataMin if it's > 1
      const t = dataMax > effectiveMin ? Math.max(0, Math.min(1, (val - effectiveMin) / (dataMax - effectiveMin))) : 0.5
      
      const ratio = slot.startGeom.primarySize > 0
        ? lerpN(1, slot.endGeom.primarySize / slot.startGeom.primarySize, t) : 1
      
      // Calculate anchor point from origin preset using size-min geometry
      const origin = cfg.origin || "center"
      const geom = slot.startGeom
      const anchorMap = {
        "top-left":     { cx: geom.x, cy: geom.y },
        "top":          { cx: geom.x + geom.width / 2, cy: geom.y },
        "top-right":    { cx: geom.x + geom.width, cy: geom.y },
        "left":         { cx: geom.x, cy: geom.y + geom.height / 2 },
        "center":       { cx: geom.x + geom.width / 2, cy: geom.y + geom.height / 2 },
        "right":        { cx: geom.x + geom.width, cy: geom.y + geom.height / 2 },
        "bottom-left":  { cx: geom.x, cy: geom.y + geom.height },
        "bottom":       { cx: geom.x + geom.width / 2, cy: geom.y + geom.height },
        "bottom-right": { cx: geom.x + geom.width, cy: geom.y + geom.height }
      }
      const anchor = anchorMap[origin] || anchorMap["center"]
      
      let xml = wrapSc(slot.startXML, ratio, anchor.cx, anchor.cy)
      
      // Apply additional encodings (color, opacity, etc.)
      for (const enc of slot.encs) {
        if (enc.type === "size-range") continue
        const encCfg = (dataMap[slot.id] || {})[enc.type] || {}
        const encCol = encCfg.col
        if (!encCol) continue
        const encVal = row[encCol]
        if (encVal === undefined || encVal === null) continue
        const isN = typeof encVal === "number"
        const t2 = isN ? norm(encVal, ...colRange(encCol, data)) : 0
        const palette = PALETTES[encCfg.palette || DEFAULT_PALETTE]?.colors || PALETTE
        if (enc.type === "color") xml = applyColor(xml, isN ? lerp3(encCfg.colorA || "#f4e4d7", encCfg.colorB || "#e09f3e", encCfg.colorC || "#9e2a2b", t2) : catColor(encVal, encCol, data, palette))
        if (enc.type === "opacity" && isN) xml = wrapOp(xml, 0.06 + t2 * 0.94)
        if (enc.type === "rotation" && isN) xml = wrapRot(xml, t2 * 360, anchor.cx, anchor.cy)
      }
      extra += xml
      continue
    }

    if (slot.type === "repeat-indexed") {
      const cfg = (dataMap[slot.id] || {})["count"] || {}
      const rawN = cfg.col && typeof row[cfg.col] === "number" ? Math.abs(row[cfg.col]) : slot.maxCount
      const n = Math.max(0, Math.min(Math.round(rawN), slot.maxCount)) // Clamp between 0 and maxCount
      
      // If count is 0, show nothing
      if (n === 0) {
        extra += ""
        continue
      }
      
      let xml = ""
      slot.items.forEach(item => {
        // Only show items where item.n <= count
        if (item.n > n) return
        
        let ix = item.xml
        const tIdx = slot.items.length > 1 ? (item.n - 1) / (slot.items.length - 1) : 0
        
        // Built-in gradient/fade/size options on the repeat group
        if (cfg.colorGrad)   ix = applyColor(ix, lerp(cfg.colorA || "#e8dfd0", cfg.colorB || "#c1440e", tIdx))
        if (cfg.opacityFade) ix = wrapOp(ix, 0.12 + tIdx * 0.88)
        if (cfg.sizeGrad)    ix = wrapSc(ix, 0.3 + tIdx * 0.7, item.geom.cx, item.geom.cy)
        
        // Item-level encodings (dd-repeat-1-color, dd-repeat-2-opacity, etc.)
        if (item.encs && item.encs.length > 0) {
          for (const enc of item.encs) {
            const encCfg = (dataMap[item.itemId] || {})[enc.type] || {}
            const encCol = encCfg.col
            if (!encCol) continue
            const encVal = row[encCol]
            if (encVal === undefined || encVal === null) continue
            const isN = typeof encVal === "number"
            const t2 = isN ? norm(encVal, ...colRange(encCol, data)) : 0
            const palette = PALETTES[encCfg.palette || DEFAULT_PALETTE]?.colors || PALETTE
            if (enc.type === "color") ix = applyColor(ix, isN ? lerp3(encCfg.colorA || "#f4e4d7", encCfg.colorB || "#e09f3e", encCfg.colorC || "#9e2a2b", t2) : catColor(encVal, encCol, data, palette))
            if (enc.type === "opacity" && isN) ix = wrapOp(ix, 0.06 + t2 * 0.94)
            if (enc.type === "size" && isN) ix = wrapSc(ix, 0.15 + t2 * 1.85, item.geom.cx, item.geom.cy)
            if (enc.type === "rotation" && isN) ix = wrapRot(ix, t2 * 360, item.geom.cx, item.geom.cy)
          }
        }
        
        xml += ix
      })
      
      // Apply group-level encodings to the whole repeat set (color, opacity, etc.)
      for (const enc of slot.encs) {
        if (enc.type === "repeat-indexed") continue
        const encCfg = (dataMap[slot.id] || {})[enc.type] || {}
        const encCol = encCfg.col
        if (!encCol) continue
        const encVal = row[encCol]
        if (encVal === undefined || encVal === null) continue
        const isN = typeof encVal === "number"
        const t2 = isN ? norm(encVal, ...colRange(encCol, data)) : 0
        const palette = PALETTES[encCfg.palette || DEFAULT_PALETTE]?.colors || PALETTE
        if (enc.type === "color") xml = applyColor(xml, isN ? lerp3(encCfg.colorA || "#f4e4d7", encCfg.colorB || "#e09f3e", encCfg.colorC || "#9e2a2b", t2) : catColor(encVal, encCol, data, palette))
        if (enc.type === "opacity" && isN) xml = wrapOp(xml, 0.06 + t2 * 0.94)
        if (enc.type === "rotation" && isN) {
          // For group rotation, we need a center point - use first item's center
          const centerItem = slot.items[0]
          if (centerItem) xml = wrapRot(xml, t2 * 360, centerItem.geom.cx, centerItem.geom.cy)
        }
      }
      extra += xml
      continue
    }

    let xml = slot.xml
    for (const enc of slot.encs) {
      const cfg = (dataMap[slot.id] || {})[enc.type] || {}
      const col = cfg.col
      if (!col) continue
      const val = row[col]; if (val === undefined || val === null) continue
      const isN = typeof val === "number"
      const t = isN ? norm(val, ...colRange(col, data)) : 0
      if (enc.type === "size"    && isN) xml = wrapSc(xml, 0.15 + t * 1.85, slot.geom.cx, slot.geom.cy)
      const palette = PALETTES[cfg.palette || DEFAULT_PALETTE]?.colors || PALETTE
      if (enc.type === "color")         xml = applyColor(xml, isN ? lerp3(cfg.colorA || "#f4e4d7", cfg.colorB || "#e09f3e", cfg.colorC || "#9e2a2b", t) : catColor(val, col, data, palette))
      if (enc.type === "opacity" && isN) xml = wrapOp(xml, 0.06 + t * 0.94)
      if (enc.type === "rotation" && isN) xml = wrapRot(xml, t * 360, slot.geom.cx, slot.geom.cy)
      if (enc.type === "text")           xml = applyText(xml, val)
      if (enc.type === "visible") {
        const show = isN ? val > parseFloat(cfg.threshold || "0") : String(val) === String(cfg.matchVal || "")
        if (!show) { xml = ""; break }
      }
    }
    extra += xml
  }
  return stamp.baseXML + extra
}

// ── Output SVG builder ─────────────────────────────────────────────────────────

function isSlotActive(slot, dataMap) {
  if (slot.type === "size-range")     return !!(dataMap[slot.id]?.["size-range"]?.col)
  if (slot.type === "repeat-indexed") return !!(dataMap[slot.id]?.["count"]?.col)
  return slot.encs.some(enc => (dataMap[slot.id] || {})[enc.type]?.col)
}

export function buildOutputSVG(stamps, dataMap, data, layoutConfig = {}) {
  if (!data?.length) return null
  const active = stamps.filter(s => s.slots.some(sl => isSlotActive(sl, dataMap)))
  if (!active.length) return null
  
  // Layout configuration with defaults
  const layout = {
    type: layoutConfig.type || "grid",      // "grid" or "flow"
    scale: layoutConfig.scale || 1.0,       // Global scale factor
    cols: layoutConfig.cols || 5,           // Columns for grid/flow
    cellW: layoutConfig.cellW || 110,       // Base cell width
    colGap: layoutConfig.colGap || 16,      // Horizontal gap
    rowGap: layoutConfig.rowGap || 18,      // Vertical gap
    pad: layoutConfig.pad || 28,            // Padding
    secGap: layoutConfig.secGap || 32       // Section gap
  }
  
  const rows = []; let y = layout.pad
  const scaledCellW = layout.cellW * layout.scale
  
  for (const stamp of active) {
    const cellH = Math.round(scaledCellW * (stamp.vbH / stamp.vbW))
    
    rows.push(`<text x="${layout.pad}" y="${y}" font-family="Georgia,serif" font-size="11" fill="#9b8b7a" letter-spacing="2">${escXML(stamp.name.toUpperCase())}</text>`)
    rows.push(`<line x1="${layout.pad}" y1="${y + 3}" x2="${layout.pad + layout.cols * (scaledCellW + layout.colGap) - layout.colGap}" y2="${y + 3}" stroke="#e8e5e0" stroke-width="1"/>`)
    y += 16
    
    data.forEach((row, ri) => {
      const col = ri % layout.cols
      const rn = Math.floor(ri / layout.cols)
      const cx = layout.pad + col * (scaledCellW + layout.colGap)
      const cy = y + rn * (cellH + layout.rowGap)
      const sc = (scaledCellW / stamp.vbW).toFixed(4)
      rows.push(`<g transform="translate(${cx},${cy}) scale(${sc}) translate(${-stamp.vbX},${-stamp.vbY})">${renderInstance(stamp, dataMap, row, data)}</g>`)
    })
    
    y += Math.ceil(data.length / layout.cols) * (cellH + layout.rowGap) + layout.secGap
  }
  
  rows.push(`<line x1="${layout.pad}" y1="${y}" x2="${layout.pad + layout.cols * (scaledCellW + layout.colGap) - layout.colGap}" y2="${y}" stroke="#e8e5e0" stroke-width="1"/>`)
  y += 10; let lx = layout.pad
  for (const stamp of active) {
    const sc = (28 / stamp.vbW).toFixed(4)
    rows.push(`<g transform="translate(${lx},${y}) scale(${sc}) translate(${-stamp.vbX},${-stamp.vbY})">${stamp.baseXML}</g>`)
    rows.push(`<text x="${lx + 34}" y="${y + 16}" font-family="Georgia,serif" font-size="11" fill="#6b5040">= ${escXML(stamp.name)}</text>`)
    lx += 170
  }
  y += 36
  const W = layout.pad * 2 + layout.cols * (scaledCellW + layout.colGap) - layout.colGap
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${y}" width="${W}" height="${y}"><title>Dear Data Portrait</title><rect width="${W}" height="${y}" fill="#ffffff"/>\n${rows.join("\n")}\n</svg>`
}

export function downloadSVG(s, f = "dear-data.svg") {
  const b = new Blob([s], { type: "image/svg+xml" })
  const u = URL.createObjectURL(b)
  const a = document.createElement("a")
  a.href = u; a.download = f; a.click()
  URL.revokeObjectURL(u)
}
