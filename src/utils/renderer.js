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

// Path generators for preset layouts
function generateLinePath(x, y, width, rows = 1, rowHeight = 100) {
  // Multiple horizontal lines, left-to-right, stacked vertically
  const paths = []
  for (let i = 0; i < rows; i++) {
    const yPos = y + i * rowHeight
    paths.push(`M ${x} ${yPos} L ${x + width} ${yPos}`)
  }
  return paths.join(" ")
}

function generateCirclePath(cx, cy, radius) {
  // Circle path
  return `M ${cx + radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx + radius - 0.1} ${cy}`
}

function generateSpiralPath(cx, cy, startRadius, endRadius, turns = 3) {
  // Archimedean spiral
  const points = []
  const steps = 200
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const angle = t * turns * 2 * Math.PI
    const r = startRadius + (endRadius - startRadius) * t
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return points.join(" ")
}

// Get the starting point of a path
function getPathStartPoint(pathString) {
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("d", pathString)
    svg.appendChild(path)
    document.body.appendChild(svg)
    
    const point = path.getPointAtLength(0)
    document.body.removeChild(svg)
    
    return { x: point.x, y: point.y }
  } catch (e) {
    return null
  }
}

// Calculate points along an SVG path
function getPathPoints(pathString, count) {
  // Parse path and distribute points
  // For now, create a temporary SVG path element to use getTotalLength/getPointAtLength
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
  path.setAttribute("d", pathString)
  svg.appendChild(path)
  document.body.appendChild(svg)
  
  const totalLength = path.getTotalLength()
  const points = []
  
  for (let i = 0; i < count; i++) {
    const distance = (i / Math.max(1, count - 1)) * totalLength
    const point = path.getPointAtLength(distance)
    
    // Get tangent for rotation (sample nearby point)
    const tangentDist = Math.min(distance + 1, totalLength)
    const tangentPoint = path.getPointAtLength(tangentDist)
    const angle = Math.atan2(tangentPoint.y - point.y, tangentPoint.x - point.x) * (180 / Math.PI)
    
    points.push({ x: point.x, y: point.y, angle })
  }
  
  document.body.removeChild(svg)
  return points
}

function isSlotActive(slot, dataMap) {
  if (slot.type === "size-range")     return !!(dataMap[slot.id]?.["size-range"]?.col)
  if (slot.type === "repeat-indexed") return !!(dataMap[slot.id]?.["count"]?.col)
  return slot.encs.some(enc => (dataMap[slot.id] || {})[enc.type]?.col)
}

export function buildOutputSVG(stamps, dataMap, data, layoutConfig = {}, canvasSVG = null) {
  if (!data?.length) return null
  const active = stamps.filter(s => s.slots.some(sl => isSlotActive(sl, dataMap)))
  if (!active.length) return null
  
  // If canvas SVG is provided, use canvas-based layout
  if (canvasSVG) {
    const rows = []
    
    // Add base canvas SVG as background (extract just the inner content)
    const baseSVGContent = canvasSVG.baseSVG
      .replace(/<svg[^>]*>/, '')
      .replace(/<\/svg>/, '')
      .trim()
    if (baseSVGContent) {
      rows.push(baseSVGContent)
    }
    
    // Show paths for debugging (either all paths or specific ones based on stamp config)
    const stampsWithShowPath = stamps.filter(s => s.pathConfig?.showPath)
    
    if (stampsWithShowPath.length > 0) {
      const pathsToShow = new Set()
      
      // Collect paths that should be shown
      stampsWithShowPath.forEach(stamp => {
        if (stamp.pathConfig?.pathType === "canvas" && stamp.pathConfig?.canvasPath) {
          pathsToShow.add(stamp.pathConfig.canvasPath)
        }
      })
      
      // If any stamp wants to show paths, show all requested paths
      canvasSVG.paths.forEach(p => {
        if (pathsToShow.size === 0 || pathsToShow.has(p.name)) {
          // More visible styling for the debug paths
          rows.push(`<path d="${p.d}" fill="none" stroke="#ff0000" stroke-width="3" opacity="0.6" stroke-dasharray="5 3" pointer-events="none"/>`)
          
          // Add a label at the start of the path with background
          const firstPoint = getPathStartPoint(p.d)
          if (firstPoint) {
            rows.push(`<circle cx="${firstPoint.x}" cy="${firstPoint.y}" r="20" fill="#ff0000" opacity="0.2"/>`)
            rows.push(`<text x="${firstPoint.x}" y="${firstPoint.y + 5}" font-size="14" font-weight="bold" fill="#ff0000" text-anchor="middle">${p.name}</text>`)
          }
        }
      })
    }
    
    for (const stamp of active) {
      const stampPath = stamp.pathConfig || {}
      
      // Check if stamp uses a canvas path
      if (stampPath.enabled && stampPath.pathType === "canvas" && stampPath.canvasPath) {
        const canvasPath = canvasSVG.paths.find(p => p.name === stampPath.canvasPath)
        
        if (canvasPath) {
          try {
            // Use per-stamp spacing to adjust point distribution
            const spacing = stampPath.spacing || 1.0
            const adjustedCount = Math.max(1, Math.round(data.length / spacing))
            const points = getPathPoints(canvasPath.d, adjustedCount)
            
            // Use per-stamp scale
            const stampScale = stampPath.scale || 1.0
            const scaledCellW = (layoutConfig.cellW || 110) * stampScale
            const sc = (scaledCellW / stamp.vbW).toFixed(4)
            
            // Only render up to data.length items
            const renderCount = Math.min(points.length, data.length)
            for (let ri = 0; ri < renderCount; ri++) {
              const point = points[ri]
              const row = data[ri]
              const rotation = stampPath.followPath ? point.angle : 0
              const rotTransform = rotation ? `rotate(${rotation.toFixed(2)})` : ""
              rows.push(`<g transform="translate(${point.x.toFixed(2)},${point.y.toFixed(2)}) ${rotTransform} scale(${sc}) translate(${-stamp.vbX},${-stamp.vbY})">${renderInstance(stamp, dataMap, row, data)}</g>`)
            }
          } catch (e) {
            console.error("Canvas path layout error:", e)
          }
        } else {
          console.warn(`Canvas path "${stampPath.canvasPath}" not found. Available paths:`, canvasSVG.paths.map(p => p.name))
        }
      }
    }
    
    const W = canvasSVG.vbW
    const H = canvasSVG.vbH
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${canvasSVG.vbX} ${canvasSVG.vbY} ${W} ${H}" width="${W}" height="${H}"><title>Dear Data Portrait</title>\n${rows.join("\n")}\n</svg>`
  }
  
  // Original grid/path layout code for when no canvas is provided
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
    
    // Get stamp-specific path configuration
    const stampPath = stamp.pathConfig || {}
    const usePathLayout = stampPath.enabled && stampPath.pathType
    
    rows.push(`<text x="${layout.pad}" y="${y}" font-family="Georgia,serif" font-size="11" fill="#9b8b7a" letter-spacing="2">${escXML(stamp.name.toUpperCase())}</text>`)
    rows.push(`<line x1="${layout.pad}" y1="${y + 3}" x2="${layout.pad + layout.cols * (scaledCellW + layout.colGap) - layout.colGap}" y2="${y + 3}" stroke="#e8e5e0" stroke-width="1"/>`)
    y += 16
    
    if (usePathLayout) {
      // Path-based layout
      let pathString = ""
      const baseY = y + 200 // Center of path area
      const canvasWidth = layout.cols * (scaledCellW + layout.colGap)
      
      // Use per-stamp scale and spacing
      const stampScale = stampPath.scale || 1.0
      const spacing = stampPath.spacing || 1.0
      const stampScaledCellW = layout.cellW * stampScale
      
      switch (stampPath.pathType) {
        case "line":
          const rows = stampPath.rows || Math.ceil(data.length / (stampPath.perRow || 10))
          pathString = generateLinePath(layout.pad, baseY - (rows * 60) / 2, canvasWidth, rows, 60)
          break
        case "circle":
          const radius = Math.min(canvasWidth, 400) / 2
          pathString = generateCirclePath(layout.pad + canvasWidth / 2, baseY, radius)
          break
        case "spiral":
          pathString = generateSpiralPath(layout.pad + canvasWidth / 2, baseY, 30, 200, 3)
          break
        case "custom":
          pathString = stampPath.customPath || ""
          break
      }
      
      if (pathString) {
        try {
          // Adjust point count based on spacing
          const adjustedCount = Math.max(1, Math.round(data.length / spacing))
          const points = getPathPoints(pathString, adjustedCount)
          
          // Only render up to data.length items
          const renderCount = Math.min(points.length, data.length)
          for (let ri = 0; ri < renderCount; ri++) {
            const point = points[ri]
            const row = data[ri]
            const sc = (stampScaledCellW / stamp.vbW).toFixed(4)
            const rotation = stampPath.followPath ? point.angle : 0
            const rotTransform = rotation ? `rotate(${rotation.toFixed(2)})` : ""
            rows.push(`<g transform="translate(${point.x.toFixed(2)},${point.y.toFixed(2)}) ${rotTransform} scale(${sc}) translate(${-stamp.vbX},${-stamp.vbY})">${renderInstance(stamp, dataMap, row, data)}</g>`)
          }
          
          // Debug: show path
          if (stampPath.showPath) {
            rows.push(`<path d="${pathString}" fill="none" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="2 2"/>`)
          }
          
          y += 450 // Fixed height for path layouts
        } catch (e) {
          console.error("Path layout error:", e)
          // Fallback to grid
        }
      }
    } else {
      // Grid layout - use per-stamp scale and spacing
      const stampScale = stampPath.scale || 1.0
      const spacing = stampPath.spacing || 1.0
      const stampScaledCellW = layout.cellW * stampScale
      const stampCellH = Math.round(stampScaledCellW * (stamp.vbH / stamp.vbW))
      
      // Apply spacing by adjusting gaps
      const adjustedColGap = layout.colGap * spacing
      const adjustedRowGap = layout.rowGap * spacing
      
      data.forEach((row, ri) => {
        const col = ri % layout.cols
        const rn = Math.floor(ri / layout.cols)
        const cx = layout.pad + col * (stampScaledCellW + adjustedColGap)
        const cy = y + rn * (stampCellH + adjustedRowGap)
        const sc = (stampScaledCellW / stamp.vbW).toFixed(4)
        rows.push(`<g transform="translate(${cx},${cy}) scale(${sc}) translate(${-stamp.vbX},${-stamp.vbY})">${renderInstance(stamp, dataMap, row, data)}</g>`)
      })
      
      y += Math.ceil(data.length / layout.cols) * (stampCellH + adjustedRowGap) + layout.secGap
    }
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
