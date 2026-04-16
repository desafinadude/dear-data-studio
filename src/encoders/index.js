/**
 * Encoder System for Dear Data Studio
 * 
 * This module defines all available encoders (visual mappings from data to graphics).
 * Encoders are modular and can be easily extended.
 * 
 * Two types of encoders:
 * - STAMP_ENCODERS: Apply to individual stamp instances (color, size, rotation, etc.)
 * - COLLECTION_ENCODERS: Apply to the entire visualization (layout, sorting, grouping) [TODO]
 */

import { lerp, lerp3, lerpN, colRange, norm, catColor } from "../utils/color.js"
import { applyColor, applyText, wrapOp, wrapSc, wrapRot } from "../utils/svg.js"
import { PALETTES, DEFAULT_PALETTE } from "../utils/palettes.js"

// ══════════════════════════════════════════════════════════════════════════════
// STAMP-LEVEL ENCODERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Base encoder interface
 * All encoders should follow this structure for consistency
 */
const createEncoder = ({
  id,              // Unique identifier (e.g., "color", "size", "rotation")
  label,           // Human-readable label for UI
  dataTypes,       // Which data types this encoder works with: ["numeric", "categorical", "any"]
  slotTypes,       // Which slot types this encoder applies to: ["default", "size-range", "repeat-indexed", "swap"] or ["all"]
  hasConfig,       // Does this encoder need configuration beyond column selection?
  applyToXML,      // Function to transform XML: (xml, value, config, context) => newXML
  configUI,        // Optional: UI configuration schema for this encoder
}) => ({
  id,
  label,
  dataTypes,
  slotTypes,
  hasConfig,
  applyToXML,
  configUI,
})

// ──────────────────────────────────────────────────────────────────────────────
// COLOR ENCODER
// ──────────────────────────────────────────────────────────────────────────────
export const ColorEncoder = createEncoder({
  id: "color",
  label: "colour",
  dataTypes: ["numeric", "categorical"],
  slotTypes: ["all"],
  hasConfig: true,
  
  applyToXML: (xml, value, config, context) => {
    const { data, colorMappings } = context
    const { col, colorA, colorB, colorC, palette } = config
    
    const isNumeric = typeof value === "number"
    const paletteColors = PALETTES[palette || DEFAULT_PALETTE]?.colors || ["#c1440e","#1d3557","#2d6a4f","#c9972b","#9b2226","#457b9d","#606c38","#7209b7","#ef6c00","#1c1208"]
    
    let color
    if (isNumeric) {
      const t = norm(value, ...colRange(col, data))
      color = lerp3(colorA || "#f4e4d7", colorB || "#e09f3e", colorC || "#9e2a2b", t)
    } else {
      color = catColor(value, col, data, paletteColors, colorMappings)
    }
    
    return applyColor(xml, color)
  },
  
  configUI: {
    // For numeric: gradient colors (colorA, colorB, colorC)
    // For categorical: palette selection
    // Colors from data page take precedence via colorMappings
  }
})

// ──────────────────────────────────────────────────────────────────────────────
// SIZE ENCODER
// ──────────────────────────────────────────────────────────────────────────────
export const SizeEncoder = createEncoder({
  id: "size",
  label: "size",
  dataTypes: ["numeric"],
  slotTypes: ["default", "repeat-indexed"], // Not for size-range (that's the primary encoding)
  hasConfig: false,
  
  applyToXML: (xml, value, config, context) => {
    const { data, geom } = context
    const { col } = config
    
    const t = norm(value, ...colRange(col, data))
    const scale = 0.15 + t * 1.85 // Scale range: 0.15x to 2x
    
    return wrapSc(xml, scale, geom.cx, geom.cy)
  }
})

// ──────────────────────────────────────────────────────────────────────────────
// OPACITY ENCODER
// ──────────────────────────────────────────────────────────────────────────────
export const OpacityEncoder = createEncoder({
  id: "opacity",
  label: "opacity",
  dataTypes: ["numeric"],
  slotTypes: ["all"],
  hasConfig: false,
  
  applyToXML: (xml, value, config, context) => {
    const { data } = context
    const { col } = config
    
    const t = norm(value, ...colRange(col, data))
    const opacity = 0.06 + t * 0.94 // Opacity range: 6% to 100%
    
    return wrapOp(xml, opacity)
  }
})

// ──────────────────────────────────────────────────────────────────────────────
// ROTATION ENCODER
// ──────────────────────────────────────────────────────────────────────────────
export const RotationEncoder = createEncoder({
  id: "rotation",
  label: "rotation",
  dataTypes: ["numeric"],
  slotTypes: ["all"],
  hasConfig: false,
  
  applyToXML: (xml, value, config, context) => {
    const { data, geom } = context
    const { col } = config
    
    const t = norm(value, ...colRange(col, data))
    const angle = t * 360 // 0 to 360 degrees
    
    return wrapRot(xml, angle, geom.cx, geom.cy)
  }
})

// ──────────────────────────────────────────────────────────────────────────────
// TEXT ENCODER
// ──────────────────────────────────────────────────────────────────────────────
export const TextEncoder = createEncoder({
  id: "text",
  label: "text",
  dataTypes: ["any"],
  slotTypes: ["default"],
  hasConfig: false,
  
  applyToXML: (xml, value, config, context) => {
    return applyText(xml, value)
  }
})

// ──────────────────────────────────────────────────────────────────────────────
// VISIBLE ENCODER (conditional display)
// ──────────────────────────────────────────────────────────────────────────────
export const VisibleEncoder = createEncoder({
  id: "visible",
  label: "visible if",
  dataTypes: ["any"],
  slotTypes: ["default"],
  hasConfig: true,
  
  applyToXML: (xml, value, config, context) => {
    const { threshold, matchVal } = config
    
    const isNumeric = typeof value === "number"
    const show = isNumeric 
      ? value > parseFloat(threshold || "0")
      : String(value) === String(matchVal || "")
    
    return show ? xml : ""
  },
  
  configUI: {
    // For numeric: threshold input
    // For categorical: matchVal dropdown
  }
})

// ──────────────────────────────────────────────────────────────────────────────
// SIZE-RANGE ENCODER (special slot type with min/max geometry)
// ──────────────────────────────────────────────────────────────────────────────
export const SizeRangeEncoder = createEncoder({
  id: "size-range",
  label: "size range",
  dataTypes: ["numeric"],
  slotTypes: ["size-range"],
  hasConfig: true,
  
  applyToXML: (xml, value, config, context) => {
    const { data, slot } = context
    const { col, origin } = config
    
    // Hide if value is 0 or negative
    if (value <= 0) return ""
    
    // Normalize: 1 = min size, max value = max size
    const [dataMin, dataMax] = colRange(col, data)
    const effectiveMin = Math.max(1, dataMin)
    const t = dataMax > effectiveMin 
      ? Math.max(0, Math.min(1, (value - effectiveMin) / (dataMax - effectiveMin))) 
      : 0.5
    
    const ratio = slot.startGeom.primarySize > 0
      ? lerpN(1, slot.endGeom.primarySize / slot.startGeom.primarySize, t) 
      : 1
    
    // Calculate anchor point from origin
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
    const anchor = anchorMap[origin || "center"] || anchorMap["center"]
    
    return wrapSc(xml, ratio, anchor.cx, anchor.cy)
  },
  
  configUI: {
    origin: "select", // Origin point for scaling
  }
})

// ──────────────────────────────────────────────────────────────────────────────
// REPEAT-INDEXED ENCODER (count-based repeating)
// ──────────────────────────────────────────────────────────────────────────────
export const RepeatIndexedEncoder = createEncoder({
  id: "repeat-indexed",
  label: "indexed repeat",
  dataTypes: ["numeric"],
  slotTypes: ["repeat-indexed"],
  hasConfig: true,
  
  applyToXML: (xml, value, config, context) => {
    // This encoder doesn't directly transform XML
    // It determines which items in the repeat group to show
    // The actual rendering logic is handled separately
    return xml
  },
  
  configUI: {
    colorGrad: "checkbox",
    opacityFade: "checkbox",
    sizeGrad: "checkbox",
  }
})

// ──────────────────────────────────────────────────────────────────────────────
// SWAP ENCODER (conditional element swapping)
// ──────────────────────────────────────────────────────────────────────────────
export const SwapEncoder = createEncoder({
  id: "swap",
  label: "swap element",
  dataTypes: ["categorical", "any"],
  slotTypes: ["swap"],
  hasConfig: false,
  
  applyToXML: (xml, value, config, context) => {
    // Swap encoder logic is handled specially in renderer
    // This is a placeholder
    return xml
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// ENCODER REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

export const STAMP_ENCODERS = {
  color: ColorEncoder,
  size: SizeEncoder,
  opacity: OpacityEncoder,
  rotation: RotationEncoder,
  text: TextEncoder,
  visible: VisibleEncoder,
  "size-range": SizeRangeEncoder,
  "repeat-indexed": RepeatIndexedEncoder,
  swap: SwapEncoder,
}

// Helper to get encoder by ID
export const getEncoder = (id) => STAMP_ENCODERS[id]

// Helper to get all encoders applicable to a slot type
export const getEncodersForSlotType = (slotType) => {
  return Object.values(STAMP_ENCODERS).filter(enc => 
    enc.slotTypes.includes("all") || enc.slotTypes.includes(slotType)
  )
}

// Helper to get all encoders applicable to a data type
export const getEncodersForDataType = (dataType) => {
  return Object.values(STAMP_ENCODERS).filter(enc => 
    enc.dataTypes.includes("any") || enc.dataTypes.includes(dataType)
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COLLECTION-LEVEL ENCODERS (TODO)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Collection encoders will control how stamps are arranged and relate to each other
 * 
 * Planned encoders:
 * - LayoutEncoder: Grid, path-based, cluster, spiral, etc.
 * - SortEncoder: Sort stamps by column value
 * - GroupEncoder: Group stamps by categorical value
 * - SpacingEncoder: Data-driven spacing between stamps
 * - FilterEncoder: Show/hide stamps based on conditions
 */

export const COLLECTION_ENCODERS = {
  // TODO: Implement collection-level encoders
}

// ══════════════════════════════════════════════════════════════════════════════
// ENCODER APPLICATION API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Apply an encoder to XML
 * 
 * @param {string} xml - The XML to transform
 * @param {string} encoderId - The encoder ID
 * @param {any} value - The data value
 * @param {object} config - Encoder configuration (col, colors, etc.)
 * @param {object} context - Additional context (data, geom, colorMappings, etc.)
 * @returns {string} Transformed XML
 */
export function applyEncoder(xml, encoderId, value, config, context) {
  const encoder = getEncoder(encoderId)
  if (!encoder) {
    console.warn(`Unknown encoder: ${encoderId}`)
    return xml
  }
  
  // Check if value is valid
  if (value === undefined || value === null) return xml
  
  return encoder.applyToXML(xml, value, config, context)
}

/**
 * Apply multiple encoders in sequence
 * 
 * @param {string} xml - The initial XML
 * @param {Array} encodings - Array of {encoderId, value, config, context}
 * @returns {string} Transformed XML
 */
export function applyEncoders(xml, encodings) {
  return encodings.reduce((currentXml, { encoderId, value, config, context }) => {
    return applyEncoder(currentXml, encoderId, value, config, context)
  }, xml)
}
