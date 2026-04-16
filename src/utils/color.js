export const h2r = h => {
  const s = (h || "#888").replace("#", "")
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}

export const lerp = (a, b, t) => {
  const [ar, ag, ab] = h2r(a), [br, bg, bb] = h2r(b)
  return "#" + [ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]
    .map(v => Math.round(v).toString(16).padStart(2, "0")).join("")
}

export const lerp3 = (a, b, c, t) => {
  // 3-color gradient: 0 = a, 0.5 = b, 1 = c
  if (t <= 0.5) return lerp(a, b, t * 2)
  return lerp(b, c, (t - 0.5) * 2)
}

export const colRange = (col, data) => {
  const ns = data.map(r => r[col]).filter(v => typeof v === "number")
  return ns.length ? [Math.min(...ns), Math.max(...ns)] : [0, 1]
}

export const norm = (v, lo, hi) => hi > lo ? Math.max(0, Math.min(1, (v - lo) / (hi - lo))) : 0.5

export const lerpN = (a, b, t) => a + (b - a) * t

export const isNumCol = (col, data) => {
  if (!col || !data?.length) return false
  // Check if all non-null/undefined values in the column are numbers
  const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== "")
  return values.length > 0 && values.every(v => typeof v === "number")
}

export const catColor = (val, col, data, pal, colorMappings = {}) => {
  // Use predefined color mapping if available
  if (colorMappings[col] && colorMappings[col][val]) {
    return colorMappings[col][val]
  }
  // Fallback to palette
  const cats = [...new Set(data.map(r => r[col]))]
  return pal[cats.indexOf(val) % pal.length]
}
