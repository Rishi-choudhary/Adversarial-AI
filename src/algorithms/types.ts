/**
 * Type definitions for the section detection and schema inference algorithms
 */

/**
 * Represents a detected section within a DOM document
 */
export interface Section {
  /** Unique identifier for the section */
  id: string;
  /** The HTML element representing this section */
  element: Element;
  /** Type of section (e.g., 'header', 'footer', 'main', 'hero', etc.) */
  type: string;
  /** Bounding box coordinates (if available from Playwright) */
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Priority level (1 = semantic landmark, 2 = class pattern, 3 = visual boundary) */
  priority: 1 | 2 | 3;
  /** Nested child sections */
  children?: Section[];
}

/**
 * Represents a schema setting field extracted from an element
 */
export interface SchemaSettings {
  /** Type of the schema field */
  type: 'text' | 'richtext' | 'image_picker' | 'url' | 'color';
  /** Unique identifier for the field */
  id: string;
  /** Human-readable label for the field */
  label: string;
  /** Default value (if applicable) */
  default?: string | null;
}

/**
 * Represents a detected repeating block pattern
 */
export interface BlockDefinition {
  /** Whether this element contains repeating blocks */
  isBlock: boolean;
  /** The template element to use for the block */
  blockTemplate: Element | undefined;
  /** Number of repeating blocks found */
  count: number;
  /** Structural fingerprint of the block */
  fingerprint?: string;
}
