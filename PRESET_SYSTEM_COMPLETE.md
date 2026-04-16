# Preset System - Complete & Working ✅

**Status**: FULLY OPERATIONAL  
**Date**: April 16, 2026

## What Works

### ✅ Automatic Preset Discovery
- Presets automatically discovered from `/src/presets/*/preset.json`
- No manual imports needed
- Just add a folder with `preset.json` and it appears in the dropdown

### ✅ Complete Preset Loading
1. **Data columns** - Auto-loads with types and colors
2. **Stamps** - SVG files with dd- layers load automatically
3. **Canvas** - Background SVG for path layouts (optional)
4. **Assignments** - Slot→encoder→column mappings pre-configured

### ✅ Asset Loading
- Uses Vite's `import.meta.glob` for efficient bundling
- SVG files loaded as raw text at build time
- No dynamic import issues

### ✅ Assignment Mapping
- Preset assignments use SVG layer IDs (e.g., `dd-type-swap`)
- System automatically maps to internal slot IDs
- All 6 encoders working: swap, color, visible, rotation, size, etc.

## How to Use

### Load a Demo Preset
1. Select "sample" tab
2. Choose preset from dropdown (e.g., "👥 Week 40: New People (Giorgia)")
3. Data columns, stamps, and assignments auto-load
4. Switch to "② assign" tab to see the visualization

### Apply Preset to Your Data
1. Select "upload" tab
2. Upload your CSV file
3. Scroll down to "Apply Visualization Preset"
4. Choose a preset
5. Click "Apply Preset"
6. Your data visualized with the preset's design!

## Creating New Presets

### Folder Structure
```
src/presets/my-preset/
├── preset.json           # Configuration (required)
├── stamps/
│   ├── icon1.svg        # Stamp with dd- layers
│   └── icon2.svg
└── canvas.svg           # Optional canvas for path layout
```

### preset.json Template
```json
{
  "id": "my-preset",
  "name": "My Amazing Preset",
  "emoji": "🎨",
  "description": "What this preset visualizes",
  "author": "Your Name",
  
  "data": {
    "source": "generated",
    "numRows": 20,
    "columns": [
      {
        "name": "category",
        "type": "category",
        "options": "a,b,c",
        "colors": "#ff0000,#00ff00,#0000ff"
      },
      {
        "name": "value",
        "type": "number",
        "min": 0,
        "max": 100
      }
    ]
  },
  
  "stamps": [
    {
      "file": "stamps/icon1.svg",
      "name": "Icon",
      "pathConfig": {
        "enabled": false,
        "pathAssignments": []
      }
    }
  ],
  
  "canvas": null,
  
  "assignments": {
    "dd-category-swap": {
      "swap": {
        "col": "category"
      }
    },
    "dd-value-size": {
      "size": {
        "col": "value",
        "config": {
          "min": 10,
          "max": 50
        }
      }
    }
  },
  
  "layout": {
    "type": "grid",
    "cols": 5
  }
}
```

### SVG Layer Naming
Stamps must use `dd-` prefix for layers:
- `dd-{name}-color` - Color encoder
- `dd-{name}-size` - Size encoder
- `dd-{name}-opacity` - Opacity encoder
- `dd-{name}-rotation` - Rotation encoder
- `dd-{name}-visible` - Visibility encoder
- `dd-{name}-text` - Text content
- `dd-{name}-swap` - Swap between variants

**Example:**
```xml
<svg>
  <g id="dd-type-swap">
    <circle id="dd-type-swap-a" r="10"/>
    <rect id="dd-type-swap-b" width="20" height="20"/>
  </g>
  <rect id="dd-category-color" fill="#ccc"/>
</svg>
```

## Technical Details

### Key Files Modified
- `src/presets/loader.js` - Auto-discovery and asset loading
- `src/components/DataPanel.jsx` - Preset UI and loading logic
- `src/components/VisualisePanel.jsx` - Canvas state from props
- `src/App.jsx` - Canvas state lifted to app level

### How It Works
1. **Discovery**: `import.meta.glob('./*/preset.json')` finds all presets
2. **Asset Loading**: `import.meta.glob('./*/**/*.svg', {as: 'raw'})` loads SVGs
3. **Stamp Parsing**: `parseStamp()` extracts dd- layers → slots
4. **Assignment Mapping**: Slot layer IDs match preset assignment keys
5. **State Management**: Canvas, stamps, dataMap in App.jsx, passed to children

### Why It Works
- **SVG layer IDs are stable** - `dd-type-swap` always means the same thing
- **No random ID mapping needed** - Slot IDs ARE the layer IDs
- **Preset assignments use layer IDs** - Direct mapping, no translation
- **Build-time loading** - All assets bundled, no runtime import issues

## Examples

### Week 40: New People (Giorgia)
- **Columns**: type, gender, where_met, introducer, supposed_to_know, spoke_more_than_intro
- **Encoders**: 
  - Type → swap (new/reunion icons)
  - Gender → color
  - Where met → swap (home/school)
  - Introducer → swap (me/them/friend)
  - Supposed to know → visible (show/hide)
  - Spoke more than intro → visible (show/hide)

## Troubleshooting

### Preset not appearing in dropdown?
- Check `preset.json` is in a folder under `/src/presets/`
- Folder name should match `id` in preset.json
- Restart dev server to pick up new files

### Stamps not loading?
- Check SVG file path in `preset.json` matches actual file
- Folder name in path must match preset ID
- SVG must be valid XML

### Assignments not working?
- Check slot IDs in assignments match SVG layer IDs exactly
- Layer IDs must start with `dd-`
- Column names must match data columns exactly

### Canvas not loading?
- Canvas is optional - can be `null`
- If specified, file must exist in preset folder
- Canvas SVG should have paths for path layout

## Next Steps

✅ System is production-ready!

**Possible Enhancements:**
- [ ] Preset export (save current state as preset)
- [ ] Preset gallery with previews
- [ ] Preset validation (check for missing files)
- [ ] Preset templates (starter presets)
- [ ] Community preset repository
- [ ] Preset versioning
- [ ] Preset marketplace

## Conclusion

The preset system is **complete, tested, and working perfectly**! 

You can now:
1. Load demo presets with full visualizations
2. Apply presets to your own CSV data
3. Create new presets by adding folders
4. Share presets as self-contained packages

No manual configuration needed - just drop in a folder with `preset.json` and SVG files! 🎉
