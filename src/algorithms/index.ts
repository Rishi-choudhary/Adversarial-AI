/**
 * Key Algorithms for Section Detection and Schema Inference
 * 
 * This module provides three main algorithms:
 * 
 * Algorithm A: Section Boundary Detection (detectSections)
 * - Detects semantic sections in DOM documents
 * - Uses landmarks, class patterns, and visual boundaries
 * 
 * Algorithm B: Schema Field Inference (inferSchemaSettings)
 * - Extracts editable fields from DOM elements
 * - Supports headings, text, images, links, and colors
 * 
 * Algorithm C: Repeating Block Detection (detectRepeatingBlocks)
 * - Identifies repeating patterns in child elements
 * - Useful for generating template loops
 */

// Type definitions
export type { Section, SchemaSettings, BlockDefinition } from './types';

// Algorithm A: Section Boundary Detection
export { 
  detectSections,
  addBoundingBoxes,
  LANDMARK_SELECTORS,
  CLASS_PATTERNS,
} from './sectionDetection';

// Algorithm B: Schema Field Inference
export {
  inferSchemaSettings,
  inferSchemaSettingsExtended,
  groupSettingsByType,
  generateLiquidSchema,
} from './schemaInference';

// Algorithm C: Repeating Block Detection
export {
  detectRepeatingBlocks,
  detectAllRepeatingBlocks,
  getChildFingerprints,
  findMatchingElements,
  analyzeBlockPatterns,
  generateBlockSchema,
} from './blockDetection';

// Utility functions
export {
  countBy,
  maxBy,
  rgbToHex,
  getStructuralFingerprint,
  boxesOverlap,
  isNestedWithin,
  mergeAndDeduplicate,
  generateSectionId,
} from './utils';
