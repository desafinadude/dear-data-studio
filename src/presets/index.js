/**
 * Preset System Entry Point
 * 
 * This file provides backward compatibility with the old preset system
 * while delegating to the new folder-based preset loader.
 * 
 * New code should import from './loader.js' for full preset functionality.
 */

export { 
  PRESETS, 
  genData,
  getPresets,
  getPreset,
  loadCompletePreset,
  applyPresetToData,
  generatePresetData,
  PRESET_REGISTRY
} from './loader.js'
