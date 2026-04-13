# SVG Encoding Structure Guide

## Overview
This document explains the structure for creating SVG stamps with data encodings for the Dear Data Studio.

## Key Principles

### 1. ID Naming Convention
- **Use underscores** for multi-word IDs: `focus_mood`, `coffee_count` ✓
- **Hyphens** separate the ID from properties: `dd-{id}-{prop1}-{prop2}`
- **Don't use hyphens in IDs** (creates ambiguity): `focus-mood` ✗
  - Example of ambiguity: `dd-focus-mood-color`
    - Is this "focus" with encodings "mood-color"?
    - Or "focus-mood" with encoding "color"?
    - Use `dd-focus_mood-color` instead!

### 2. Property Types
Available properties: `color`, `opacity`, `visible`, `rotation`, `text`

Note: `size` works differently (see Size Ranges below)

## Element Types

### Single Elements
Pattern: `dd-{id}-{prop1}-{prop2}-...`

Examples:
```xml
<!-- Single property -->
<circle id="dd-mood-color" cx="60" cy="60" r="10" fill="#ccc"/>

<!-- ID with underscore -->
<rect id="dd-focus_level-opacity" x="10" y="10" width="20" height="20" fill="#333"/>

<!-- Multiple properties -->
<path id="dd-activity-color-opacity" d="..." fill="#999"/>

<!-- Rotation example -->
<rect id="dd-direction-rotation" x="56" y="14" width="8" height="16" fill="#2d6a4f"/>

<!-- Text example -->
<text id="dd-label-text" x="60" y="100" fill="#333" text-anchor="middle">placeholder</text>
```

### Size Ranges (Must Be in a Group)

Pattern:
```xml
<g id="dd-{id}-{prop1}-{prop2}-...">
  <element id="dd-{id}-size-min" ... />
  <element id="dd-{id}-size-max" ... />
</g>
```

**Important Notes:**
- Props on the group apply to the whole group (color, opacity, rotation)
- Size is determined by the min/max elements
- If size elements aren't in a group, they're ignored
- The min/max elements define the interpolation range
- **Size scaling behavior:**
  - Value ≤ 0: Element is **hidden** (not rendered)
  - Value = 1: Shown at **minimum** size (size-min)
  - Value = max: Shown at **maximum** size (size-max)
  - Values between 1 and max are interpolated proportionally
- **Scale origin (anchor point):**
  - Choose from 9 preset positions via dropdown (defaults to "center")
  - Positions calculated from the **size-min element's bounding box**:
    - **top-left, top, top-right**
    - **left, center, right**
    - **bottom-left, bottom, bottom-right**
  - Example: for semicircles meeting at center vertical line, use "left" or "right"
  - Example: for bars growing upward, use "bottom"

Examples:
```xml
<!-- Size only -->
<g id="dd-focus_mood">
  <circle id="dd-focus_mood-size-min" cx="60" cy="44" r="8" fill="#c1440e"/>
  <circle id="dd-focus_mood-size-max" cx="60" cy="44" r="28" fill="#c1440e"/>
</g>

<!-- Size + color -->
<g id="dd-distraction-color">
  <rect id="dd-distraction-size-min" x="50" y="50" width="10" height="10" fill="#aaa"/>
  <rect id="dd-distraction-size-max" x="40" y="40" width="30" height="30" fill="#aaa"/>
</g>

<!-- Size + color + opacity -->
<g id="dd-energy-color-opacity">
  <ellipse id="dd-energy-size-min" cx="60" cy="60" rx="5" ry="8" fill="#555"/>
  <ellipse id="dd-energy-size-max" cx="60" cy="60" rx="15" ry="24" fill="#555"/>
</g>

<!-- Semicircles - set origin in UI to x=60 (center line) after import -->
<g id="dd-distraction-size-color">
  <path id="dd-distraction-size-min" d="..." fill="#aaa"/>
  <path id="dd-distraction-size-max" d="..." fill="#aaa"/>
</g>
```

### Repeats (Must Be in a Group)

Pattern:
```xml
<g id="dd-{id}-repeat-{prop1}-{prop2}-...">
  <element id="dd-{id}-repeat-1" ... />
  <element id="dd-{id}-repeat-2" ... />
  <element id="dd-{id}-repeat-3" ... />
  ...
</g>
```

**Important Notes:**
- Props on the group are applied to each repeat element
- Items are **activated** based on count (count=3 shows items 1, 2, 3)
- **Not tiling** - if you have 6 items and count is 2, only items 1 and 2 are shown
- Item-level overrides: add props to individual items

Examples:
```xml
<!-- Count only (basic repeat) -->
<g id="dd-coffee-repeat">
  <circle id="dd-coffee-repeat-1" cx="15" cy="102" r="6" fill="#1d3557"/>
  <circle id="dd-coffee-repeat-2" cx="28" cy="102" r="6" fill="#1d3557"/>
  <circle id="dd-coffee-repeat-3" cx="41" cy="102" r="6" fill="#1d3557"/>
</g>

<!-- Count + color applied to all items -->
<g id="dd-meetings-repeat-color">
  <rect id="dd-meetings-repeat-1" x="10" y="10" width="8" height="8" fill="#555"/>
  <rect id="dd-meetings-repeat-2" x="20" y="10" width="8" height="8" fill="#555"/>
  <rect id="dd-meetings-repeat-3" x="30" y="10" width="8" height="8" fill="#555"/>
</g>

<!-- Item-level overrides (each item can be different) -->
<g id="dd-tasks-repeat">
  <!-- Item 1 has its own color column -->
  <path id="dd-tasks-repeat-1-color" d="..." fill="#999"/>
  
  <!-- Item 2 has its own opacity column -->
  <path id="dd-tasks-repeat-2-opacity" d="..." fill="#999"/>
  
  <!-- Item 3 has color + rotation columns -->
  <path id="dd-tasks-repeat-3-color-rotation" d="..." fill="#999"/>
  
  <!-- Items 4-6 have no overrides -->
  <path id="dd-tasks-repeat-4" d="..." fill="#999"/>
  <path id="dd-tasks-repeat-5" d="..." fill="#999"/>
  <path id="dd-tasks-repeat-6" d="..." fill="#999"/>
</g>
```

## Property Details

### color
- **Numeric columns**: Interpolates between two colors (gradient)
- **Categorical columns**: Maps categories to colors from a palette
- Applies to both fill and stroke

### opacity
- **Numeric only**: 0.06 (nearly invisible) to 1.0 (fully opaque)
- Applied as a wrapper group

### visible
- Shows/hides element based on condition
- **Numeric**: threshold (show if value > threshold)
- **Categorical**: match (show if value = matchVal)

### rotation
- **Numeric only**: 0° to 360°
- Rotates around element center
- Applied as a wrapper group with transform

### text
- **Any column type**: Replaces the text content of `<text>` elements
- Works with both numeric and string data
- Automatically escapes special characters
- Example: `<text id="dd-label-text" ...>placeholder</text>`
- Use for dynamic labels, numbers, or names within your stamp

### size (standard elements only)
- **Numeric only**: 0.15x to 2.0x scale
- For size ranges, use the group pattern instead

## Labels and Text

Instead of automatic labels below stamps, use `text` encoding to place labels **within** your SVG design:

```xml
<!-- Text element with data binding -->
<text id="dd-day_number-text" x="60" y="100" font-size="12" fill="#333" text-anchor="middle">00</text>

<!-- Text can be combined with other encodings -->
<g>
  <circle id="dd-mood-color" cx="60" cy="60" r="20" fill="#ccc"/>
  <text id="dd-mood_label-text" x="60" y="95" text-anchor="middle" fill="#666">label</text>
</g>
```

## Workflow in Figma

1. Create your design in Figma
2. Rename layers with the appropriate `dd-{id}-{props}` pattern
3. For size ranges:
   - Create a group (frame/group)
   - Rename group: `dd-{id}-{props}`
   - Create two elements inside
   - Rename them: `dd-{id}-size-min` and `dd-{id}-size-max`
4. For repeats:
   - Create a group (frame/group)
   - Rename group: `dd-{id}-repeat-{props}`
   - Create numbered elements inside
   - Rename them: `dd-{id}-repeat-1`, `dd-{id}-repeat-2`, etc.
5. File → Export → SVG
6. Import into Dear Data Studio

## Examples

### Complete Stamp Example
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <!-- Base shape (no encoding) -->
  <rect x="5" y="5" width="110" height="110" fill="none" stroke="#ccc"/>
  
  <!-- Single elements -->
  <circle id="dd-energy-color" cx="60" cy="30" r="8" fill="#999"/>
  <rect id="dd-activity-rotation" x="56" y="50" width="8" height="16" fill="#555"/>
  
  <!-- Size range with color -->
  <g id="dd-focus_mood-color">
    <circle id="dd-focus_mood-size-min" cx="60" cy="70" r="8" fill="#c1440e"/>
    <circle id="dd-focus_mood-size-max" cx="60" cy="70" r="24" fill="#c1440e"/>
  </g>
  
  <!-- Repeat with item overrides -->
  <g id="dd-coffee-repeat">
    <circle id="dd-coffee-repeat-1-color" cx="15" cy="105" r="5" fill="#1d3557"/>
    <circle id="dd-coffee-repeat-2-color" cx="28" cy="105" r="5" fill="#1d3557"/>
    <circle id="dd-coffee-repeat-3-opacity" cx="41" cy="105" r="5" fill="#1d3557"/>
    <circle id="dd-coffee-repeat-4-rotation" cx="54" cy="105" r="5" fill="#1d3557"/>
    <circle id="dd-coffee-repeat-5" cx="67" cy="105" r="5" fill="#1d3557"/>
    <circle id="dd-coffee-repeat-6" cx="80" cy="105" r="5" fill="#1d3557"/>
  </g>
</svg>
```

## Common Mistakes to Avoid

❌ **Using hyphens in IDs**
```xml
<circle id="dd-focus-mood-color" .../>
<!-- Ambiguous! Is the ID "focus" or "focus-mood"? -->
```

✓ **Use underscores in IDs**
```xml
<circle id="dd-focus_mood-color" .../>
<!-- Clear! ID is "focus_mood", property is "color" -->
```

❌ **Size without a group**
```xml
<circle id="dd-thing-size-min" .../>
<circle id="dd-thing-size-max" .../>
<!-- Won't work! Size needs to be in a group -->
```

✓ **Size with a group**
```xml
<g id="dd-thing">
  <circle id="dd-thing-size-min" .../>
  <circle id="dd-thing-size-max" .../>
</g>
```

❌ **Repeat without numbered items**
```xml
<g id="dd-coffee-repeat">
  <circle id="dd-repeat-1" .../>  <!-- Missing coffee ID! -->
  <circle id="dd-repeat-2" .../>
</g>
```

✓ **Repeat with properly named items**
```xml
<g id="dd-coffee-repeat">
  <circle id="dd-coffee-repeat-1" .../>
  <circle id="dd-coffee-repeat-2" .../>
</g>
```

## Testing Your SVG

After creating your SVG:
1. Import it into Dear Data Studio
2. Check the "Assign" panel - you should see all your slots listed
3. For size ranges: should show "min Xpx → max Ypx (from SVG geometry)"
4. For repeats: should show "indexed repeat · max N"
5. For single elements: should show the property types
6. If something doesn't appear, check your naming!
