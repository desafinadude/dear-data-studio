// ── String transforms ──────────────────────────────────────────────────────────

export function applyColor(xml, color) {
  return xml
    .replace(/fill="(?!none|transparent)[^"]+"/g,   `fill="${color}"`)
    .replace(/stroke="(?!none|transparent)[^"]+"/g, `stroke="${color}"`)
    .replace(/(fill:\s*)(?!none|transparent)[^;}"]+/g,   `$1${color}`)
    .replace(/(stroke:\s*)(?!none|transparent)[^;}"]+/g, `$1${color}`)
}

export const wrapOp = (xml, op)          => `<g opacity="${op.toFixed(3)}">${xml}</g>`
export const wrapT  = (xml, dx, dy)      => `<g transform="translate(${dx.toFixed(2)},${dy.toFixed(2)})">${xml}</g>`
export const wrapSc = (xml, s, cx, cy)   =>
  `<g transform="translate(${cx.toFixed(2)},${cy.toFixed(2)}) scale(${s.toFixed(4)}) translate(${(-cx).toFixed(2)},${(-cy).toFixed(2)})">${xml}</g>`
export const wrapRot = (xml, deg, cx, cy) =>
  `<g transform="translate(${cx.toFixed(2)},${cy.toFixed(2)}) rotate(${deg.toFixed(2)}) translate(${(-cx).toFixed(2)},${(-cy).toFixed(2)})">${xml}</g>`

export const escXML = s =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export function applyText(xml, text) {
  // Replace text content in <text> elements, handling both direct text and <tspan> children
  const escaped = escXML(text)
  // First try to replace tspan content
  let result = xml.replace(/(<tspan[^>]*>)[^<]*(<\/tspan>)/g, `$1${escaped}$2`)
  // If no tspan, replace direct text content
  if (result === xml) {
    result = xml.replace(/(<text[^>]*>)[^<]*(<\/text>)/g, `$1${escaped}$2`)
  }
  return result
}

// ── Geometry extraction ────────────────────────────────────────────────────────

export function getGeom(el, vbW, vbH) {
  if (!el) return { cx: vbW / 2, cy: vbH / 2, x: 0, y: 0, width: vbW, height: vbH, primarySize: 20 }
  const tag = (el.tagName || "").toLowerCase()
  if (tag === "circle") {
    const r = parseFloat(el.getAttribute("r") || 10)
    const cx = parseFloat(el.getAttribute("cx") || vbW / 2)
    const cy = parseFloat(el.getAttribute("cy") || vbH / 2)
    return { cx, cy, x: cx - r, y: cy - r, width: r * 2, height: r * 2, primarySize: r * 2 }
  }
  if (tag === "rect") {
    const w = parseFloat(el.getAttribute("width") || 0), h = parseFloat(el.getAttribute("height") || 0)
    const x = parseFloat(el.getAttribute("x") || 0),     y = parseFloat(el.getAttribute("y") || 0)
    return { cx: x + w / 2, cy: y + h / 2, x, y, width: w, height: h, primarySize: Math.max(w, h) }
  }
  if (tag === "ellipse") {
    const rx = parseFloat(el.getAttribute("rx") || 10), ry = parseFloat(el.getAttribute("ry") || 10)
    const cx = parseFloat(el.getAttribute("cx") || vbW / 2)
    const cy = parseFloat(el.getAttribute("cy") || vbH / 2)
    return { cx, cy, x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2, primarySize: Math.max(rx, ry) * 2 }
  }
  if (tag === "path" || tag === "polygon" || tag === "polyline") {
    // For paths and other complex shapes, estimate from viewBox as fallback
    // getBBox() doesn't work reliably in DOMParser context
    // Instead, look for d attribute and try to parse bounds
    const d = el.getAttribute("d")
    if (d) {
      // Extract numbers from path - very rough approximation
      const nums = d.match(/-?\d+\.?\d*/g)?.map(Number) || []
      if (nums.length >= 2) {
        const xs = nums.filter((_, i) => i % 2 === 0)
        const ys = nums.filter((_, i) => i % 2 === 1)
        const minX = Math.min(...xs), maxX = Math.max(...xs)
        const minY = Math.min(...ys), maxY = Math.max(...ys)
        const w = maxX - minX, h = maxY - minY
        return { cx: minX + w / 2, cy: minY + h / 2, x: minX, y: minY, width: w, height: h, primarySize: Math.max(w, h) }
      }
    }
  }
  if (tag === "text") {
    // For text elements, use x/y position and estimate size from font-size
    const x = parseFloat(el.getAttribute("x") || 0)
    const y = parseFloat(el.getAttribute("y") || 0)
    const fontSize = parseFloat(el.getAttribute("font-size") || 12)
    const w = fontSize * 5, h = fontSize * 1.5 // Rough estimate
    return { cx: x, cy: y, x, y, width: w, height: h, primarySize: fontSize }
  }
  // For groups or other containers, find first child shape
  const child = el.querySelector("circle,rect,ellipse,path,polygon,polyline,text")
  if (child) return getGeom(child, vbW, vbH)
  return { cx: vbW / 2, cy: vbH / 2, x: 0, y: 0, width: vbW, height: vbH, primarySize: 20 }
}

// ── SVG parser ─────────────────────────────────────────────────────────────────

function parseEncodings(parts) {
  const encs = []
  let i = 0
  while (i < parts.length) {
    if (["color", "colour", "opacity", "visible", "rotation", "text"].includes(parts[i])) {
      encs.push({ type: parts[i] === "colour" ? "color" : parts[i] })
      i++
    } else {
      i++
    }
  }
  return encs
}

export function parseStamp(svgText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, "image/svg+xml")
  if (doc.querySelector("parsererror")) throw new Error("SVG parse error — check the file is valid SVG")
  const svgEl = doc.querySelector("svg")
  const vb = (svgEl.getAttribute("viewBox") || "0 0 100 100").split(/[\s,]+/).map(Number)
  const [vbX, vbY, vbW, vbH] = vb
  const slots = []
  const processedEls = new Set()

  // 1. Process all groups first
  for (const group of [...svgEl.querySelectorAll("g[id^='dd-']")]) {
    const groupId = group.getAttribute("id")
    if (!groupId) continue
    
    // Parse group ID: dd-{id}-{prop1}-{prop2}-...
    const parts = groupId.split("-").slice(1) // Remove "dd" prefix
    if (parts.length === 0) continue
    
    // Find where the ID ends and props begin
    // ID uses underscores, props use hyphens
    // So "focus_mood-color-opacity" -> ID="focus_mood", props=["color","opacity"]
    let idParts = []
    let propParts = []
    let foundProp = false
    for (const part of parts) {
      if (!foundProp && ["color", "colour", "opacity", "visible", "rotation", "repeat", "size", "text"].includes(part)) {
        foundProp = true
        propParts.push(part)
      } else if (foundProp) {
        propParts.push(part)
      } else {
        idParts.push(part)
      }
    }
    
    const id = idParts.join("_")
    
    // Check for repeat group: dd-{id}-repeat-{props}
    if (propParts[0] === "repeat") {
      const additionalEncs = parseEncodings(propParts.slice(1))
      
      // Find repeat items: dd-{id}-repeat-1, dd-{id}-repeat-2, etc.
      const idxEls = [...group.querySelectorAll(`[id^='dd-${id}-repeat-']`)]
        .filter(el => {
          const elId = el.getAttribute("id") || ""
          return /^dd-[\w_]+-repeat-(\d+)/.test(elId)
        })
        .sort((a, b) => {
          const aMatch = (a.getAttribute("id") || "").match(/repeat-(\d+)/)
          const bMatch = (b.getAttribute("id") || "").match(/repeat-(\d+)/)
          return (aMatch ? parseInt(aMatch[1]) : 0) - (bMatch ? parseInt(bMatch[1]) : 0)
        })
      
      if (idxEls.length) {
        slots.push({
          id: groupId,
          type: "repeat-indexed",
          items: idxEls.map(el => {
            const itemId = el.getAttribute("id") || ""
            const numMatch = itemId.match(/repeat-(\d+)/)
            const n = numMatch ? parseInt(numMatch[1]) : 0
            
            // Parse item-level encodings: dd-{id}-repeat-1-color-opacity
            const afterNum = itemId.substring(itemId.indexOf(`-${n}`) + `-${n}`.length + 1)
            const itemEncs = parseEncodings(afterNum.split("-").filter(p => p))
            
            return { n, xml: el.outerHTML, geom: getGeom(el, vbW, vbH), encs: itemEncs, itemId }
          }),
          maxCount: idxEls.length,
          encs: [{ type: "repeat-indexed" }, ...additionalEncs],
        })
        processedEls.add(group)
        group.remove()
        continue
      }
    }
    
    // Check for size group: must have dd-{id}-size-min and dd-{id}-size-max children
    const sMin = group.querySelector(`[id='dd-${id}-size-min']`)
    const sMax = group.querySelector(`[id='dd-${id}-size-max']`)
    
    if (sMin && sMax) {
      // Props on the group (everything except "size")
      const additionalEncs = parseEncodings(propParts.filter(p => p !== "size"))
      
      // Look for optional anchor point marker
      const anchor = group.querySelector(`[id='dd-${id}-anchor']`)
      const anchorGeom = anchor ? getGeom(anchor, vbW, vbH) : null
      
      slots.push({
        id: groupId,
        type: "size-range",
        startXML: sMin.outerHTML,
        endXML: sMax.outerHTML,
        startGeom: getGeom(sMin, vbW, vbH),
        endGeom: getGeom(sMax, vbW, vbH),
        anchor: anchorGeom ? { cx: anchorGeom.cx, cy: anchorGeom.cy } : null,
        encs: [{ type: "size-range" }, ...additionalEncs],
      })
      processedEls.add(group)
      group.remove()
      continue
    }
  }

  // 2. Single elements: dd-{id}-{prop1}-{prop2}
  for (const el of [...svgEl.querySelectorAll("[id^='dd-']")]) {
    if (processedEls.has(el)) continue
    
    const fullId = el.getAttribute("id")
    if (!fullId) continue
    
    // Skip size-min/max markers
    if (fullId.endsWith("-size-min") || fullId.endsWith("-size-max")) continue
    
    // Skip repeat items
    if (/repeat-\d+/.test(fullId)) continue
    
    // Parse: dd-{id}-{prop1}-{prop2}
    const parts = fullId.split("-").slice(1) // Remove "dd" prefix
    if (parts.length === 0) continue
    
    // Find where ID ends and props begin
    let idParts = []
    let propParts = []
    let foundProp = false
    for (const part of parts) {
      if (!foundProp && ["color", "colour", "opacity", "visible", "rotation", "text"].includes(part)) {
        foundProp = true
        propParts.push(part)
      } else if (foundProp) {
        propParts.push(part)
      } else {
        idParts.push(part)
      }
    }
    
    const encs = parseEncodings(propParts)
    if (encs.length === 0) continue
    
    slots.push({
      id: fullId,
      encs,
      xml: el.outerHTML,
      geom: getGeom(el, vbW, vbH),
      spacing: 20,
      type: "encoding"
    })
    el.remove()
  }

  const baseXML = new XMLSerializer().serializeToString(svgEl)
    .replace(/<\?xml[^?]*\?>\s*/, "").replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")
  return { viewBox: `${vbX} ${vbY} ${vbW} ${vbH}`, vbX, vbY, vbW, vbH, baseXML, slots }
}

// ── Convention guide ───────────────────────────────────────────────────────────

export const GUIDE = `SVG ENCODING STRUCTURE:

NAMING RULES:
  • IDs use underscores: focus_mood, coffee_count ✓
  • Hyphens separate ID from properties: dd-{id}-{prop1}-{prop2}
  • Don't use hyphens in IDs (ambiguous): focus-mood ✗

SINGLE ELEMENTS:
  dd-{id}-{prop1}-{prop2}-...
  
  Properties: color, opacity, visible, rotation
  
  Examples:
    dd-mood-color               ← one property
    dd-focus_level-opacity      ← ID with underscore
    dd-activity-color-opacity   ← two properties

SIZE RANGES (must be in a group):
  <g id="dd-{id}-{prop1}-{prop2}-...">
    <element id="dd-{id}-size-min" ... />
    <element id="dd-{id}-size-max" ... />
  </g>
  
  • Props on the group apply to the whole group (color, opacity, etc.)
  • Size is determined by the min/max elements
  • If size elements aren't in a group, they're ignored
  
  Examples:
    <g id="dd-focus_mood">                    ← size only
      <circle id="dd-focus_mood-size-min" ... />
      <circle id="dd-focus_mood-size-max" ... />
    </g>
    
    <g id="dd-distraction-color">             ← size + color
      <rect id="dd-distraction-size-min" ... />
      <rect id="dd-distraction-size-max" ... />
    </g>
    
    <g id="dd-energy-color-opacity">          ← size + color + opacity
      <ellipse id="dd-energy-size-min" ... />
      <ellipse id="dd-energy-size-max" ... />
    </g>

REPEATS (must be in a group):
  <g id="dd-{id}-repeat-{prop1}-{prop2}-...">
    <element id="dd-{id}-repeat-1" ... />
    <element id="dd-{id}-repeat-2" ... />
    <element id="dd-{id}-repeat-3" ... />
    ...
  </g>
  
  • Props on the group are applied to each repeat element
  • Items are activated based on count (count=3 shows items 1, 2, 3)
  • Item-level overrides: add props to individual items
  
  Examples:
    <g id="dd-coffee-repeat">                 ← count only
      <circle id="dd-coffee-repeat-1" ... />
      <circle id="dd-coffee-repeat-2" ... />
    </g>
    
    <g id="dd-meetings-repeat-color">         ← count + color on all items
      <rect id="dd-meetings-repeat-1" ... />
      <rect id="dd-meetings-repeat-2" ... />
    </g>
    
    <g id="dd-tasks-repeat">                  ← item-level overrides
      <path id="dd-tasks-repeat-1-color" ... />        ← item 1 has own color
      <path id="dd-tasks-repeat-2-opacity" ... />      ← item 2 has own opacity
      <path id="dd-tasks-repeat-3-color-rotation" ... /> ← item 3 has color + rotation
    </g>

Figma workflow: Rename layer → File → Export → SVG`
