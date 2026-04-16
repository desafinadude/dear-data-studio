# Category Color Assignment Feature

## Overview
Added the ability to assign specific colors to categorical data values directly in the data generation phase. Colors are defined per-value and automatically applied throughout the visualization system.

## How It Works

### 1. Data Structure
Each categorical variable can now have a `colors` property:

```javascript
{
  name: "type",
  type: "category", 
  options: "new,reunion",
  colors: "#e09f3e,#c1440e"  // Comma-separated hex colors
}
```

### 2. Color Mappings
When data is generated, color mappings are created:

```javascript
colorMappings = {
  "type": {
    "new": "#e09f3e",
    "reunion": "#c1440e"
  },
  "gender": {
    "man": "#1d3557",
    "woman": "#9e2a2b",
    "nonbinary": "#2d6a4f"
  }
}
```

### 3. Automatic Application
When you assign a categorical column to a color encoding, the predefined colors are automatically used instead of the default palette.

## UI Features

### Data Panel (① data tab)

**Color Pickers for Each Option:**
- When you enter categorical options (e.g., `new,reunion`)
- Color pickers appear below for each value
- Click the color square to choose a color
- Default: `#888888` if not specified

**Visual Layout:**
```
[column name] [cat] [options field] [✕]
  🎨 new     🎨 reunion     🎨 other
```

### Presets with Colors
The "Week 40: New People" preset now includes predefined colors:
- **type**: new (#e09f3e), reunion (#c1440e)
- **gender**: man (#1d3557), woman (#9e2a2b), nonbinary (#2d6a4f)  
- **where_met**: school, work, bar, home, other (5 colors)
- **introducer**: them, friend, me, already_knew (4 colors)

## Behavior

### Priority Order
1. **User-defined colors** (from data panel) - highest priority
2. **Palette colors** (from assign panel) - fallback
3. **Random colors** - if neither defined

### Auto-generation
If you don't assign colors manually:
- System generates random colors from predefined palette
- Colors are assigned when you click "generate"
- Uses Dear Data Studio color palette

### Persistence
- Color mappings persist throughout the session
- Reloading data preserves color assignments
- Changing options updates color pickers dynamically

## Use Cases

### Scenario 1: Consistent Branding
```
1. Set up categories in data panel
2. Assign brand colors to each option
3. Generate data
4. Colors automatically apply to all visualizations
```

### Scenario 2: Semantic Colors
```
type column:
- "error" → red (#9e2a2b)
- "warning" → orange (#e09f3e)
- "success" → green (#2d6a4f)
- "info" → blue (#457b9d)
```

### Scenario 3: Data Collection Template
```
1. Define categories with colors
2. Download blank CSV template
3. Fill in data
4. Upload - colors automatically apply
```

## Technical Implementation

### Files Modified

**`/src/App.jsx`:**
- Added `colorMappings` state
- Passes to DataPanel and VisualisePanel

**`/src/components/DataPanel.jsx`:**
- Added color picker UI for categorical options
- Builds color mappings in `push()` function
- Generates random colors for missing assignments

**`/src/presets/index.js`:**
- Updated Week 40 preset with predefined colors
- Added `generateRandomColors()` helper (not exported yet)

**`/src/utils/color.js`:**
- Updated `catColor()` to accept and use `colorMappings`
- Falls back to palette if no mapping exists

**`/src/utils/renderer.js`:**
- Updated `renderInstance()` signature to accept `colorMappings`
- Updated `buildOutputSVG()` to accept and pass `colorMappings`
- Updated all `catColor()` calls to pass `colorMappings`
- Applied to all encoding types: size-range, repeat-indexed, swap, standard

**`/src/components/VisualisePanel.jsx`:**
- Accepts `colorMappings` prop
- Passes to `buildOutputSVG()` in useMemo

## Examples

### Example 1: Binary Categories
```javascript
{
  name: "completed",
  type: "category",
  options: "yes,no",
  colors: "#2d6a4f,#9e2a2b"  // Green for yes, red for no
}
```

### Example 2: Weather Data
```javascript
{
  name: "weather",
  type: "category",
  options: "sunny,rainy,cloudy,snowy",
  colors: "#ffd700,#4682b4,#b0c4de,#e0f2fe"  // Gold, steel blue, light blue, snow
}
```

### Example 3: Priority Levels
```javascript
{
  name: "priority",
  type: "category",
  options: "low,medium,high,urgent",
  colors: "#888888,#e09f3e,#c9972b,#9e2a2b"  // Gray to red gradient
}
```

## Benefits

✅ **Semantic meaning** - Colors can represent meaning (red=danger, green=success)
✅ **Consistency** - Same category always uses same color across all stamps
✅ **Control** - Designers choose exact colors, not random assignment
✅ **Presets** - Share data structures with predefined color schemes
✅ **Automatic** - Once defined, colors apply everywhere automatically
✅ **Fallback** - System still works if colors aren't defined

## Future Enhancements

Possible additions:
- Bulk color assignment (apply palette to all categories)
- Color scheme presets (complementary, analogous, etc.)
- Import/export color mappings
- Visual color harmony checker
- Accessibility contrast warnings

## Notes

- Colors must be hex format: `#RRGGBB`
- Case-insensitive matching: "New" matches "new"
- Whitespace normalized: "new person" → "new_person"
- Missing colors default to #888888 (gray)
- Extra colors (more than options) are ignored
- Works with all encoding types that use categorical data
