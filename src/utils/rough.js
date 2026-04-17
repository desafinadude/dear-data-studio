import rough from 'roughjs/bundled/rough.esm.js'

/**
 * Apply rough.js styling to SVG elements
 * Converts clean geometric SVG to hand-drawn style
 */
export function applyRoughness(svgString, config) {
  if (!config.enabled) return svgString
  
  try {
    // Parse the SVG
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgString, 'image/svg+xml')
    const svgEl = doc.querySelector('svg')
    
    if (!svgEl) return svgString
    
    // Create rough.js instance
    const rc = rough.svg(svgEl)
    
    // Configure rough.js options
    const roughOptions = {
      roughness: config.roughness || 1,
      bowing: config.bowing || 1,
      strokeWidth: config.strokeWidth || 1,
      fillStyle: config.fillStyle || 'hachure',
      fillWeight: config.fillWeight || 1,
      hachureAngle: config.hachureAngle || -41,
      hachureGap: config.hachureGap || 4,
      curveStepCount: 9,
      curveFitting: 0.95,
      simplification: 0
    }
    
    // Process all shape elements
    const shapes = svgEl.querySelectorAll('rect, circle, ellipse, line, polygon, polyline, path')
    
    shapes.forEach(shape => {
      try {
        let roughElement = null
        const fill = shape.getAttribute('fill') || 'none'
        const stroke = shape.getAttribute('stroke') || 'black'
        const strokeWidth = parseFloat(shape.getAttribute('stroke-width') || 1)
        
        const opts = {
          ...roughOptions,
          fill: fill !== 'none' ? fill : undefined,
          stroke: stroke !== 'none' ? stroke : undefined,
          strokeWidth: strokeWidth
        }
        
        const tagName = shape.tagName.toLowerCase()
        
        if (tagName === 'rect') {
          const x = parseFloat(shape.getAttribute('x') || 0)
          const y = parseFloat(shape.getAttribute('y') || 0)
          const width = parseFloat(shape.getAttribute('width') || 0)
          const height = parseFloat(shape.getAttribute('height') || 0)
          roughElement = rc.rectangle(x, y, width, height, opts)
        } else if (tagName === 'circle') {
          const cx = parseFloat(shape.getAttribute('cx') || 0)
          const cy = parseFloat(shape.getAttribute('cy') || 0)
          const r = parseFloat(shape.getAttribute('r') || 0)
          roughElement = rc.circle(cx, cy, r * 2, opts)
        } else if (tagName === 'ellipse') {
          const cx = parseFloat(shape.getAttribute('cx') || 0)
          const cy = parseFloat(shape.getAttribute('cy') || 0)
          const rx = parseFloat(shape.getAttribute('rx') || 0)
          const ry = parseFloat(shape.getAttribute('ry') || 0)
          roughElement = rc.ellipse(cx, cy, rx * 2, ry * 2, opts)
        } else if (tagName === 'line') {
          const x1 = parseFloat(shape.getAttribute('x1') || 0)
          const y1 = parseFloat(shape.getAttribute('y1') || 0)
          const x2 = parseFloat(shape.getAttribute('x2') || 0)
          const y2 = parseFloat(shape.getAttribute('y2') || 0)
          roughElement = rc.line(x1, y1, x2, y2, opts)
        } else if (tagName === 'polygon' || tagName === 'polyline') {
          const points = shape.getAttribute('points')
          if (points) {
            const coords = points.trim().split(/[\s,]+/).map(Number)
            const vertices = []
            for (let i = 0; i < coords.length; i += 2) {
              vertices.push([coords[i], coords[i + 1]])
            }
            if (tagName === 'polygon') {
              roughElement = rc.polygon(vertices, opts)
            } else {
              roughElement = rc.linearPath(vertices, opts)
            }
          }
        } else if (tagName === 'path') {
          const d = shape.getAttribute('d')
          if (d) {
            roughElement = rc.path(d, opts)
          }
        }
        
        if (roughElement) {
          // Copy transform and other attributes
          const transform = shape.getAttribute('transform')
          if (transform) {
            roughElement.setAttribute('transform', transform)
          }
          
          // Replace the original element with the rough version
          shape.parentNode.replaceChild(roughElement, shape)
        }
      } catch (err) {
        console.warn('Failed to roughen element:', err)
      }
    })
    
    // Serialize back to string
    const serializer = new XMLSerializer()
    return serializer.serializeToString(doc)
  } catch (err) {
    console.error('Failed to apply roughness:', err)
    return svgString
  }
}
