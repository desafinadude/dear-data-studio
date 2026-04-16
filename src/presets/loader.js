/**
 * Preset System for Dear Data Studio
 * 
 * This module handles loading and managing visualization presets.
 * Each preset is a self-contained folder with:
 * - preset.json: Configuration and metadata
 * - stamps/*.svg: Stamp SVG files (optional)
 * - canvas.svg: Canvas SVG file (optional)
 * - data.csv: Sample data CSV (optional, if not generated)
 * 
 * Presets can be:
 * 1. Loaded as complete visualizations (data + stamps + assignments)
 * 2. Applied to user-uploaded CSV data (stamps + assignments only)
 */

// Automatically discover all preset.json files in subdirectories
const presetModules = import.meta.glob('./*/preset.json', { eager: true })

// Automatically discover all SVG files (stamps and canvas) in subdirectories
const svgModules = import.meta.glob('./*/**/*.svg', { eager: true, as: 'raw' })

// ══════════════════════════════════════════════════════════════════════════════
// PRESET REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

// Extract preset objects from imported modules
export const PRESET_REGISTRY = Object.values(presetModules).map(module => module.default)

// ══════════════════════════════════════════════════════════════════════════════
// PRESET LOADER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get all available presets
 */
export function getPresets() {
  return PRESET_REGISTRY
}

/**
 * Get a preset by ID
 */
export function getPreset(id) {
  return PRESET_REGISTRY.find(p => p.id === id)
}

/**
 * Load stamp SVG files for a preset
 * @param {string} presetId - The preset ID
 * @returns {Promise<Array>} Array of {file, name, svgText}
 */
export async function loadPresetStamps(presetId) {
  const preset = getPreset(presetId)
  if (!preset || !preset.stamps || preset.stamps.length === 0) {
    return []
  }

  const stamps = preset.stamps.map((stamp) => {
    try {
      // Build the path to match the glob pattern
      const svgPath = `./${presetId}/${stamp.file}`
      const svgText = svgModules[svgPath]
      
      if (!svgText) {
        console.warn(`Could not find stamp: ${svgPath}`)
        console.log('Available SVG paths:', Object.keys(svgModules))
        return null
      }
      
      return {
        ...stamp,
        svgText
      }
    } catch (err) {
      console.warn(`Could not load stamp: ${stamp.file}`, err)
      return null
    }
  })

  return stamps.filter(Boolean)
}

/**
 * Load canvas SVG for a preset
 * @param {string} presetId - The preset ID
 * @returns {Promise<string|null>} Canvas SVG text or null
 */
export async function loadPresetCanvas(presetId) {
  const preset = getPreset(presetId)
  if (!preset || !preset.canvas || !preset.canvas.file) {
    return null
  }

  try {
    const svgPath = `./${presetId}/${preset.canvas.file}`
    const svgText = svgModules[svgPath]
    
    if (!svgText) {
      console.warn(`Could not find canvas: ${svgPath}`)
      return null
    }
    
    return svgText
  } catch (err) {
    console.warn(`Could not load canvas: ${preset.canvas.file}`, err)
    return null
  }
}

/**
 * Load CSV data for a preset
 * @param {string} presetId - The preset ID
 * @returns {Promise<string|null>} CSV text or null
 */
export async function loadPresetCSV(presetId) {
  const preset = getPreset(presetId)
  if (!preset || !preset.data || preset.data.source !== 'csv') {
    return null
  }

  try {
    const module = await import(`./${presetId}/${preset.data.source}?raw`)
    return module.default
  } catch (err) {
    console.warn(`Could not load CSV: ${preset.data.source}`, err)
    return null
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DATA GENERATION (for generated presets)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate random data based on preset column definitions
 * @param {Array} columns - Column definitions from preset.json
 * @param {number} numRows - Number of rows to generate
 * @returns {Array} Generated data rows
 */
export function generatePresetData(columns, numRows) {
  return Array.from({ length: numRows }, (_, ri) => {
    const row = {}
    columns.forEach(col => {
      if (!col.name.trim()) return
      
      if (col.type === "number") {
        const min = +(col.min || 0)
        const max = +(col.max || 10)
        row[col.name] = Math.floor(Math.random() * (max - min + 1)) + min
      } else if (col.type === "category") {
        const opts = col.options.split(",").map(s => s.trim()).filter(Boolean)
        if (opts.length > 0) {
          row[col.name] = opts.length === numRows 
            ? opts[ri] 
            : opts[Math.floor(Math.random() * opts.length)]
        } else {
          row[col.name] = `item ${ri + 1}`
        }
      }
    })
    return row
  })
}

/**
 * Load complete preset (data + stamps + canvas + assignments)
 * @param {string} presetId - The preset ID
 * @returns {Promise<Object>} Complete preset with all assets loaded
 */
export async function loadCompletePreset(presetId) {
  const preset = getPreset(presetId)
  if (!preset) {
    throw new Error(`Preset not found: ${presetId}`)
  }

  // Load data
  let generatedData = null
  if (preset.data.source === 'generated') {
    generatedData = generatePresetData(preset.data.columns, preset.data.numRows)
  } else if (preset.data.source === 'csv') {
    const csvText = await loadPresetCSV(presetId)
    // CSV will be parsed by Papa Parse in the component
    generatedData = csvText
  }

  // Load stamps
  const stamps = await loadPresetStamps(presetId)

  // Load canvas
  const canvas = await loadPresetCanvas(presetId)

  return {
    ...preset,
    generatedData,  // Keep preset.data intact, add generatedData separately
    stamps,
    canvas,
  }
}

/**
 * Apply preset stamps and assignments to existing data
 * This allows users to upload their own CSV and use a preset's visualization
 * @param {string} presetId - The preset ID
 * @param {Array} userData - User's data
 * @returns {Promise<Object>} Stamps and assignments to apply
 */
export async function applyPresetToData(presetId, userData) {
  const preset = getPreset(presetId)
  if (!preset) {
    throw new Error(`Preset not found: ${presetId}`)
  }

  // Load stamps and assignments only (no data)
  const stamps = await loadPresetStamps(presetId)
  const canvas = await loadPresetCanvas(presetId)

  return {
    stamps,
    canvas,
    assignments: preset.assignments,
    layout: preset.layout,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LEGACY SUPPORT (for backward compatibility)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Convert preset format to legacy PRESETS array format
 * Used for backward compatibility with existing code
 */
export const PRESETS = PRESET_REGISTRY.map(preset => ({
  name: preset.name,
  emoji: preset.emoji,
  numRows: preset.data.numRows,
  vars: preset.data.columns.map((col, i) => ({
    id: i,
    name: col.name,
    type: col.type,
    options: col.options || "",
    has_color: col.has_color,
    colors: col.colors || "",
    min: col.min,
    max: col.max,
  }))
}))

/**
 * Legacy data generation function
 * Kept for backward compatibility
 */
export function genData(vars, n) {
  const columns = vars.map(v => ({
    name: v.name,
    type: v.type,
    options: v.options,
    min: v.min,
    max: v.max,
  }))
  return generatePresetData(columns, n)
}
