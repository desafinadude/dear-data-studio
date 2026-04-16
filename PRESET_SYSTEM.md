# Preset System Implementation Summary

## ✅ What's Been Created

### 1. Folder Structure
```
src/presets/
├── loader.js                           # New preset loading system
├── index.js                            # Backward compatibility layer
├── README.md                           # Complete documentation
├── week-40-new-people/
│   ├── preset.json                     # Configuration
│   └── stamps/                         # (empty, ready for stamps)
└── distractions/
    └── preset.json                     # Configuration
```

### 2. Preset Configuration Format (preset.json)

Each preset now includes:
- **Metadata**: id, name, emoji, description, author
- **Data**: Column definitions with types, options, colors
- **Stamps**: Array of stamp files with path configurations
- **Canvas**: Optional canvas SVG for path layouts
- **Assignments**: Slot-to-column mappings (dataMap)
- **Layout**: Grid/path layout settings

### 3. New Capabilities

#### A. Complete Preset Loading
```javascript
import { loadCompletePreset } from './presets'

const preset = await loadCompletePreset('week-40-new-people')
// Returns: data, stamps, canvas, assignments - everything needed
```

#### B. Apply Preset to User Data
```javascript
import { applyPresetToData } from './presets'

// User uploads CSV
const userCSV = [...]

// Apply preset visualization to their data
const assets = await applyPresetToData('week-40-new-people', userCSV)
// Returns: stamps, canvas, assignments (no data - uses user's)
```

#### C. Backward Compatibility
```javascript
import { PRESETS, genData } from './presets'
// Old code still works - delegates to new system
```

## 📦 Preset Package Structure

Each preset is self-contained and shareable:

```
my-preset/
├── preset.json          # All configuration
├── stamps/              # SVG stamp files
│   ├── stamp1.svg
│   └── stamp2.svg
├── canvas.svg           # Optional path canvas
└── data.csv             # Optional sample CSV
```

**To share**: Zip the folder and send!
**To install**: Unzip into `src/presets/` and register in `loader.js`

## 🔄 Migration Path

### Phase 1 (Current)
- ✅ Folder structure created
- ✅ Loader system implemented
- ✅ Backward compatibility maintained
- ✅ Documentation complete

### Phase 2 (Next Steps)
- [ ] Update DataPanel to use new preset loader
- [ ] Add "Apply Preset" button for uploaded CSVs
- [ ] Load stamps/canvas from preset JSON
- [ ] Auto-apply assignments from preset
- [ ] Add preset preview/metadata in UI

### Phase 3 (Future)
- [ ] Preset marketplace/gallery
- [ ] Export current state as preset
- [ ] Preset versioning
- [ ] Community preset repository

## 🎯 Key Features

### 1. Self-Contained Presets
Everything needed for a visualization in one folder:
- Data schema OR CSV file
- Stamp SVGs with dd- layers
- Canvas SVG with paths
- Slot assignments (dataMap)
- Layout configuration

### 2. Flexible Data Sources
- **Generated**: Define columns, system generates random data
- **CSV**: Include sample CSV file
- **User Upload**: Apply preset to user's CSV

### 3. Complete State Capture
Presets save the entire visualization state:
- Which stamps to use
- How stamps are arranged (grid/path)
- What data maps to what slots
- Color assignments
- Path configurations

### 4. Shareable
- Zip folder = shareable preset pack
- Import/export presets easily
- Build preset libraries
- Community contributions

## 📚 Usage Examples

### Example 1: Load Demo Preset
```javascript
// In DataPanel.jsx
import { loadCompletePreset } from '../presets'

const handlePresetSelect = async (presetId) => {
  const preset = await loadCompletePreset(presetId)
  
  // Set data
  setDV(preset.data.columns)
  setCsv(preset.data)
  
  // Load stamps
  for (const stamp of preset.stamps) {
    loadStamp(stamp.svgText)
  }
  
  // Load canvas
  if (preset.canvas) {
    loadCanvas(preset.canvas)
  }
  
  // Apply assignments
  setDataMap(preset.assignments)
}
```

### Example 2: Apply Preset to User CSV
```javascript
// User uploads their own CSV
const handleCSVUpload = async (csvData) => {
  setCsv(csvData)
  
  // Show "Apply Preset" option
  const applyPreset = async (presetId) => {
    const assets = await applyPresetToData(presetId, csvData)
    
    // Load stamps and canvas
    for (const stamp of assets.stamps) {
      loadStamp(stamp.svgText)
    }
    
    if (assets.canvas) {
      loadCanvas(assets.canvas)
    }
    
    // Apply slot assignments
    setDataMap(assets.assignments)
  }
}
```

### Example 3: Create New Preset
```javascript
// Export current state as preset
const exportAsPreset = () => {
  const preset = {
    id: "my-new-preset",
    name: "My Visualization",
    emoji: "✨",
    data: {
      source: "generated",
      numRows: csv.length,
      columns: dvars
    },
    stamps: stamps.map(s => ({
      file: `stamps/${s.name}.svg`,
      name: s.name,
      pathConfig: s.pathConfig
    })),
    canvas: canvasSVG ? { file: "canvas.svg" } : null,
    assignments: dataMap,
    layout: layoutConfig
  }
  
  // Download as preset.json
  downloadJSON(preset, "preset.json")
}
```

## 🚀 Next Steps

To fully integrate this system, we need to:

1. **Update DataPanel.jsx**:
   - Use `loadCompletePreset()` when preset selected
   - Load stamps and canvas from preset
   - Apply assignments automatically

2. **Add Preset Application UI**:
   - "Apply Preset" button when CSV uploaded
   - Show preview of what preset includes
   - Confirm before replacing current state

3. **Add Preset Export**:
   - "Save as Preset" button
   - Package current state into preset format
   - Download preset folder as zip

4. **Enhance Preset Manager**:
   - Grid view of available presets
   - Preview thumbnails
   - Search/filter presets
   - Import preset from zip

## 📝 Benefits Achieved

1. **Modularity**: Each preset is independent
2. **Shareability**: Zip folder = shareable pack
3. **Completeness**: Entire visualization state saved
4. **Flexibility**: Works with generated or CSV data
5. **Compatibility**: Old code still works
6. **Extensibility**: Easy to add new presets
7. **Documentation**: Complete README for creators

The foundation is now in place for a powerful, shareable preset system!
