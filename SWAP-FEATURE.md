# Element Swapping Feature

## Overview
The swap feature allows you to conditionally display different SVG elements based on categorical variable values. This is perfect for showing different icons, shapes, or graphics depending on data categories.

## SVG Structure

### Basic Swap
```svg
<g id="dd-type-swap">
  <element id="dd-type-swap-value1" ... />
  <element id="dd-type-swap-value2" ... />
  <element id="dd-type-swap-value3" ... />
</g>
```

### With Additional Encodings
You can add other properties to the group that will be applied to whichever element is selected:

```svg
<g id="dd-animal-swap-color">
  <path id="dd-animal-swap-cat" ... />
  <path id="dd-animal-swap-dog" ... />
  <path id="dd-animal-swap-bird" ... />
</g>

<g id="dd-status-swap-color-opacity">
  <g id="dd-status-swap-active">...</g>
  <g id="dd-status-swap-inactive">...</g>
</g>
```

## Naming Rules

1. **Parent group**: `dd-{id}-swap` or `dd-{id}-swap-{encoding1}-{encoding2}`
2. **Child elements**: `dd-{id}-swap-{value}`
3. **Value matching**: 
   - Values are case-insensitive
   - Spaces in data are converted to underscores
   - "new person" in data → matches "new_person" in SVG
   - "reunion" in data → matches "reunion" in SVG

## Examples

### Example 1: Type Indicator (from Week 40 data)
```svg
<g id="dd-type-swap">
  <circle id="dd-type-swap-new_person" cx="50" cy="50" r="20" fill="#e09f3e"/>
  <rect id="dd-type-swap-reunion" x="30" y="30" width="40" height="40" fill="#c1440e"/>
</g>
```

When `type = "new_person"` → shows circle  
When `type = "reunion"` → shows rectangle

### Example 2: Gender Icons with Color Encoding
```svg
<g id="dd-gender-swap-color">
  <rect id="dd-gender-swap-man" ... />
  <circle id="dd-gender-swap-woman" ... />
  <path id="dd-gender-swap-nonbinary" ... />
</g>
```

Shows different shapes for each gender, and you can assign a color encoding to colorize based on another variable.

### Example 3: Weather Icons
```svg
<g id="dd-weather-swap">
  <g id="dd-weather-swap-sunny">
    <circle cx="50" cy="50" r="15" fill="#ffd700"/>
    <path d="..." /> <!-- sun rays -->
  </g>
  <g id="dd-weather-swap-rainy">
    <ellipse cx="50" cy="40" rx="20" ry="15" fill="#888"/>
    <path d="..." /> <!-- rain drops -->
  </g>
  <g id="dd-weather-swap-cloudy">
    <ellipse cx="50" cy="50" rx="25" ry="15" fill="#ccc"/>
  </g>
</g>
```

## Usage in Dear Data Studio

1. **Create SVG**: In Figma, create a group named `dd-type-swap` (or your variable name)
2. **Add variants**: Create child elements with names like:
   - `dd-type-swap-new`
   - `dd-type-swap-reunion`
   - etc.
3. **Export**: Export as SVG
4. **Import**: Load into Dear Data Studio
5. **Assign**: In the "② assign" tab, you'll see a "swap element" slot
6. **Select column**: Choose the categorical column that contains the values to match
7. **Preview**: The correct element will display for each row based on the value

## Additional Encodings

You can combine swap with other encodings on the parent group:

- **Color**: Different color based on another variable
- **Opacity**: Fade in/out based on another variable  
- **Rotation**: Rotate the selected element

These encodings apply to whichever variant is selected.

## Tips

- Use descriptive value names that match your data
- Keep variant names simple (lowercase, underscores for spaces)
- You can have any number of variants
- If no match is found, the slot shows nothing
- Complex graphics can be groups (use `<g id="dd-type-swap-value">...</g>`)
