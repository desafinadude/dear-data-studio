# Encoder System Architecture

## Overview

The encoder system provides a modular, extensible way to define visual mappings from data to graphics in Dear Data Studio. All encoders are centralized in `/src/encoders/index.js` for easy maintenance and expansion.

## Architecture

### Encoder Levels

1. **Stamp-level encoders** (✅ Implemented)
   - Apply to individual stamp instances
   - Transform visual properties based on data values
   - Examples: color, size, rotation, opacity

2. **Collection-level encoders** (⏳ Planned)
   - Apply to the entire visualization
   - Control how stamps relate to each other
   - Examples: layout, sorting, grouping, spacing

### Encoder Structure

Each encoder follows a consistent interface:

```javascript
{
  id: string              // Unique identifier (e.g., "color", "size")
  label: string           // Human-readable label for UI
  dataTypes: string[]     // ["numeric", "categorical", "any"]
  slotTypes: string[]     // ["default", "size-range", "repeat-indexed", "swap", "all"]
  hasConfig: boolean      // Does it need extra configuration?
  applyToXML: function    // The transformation logic
  configUI: object        // Optional UI configuration schema
}
```

## Current Stamp Encoders

### 1. ColorEncoder
- **Data types**: numeric, categorical
- **Applies to**: all slot types
- **Logic**: 
  - Numeric → 3-color gradient (colorA → colorB → colorC)
  - Categorical → palette colors or data page color mappings
- **Config**: colorA, colorB, colorC, palette

### 2. SizeEncoder
- **Data types**: numeric only
- **Applies to**: default, repeat-indexed slots
- **Logic**: Scale from 0.15x to 2x based on normalized value
- **Config**: none

### 3. OpacityEncoder
- **Data types**: numeric only
- **Applies to**: all slot types
- **Logic**: Opacity from 6% to 100% based on normalized value
- **Config**: none

### 4. RotationEncoder
- **Data types**: numeric only
- **Applies to**: all slot types
- **Logic**: Rotate 0° to 360° based on normalized value
- **Config**: none

### 5. TextEncoder
- **Data types**: any
- **Applies to**: default slots only
- **Logic**: Replace text content with data value
- **Config**: none

### 6. VisibleEncoder
- **Data types**: any
- **Applies to**: default slots only
- **Logic**: 
  - Numeric → show if value > threshold
  - Categorical → show if value === matchVal
- **Config**: threshold (numeric), matchVal (categorical)

### 7. SizeRangeEncoder
- **Data types**: numeric only
- **Applies to**: size-range slots only
- **Logic**: Scale between min/max geometry based on data value
- **Config**: origin (anchor point for scaling)

### 8. RepeatIndexedEncoder
- **Data types**: numeric only
- **Applies to**: repeat-indexed slots only
- **Logic**: Show N items based on data value (up to maxCount)
- **Config**: colorGrad, opacityFade, sizeGrad (boolean flags)

### 9. SwapEncoder
- **Data types**: categorical, any
- **Applies to**: swap slots only
- **Logic**: Show different SVG variant based on data value
- **Config**: none

## Usage

### In Renderer

```javascript
import { applyEncoder, getEncoder } from '../encoders/index.js'

// Apply single encoder
const transformedXML = applyEncoder(
  xml,
  'color',
  dataValue,
  { col: 'columnName', colorA: '#fff', colorB: '#000' },
  { data, geom, colorMappings }
)

// Apply multiple encoders
import { applyEncoders } from '../encoders/index.js'

const result = applyEncoders(xml, [
  { encoderId: 'color', value: row.category, config: cfg1, context: ctx },
  { encoderId: 'size', value: row.amount, config: cfg2, context: ctx },
  { encoderId: 'rotation', value: row.angle, config: cfg3, context: ctx },
])
```

### In UI

```javascript
import { STAMP_ENCODERS, getEncodersForSlotType } from '../encoders/index.js'

// Get all encoders for a specific slot type
const availableEncoders = getEncodersForSlotType('size-range')

// Get encoder metadata
const colorEncoder = STAMP_ENCODERS.color
console.log(colorEncoder.label) // "colour"
console.log(colorEncoder.dataTypes) // ["numeric", "categorical"]
```

## Adding New Encoders

To add a new encoder:

1. **Define the encoder** in `/src/encoders/index.js`:

```javascript
export const MyNewEncoder = createEncoder({
  id: "my-new-encoder",
  label: "My New Encoder",
  dataTypes: ["numeric"],
  slotTypes: ["default"],
  hasConfig: true,
  
  applyToXML: (xml, value, config, context) => {
    // Your transformation logic here
    return transformedXML
  },
  
  configUI: {
    // Optional UI configuration schema
    threshold: "number",
    mode: "select"
  }
})
```

2. **Register in STAMP_ENCODERS**:

```javascript
export const STAMP_ENCODERS = {
  // ... existing encoders
  "my-new-encoder": MyNewEncoder,
}
```

3. **Update UI** (if needed):
   - Add encoder to `SlotAssign.jsx` for configuration
   - Add label to `EL` object if custom label needed

4. **Update renderer** (if needed):
   - Add encoder application logic in `renderer.js`
   - Use `applyEncoder()` helper for consistency

## Future: Collection Encoders

Collection encoders will control visualization-wide behaviors:

### Planned Collection Encoders

1. **LayoutEncoder**
   - Grid layout with configurable columns/rows
   - Path-based layout (follow SVG path)
   - Cluster layout (group by similarity)
   - Spiral layout (Archimedean spiral)
   - Custom layout algorithms

2. **SortEncoder**
   - Sort stamps by column value (ascending/descending)
   - Multi-column sorting

3. **GroupEncoder**
   - Group stamps by categorical value
   - Visual grouping (spacing, separators)

4. **SpacingEncoder**
   - Data-driven spacing between stamps
   - Proportional to data value

5. **FilterEncoder**
   - Show/hide stamps based on conditions
   - Range filters, categorical filters

### Collection Encoder Structure (Draft)

```javascript
{
  id: "layout",
  label: "Layout",
  level: "collection",
  options: {
    type: "select", // grid, path, cluster, spiral
    // ... type-specific config
  },
  apply: (stamps, data, config) => {
    // Returns positioned stamps with transforms
    return positionedStamps
  }
}
```

## Benefits

1. **Modularity**: Each encoder is self-contained and reusable
2. **Extensibility**: Easy to add new encoders without touching core logic
3. **Maintainability**: All encoding logic in one place
4. **Testability**: Encoders can be unit tested independently
5. **Documentation**: Clear interface and behavior for each encoder
6. **Type safety**: Encoders declare their compatible data/slot types

## Migration Notes

The current implementation in `renderer.js` can be gradually refactored to use these encoders. The encoder module is designed to be a superset of existing functionality, so migration can happen incrementally without breaking changes.
