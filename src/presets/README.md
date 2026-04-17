# Preset System

## Overview

The preset system allows you to create reusable, shareable visualization templates for Dear Data Studio. Each preset is a self-contained folder that includes data definitions, stamps, canvas, and slot assignments.

## Folder Structure

```
src/presets/
├── loader.js                   # Preset loading system
├── index.js                    # Backward compatibility exports
├── my-preset/                  # Your preset folder
│   ├── preset.json             # Preset configuration (required)
│   ├── stamps/                 # Stamp SVG files (optional)
│   │   ├── stamp1.svg
│   │   └── stamp2.svg
│   ├── canvas.svg              # Canvas SVG (optional)
│   └── data.csv                # Sample CSV data (optional)
```

## Creating a New Preset

### 1. Create Preset Folder

Create a new folder in `src/presets/` with a unique ID (use kebab-case):

```
src/presets/my-awesome-preset/
```

### 2. Create preset.json

This is the main configuration file:

```json
{
  "id": "my-awesome-preset",
  "name": "My Awesome Preset",
  "emoji": "🎨",
  "description": "A beautiful data visualization preset",
  "author": "Your Name",
  
  "data": {
    "source": "generated",
    "numRows": 20,
    "columns": [
      {
        "name": "category",
        "type": "category",
        "options": "A,B,C",
        "has_color": true,
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
      "file": "stamps/my-stamp.svg",
      "name": "My Stamp",
      "pathConfig": {
        "enabled": true,
        "pathAssignments": [
          {
            "canvasPath": "spiral",
            "indexStart": 0,
            "indexEnd": 20,
            "scale": 1,
            "spacing": 1,
            "followPath": false,
            "showPath": false
          }
        ]
      }
    }
  ],
  
  "canvas": {
    "file": "canvas.svg"
  },
  
  "assignments": {
    "dd-circle-color": {
      "color": {
        "col": "category"
      }
    },
    "dd-size-range": {
      "size-range": {
        "col": "value",
        "origin": "center"
      }
    }
  },
  
  "layout": {
    "type": "grid",
    "cols": 5,
    "chartTitle": "My Awesome Visualization"
  }
}
```

### 3. Add Stamps (Optional)

Create a `stamps/` folder and add your SVG files:

```
my-awesome-preset/
  stamps/
    circle-stamp.svg
    square-stamp.svg
```

Stamps should use the `dd-` layer naming convention for data slots.

### 4. Add Canvas (Optional)

If your preset uses path-based layout, add a `canvas.svg` file with paths that have IDs:

```svg
<svg viewBox="0 0 500 500">
  <path id="spiral" d="M 250,250 L ..." />
  <path id="circle" d="M 300,250 A ..." />
</svg>
```

### 5. Add Sample Data (Optional)

For CSV-based presets, add a `data.csv` file:

```csv
category,value
A,45
B,67
C,23
```

Update `preset.json`:

```json
"data": {
  "source": "data.csv",
  "columns": [...]
}
```

### 6. Register the Preset

Add your preset to `loader.js`:

```javascript
import myPreset from './my-awesome-preset/preset.json'

export const PRESET_REGISTRY = [
  week40Preset,
  distractionsPreset,
  myPreset,  // Add your preset here
]
```

## Data Configuration

### Generated Data

```json
"data": {
  "source": "generated",
  "numRows": 20,
  "columns": [
    {
      "name": "column_name",
      "type": "category",  // or "number"
      "options": "val1,val2,val3",  // for categorical
      "has_color": true,
      "colors": "#ff0000,#00ff00,#0000ff"
    }
  ]
}
```

### CSV Data

```json
"data": {
  "source": "data.csv",
  "columns": [
    // Column definitions for type inference and colors
  ]
}
```

## Stamp Configuration

Each stamp in the `stamps` array can have:

```json
{
  "file": "stamps/my-stamp.svg",
  "name": "My Stamp",
  "pathConfig": {
    "enabled": true,
    "pathAssignments": [
      {
        "canvasPath": "spiral",      // Path ID from canvas.svg
        "indexStart": 0,             // First data row to render
        "indexEnd": 20,              // Last data row to render
        "scale": 1,                  // Stamp scale multiplier
        "spacing": 1,                // Spacing multiplier
        "followPath": false,         // Rotate stamps to follow path
        "showPath": false            // Show the path line
      }
    ]
  }
}
```

## Slot Assignments

Map data columns to stamp slots using the `assignments` object:

```json
"assignments": {
  "dd-slot-id": {
    "encoder-type": {
      "col": "column_name",
      // encoder-specific config
      "colorA": "#ffffff",
      "colorB": "#000000"
    }
  }
}
```

### Available Encoders

- `color`: Map to fill/stroke color
- `size`: Map to scale
- `opacity`: Map to opacity
- `rotation`: Map to rotation angle
- `text`: Insert data value as text
- `visible`: Conditional visibility
- `size-range`: Scale between min/max geometry
- `swap`: Swap between SVG variants

Example:

```json
"assignments": {
  "dd-circle": {
    "color": {
      "col": "category"
    },
    "size": {
      "col": "value"
    }
  },
  "dd-label": {
    "text": {
      "col": "name"
    }
  },
  "dd-indicator-visible": {
    "visible": {
      "col": "show_indicator",
      "config": {
        "showIf": "yes"
      }
    }
  }
}
```

## Layout Configuration

Configure the visualization layout with the `layout` object:

```json
"layout": {
  "type": "grid",              // Layout type: "grid" or "flow"
  "cols": 5,                   // Number of columns in grid layout
  "chartTitle": "My Chart"     // Default title shown in visualization
}
```

### Layout Properties

- **`type`**: Layout algorithm
  - `"grid"`: Arrange stamps in a grid pattern
  - `"flow"`: Flow layout (experimental)
  
- **`cols`**: Number of columns (for grid layout)
  - Default: `5`
  - Affects how stamps are arranged

- **`chartTitle`**: Default chart title
  - Shown at the top of the visualization
  - Users can edit this via the "Set Title" button in the UI
  - Default: `"Dear Data Portrait"`

Example:

```json
"layout": {
  "type": "grid",
  "cols": 5,
  "chartTitle": "Week 40: New People I Met"
}
```

## Using Presets

### Load Complete Preset

```javascript
import { loadCompletePreset } from './presets'

const preset = await loadCompletePreset('my-awesome-preset')
// preset contains: data, stamps, canvas, assignments
```

### Apply Preset to User Data

```javascript
import { applyPresetToData } from './presets'

// User uploads their own CSV
const userCSV = [...]

// Apply preset's stamps and assignments to user's data
const presetAssets = await applyPresetToData('my-awesome-preset', userCSV)
// presetAssets contains: stamps, canvas, assignments (no data)
```

## Sharing Presets

To share a preset:

1. **Zip the folder**: Compress your preset folder
2. **Share**: Send the zip file to others
3. **Install**: Unzip into `src/presets/`
4. **Register**: Add to `PRESET_REGISTRY` in `loader.js`

## Migration from Old System

The old in-code preset format is still supported via the legacy conversion in `loader.js`. The `PRESETS` export maintains backward compatibility with existing code.

New features like stamps, canvas, and assignments are only available in the new folder-based system.

## Tips

- Use descriptive preset IDs (e.g., `dear-data-week-52` not `preset1`)
- Include a README in complex presets
- Test with both generated and CSV data
- Document any custom encoding configurations
- Keep SVG files clean and optimized
- Use consistent naming for dd- layers across stamps
