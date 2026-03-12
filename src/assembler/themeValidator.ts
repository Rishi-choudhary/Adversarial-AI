import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

/**
 * Validation report returned by validateTheme
 */
export interface ValidationReport {
  errors: string[];
  warnings: string[];
  valid: boolean;
  autoFixed?: AutoFixReport[];
}

/**
 * Auto-fix report for minor issues that were automatically corrected
 */
export interface AutoFixReport {
  file: string;
  issue: string;
  action: string;
}

/**
 * Options for theme validation
 */
export interface ValidationOptions {
  autoFix?: boolean;
  strict?: boolean;
}

/**
 * Required files for a valid Shopify theme
 */
const REQUIRED_FILES = [
  'layout/theme.liquid',
  'templates/index.json',
  'config/settings_schema.json',
  'config/settings_data.json',
  'locales/en.default.json'
];

/**
 * Validates a Shopify theme directory for common issues.
 * 
 * This function performs the following validations:
 * 1. Validates all {% schema %} blocks parse as valid JSON
 * 2. Checks {{ }} and {% %} tags are balanced
 * 3. Verifies all asset references exist
 * 4. Verifies required theme files exist
 * 5. Auto-fixes minor issues (if enabled)
 * 
 * @param themeDir - Path to the theme directory
 * @param options - Validation options
 * @returns Promise<ValidationReport> - Validation results
 */
export async function validateTheme(
  themeDir: string,
  options: ValidationOptions = {}
): Promise<ValidationReport> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const autoFixed: AutoFixReport[] = [];
  const { autoFix = false } = options;

  // Normalize the theme directory path
  const normalizedThemeDir = path.resolve(themeDir);

  // Check if theme directory exists
  if (!fs.existsSync(normalizedThemeDir)) {
    errors.push(`Theme directory does not exist: ${normalizedThemeDir}`);
    return { errors, warnings, valid: false };
  }

  // Get all section files
  const sectionFiles = await glob(`${normalizedThemeDir}/sections/*.liquid`);

  // 1. Validate all {% schema %} blocks parse as valid JSON
  const schemaErrors = await validateSchemaBlocks(sectionFiles, autoFix, autoFixed);
  errors.push(...schemaErrors.errors);
  warnings.push(...schemaErrors.warnings);

  // 2. Check {{ }} and {% %} tags are balanced
  const tagErrors = validateLiquidTags(sectionFiles);
  errors.push(...tagErrors.errors);
  warnings.push(...tagErrors.warnings);

  // 3. Verify all asset references exist
  const assetWarnings = await validateAssetReferences(normalizedThemeDir, sectionFiles);
  warnings.push(...assetWarnings);

  // 4. Verify required theme files exist
  const requiredFileErrors = validateRequiredFiles(normalizedThemeDir);
  errors.push(...requiredFileErrors);

  return {
    errors,
    warnings,
    valid: errors.length === 0,
    autoFixed: autoFixed.length > 0 ? autoFixed : undefined
  };
}

/**
 * Validates {% schema %} blocks in section files
 */
async function validateSchemaBlocks(
  sectionFiles: string[],
  autoFix: boolean,
  autoFixed: AutoFixReport[]
): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const file of sectionFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const schemaMatch = content.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);

    if (!schemaMatch) {
      errors.push(`Missing {% schema %} in ${path.basename(file)}`);
    } else {
      const schemaContent = schemaMatch[1];
      const parseResult = tryParseJSON(schemaContent);

      if (!parseResult.success) {
        if (autoFix) {
          const fixedContent = attemptAutoFixJSON(schemaContent);
          if (fixedContent.success) {
            // Write the fixed content back
            const newContent = content.replace(
              /\{%\s*schema\s*%\}[\s\S]*?\{%\s*endschema\s*%\}/,
              `{% schema %}\n${fixedContent.json}\n{% endschema %}`
            );
            fs.writeFileSync(file, newContent, 'utf-8');
            autoFixed.push({
              file: path.basename(file),
              issue: 'Invalid schema JSON',
              action: 'Normalized JSON (removed comments/trailing commas)'
            });
          } else {
            errors.push(`Invalid schema JSON in ${path.basename(file)}: ${parseResult.error}`);
          }
        } else {
          errors.push(`Invalid schema JSON in ${path.basename(file)}: ${parseResult.error}`);
        }
      }
    }
  }

  return { errors, warnings };
}

/**
 * Validates that Liquid tags are balanced
 */
function validateLiquidTags(
  sectionFiles: string[]
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const file of sectionFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const fileName = path.basename(file);

    // Check {{ }} output tags are balanced
    const openOutput = (content.match(/\{\{/g) || []).length;
    const closeOutput = (content.match(/\}\}/g) || []).length;
    if (openOutput !== closeOutput) {
      errors.push(
        `Unbalanced {{ }} tags in ${fileName}: ${openOutput} opening, ${closeOutput} closing`
      );
    }

    // Check {% %} logic tags are balanced
    const openLogic = (content.match(/\{%/g) || []).length;
    const closeLogic = (content.match(/%\}/g) || []).length;
    if (openLogic !== closeLogic) {
      errors.push(
        `Unbalanced {% %} tags in ${fileName}: ${openLogic} opening, ${closeLogic} closing`
      );
    }

    // Validate common Liquid block tags are properly closed
    const blockTagErrors = validateBlockTags(content, fileName);
    errors.push(...blockTagErrors);
  }

  return { errors, warnings };
}

/**
 * Validates that block-level Liquid tags are properly opened and closed
 */
function validateBlockTags(content: string, fileName: string): string[] {
  const errors: string[] = [];
  
  const blockTags: Array<{ open: string; close: string }> = [
    { open: 'if', close: 'endif' },
    { open: 'unless', close: 'endunless' },
    { open: 'for', close: 'endfor' },
    { open: 'case', close: 'endcase' },
    { open: 'capture', close: 'endcapture' },
    { open: 'form', close: 'endform' },
    { open: 'paginate', close: 'endpaginate' },
    { open: 'tablerow', close: 'endtablerow' },
    { open: 'comment', close: 'endcomment' },
    { open: 'raw', close: 'endraw' },
    { open: 'liquid', close: 'endliquid' },
    { open: 'style', close: 'endstyle' },
    { open: 'javascript', close: 'endjavascript' }
  ];

  for (const tag of blockTags) {
    // Count opening tags - match {% tag %} or {% tag ... %}
    const openPattern = new RegExp(`\\{%\\s*${tag.open}(?:\\s|%})`, 'g');
    const closePattern = new RegExp(`\\{%\\s*${tag.close}\\s*%\\}`, 'g');
    
    const openCount = (content.match(openPattern) || []).length;
    const closeCount = (content.match(closePattern) || []).length;

    if (openCount !== closeCount) {
      errors.push(
        `Unbalanced ${tag.open}/${tag.close} tags in ${fileName}: ${openCount} opening, ${closeCount} closing`
      );
    }
  }

  return errors;
}

/**
 * Validates that all asset references exist
 */
async function validateAssetReferences(
  themeDir: string,
  sectionFiles: string[]
): Promise<string[]> {
  const warnings: string[] = [];

  // Get all available assets
  const assetPattern = `${themeDir}/assets/*`;
  const assetFiles = await glob(assetPattern);
  const assets = assetFiles.map(f => path.basename(f));

  // Also check snippet files and layout files for asset references
  const liquidFiles = [
    ...sectionFiles,
    ...(await glob(`${themeDir}/snippets/*.liquid`)),
    ...(await glob(`${themeDir}/layout/*.liquid`)),
    ...(await glob(`${themeDir}/templates/*.liquid`))
  ];

  for (const file of liquidFiles) {
    if (!fs.existsSync(file)) continue;
    
    const content = fs.readFileSync(file, 'utf-8');
    
    // Match asset_url filter usage patterns:
    // 'filename.ext' | asset_url
    // "filename.ext" | asset_url
    const assetRefs = content.match(/['"]([^'"]+)['"]\s*\|\s*asset_url/g) || [];

    for (const ref of assetRefs) {
      const assetNameMatch = ref.match(/['"]([^'"]+)['"]/);
      const assetName = assetNameMatch?.[1];

      if (assetName && !assets.includes(assetName)) {
        warnings.push(`Missing asset: ${assetName} referenced in ${path.basename(file)}`);
      }
    }
  }

  return warnings;
}

/**
 * Validates that all required theme files exist
 */
function validateRequiredFiles(themeDir: string): string[] {
  const errors: string[] = [];

  for (const requiredFile of REQUIRED_FILES) {
    const filePath = path.join(themeDir, requiredFile);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing required file: ${requiredFile}`);
    }
  }

  return errors;
}

/**
 * Attempts to parse JSON and returns the result
 */
function tryParseJSON(content: string): { success: boolean; error?: string } {
  try {
    JSON.parse(content);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown JSON parse error'
    };
  }
}

/**
 * Attempts to auto-fix common JSON issues
 * - Removes JavaScript-style comments
 * - Removes trailing commas
 * - Normalizes JSON formatting
 */
function attemptAutoFixJSON(content: string): { success: boolean; json?: string } {
  try {
    // Remove single-line comments (// ...)
    let fixed = content.replace(/\/\/.*$/gm, '');
    
    // Remove multi-line comments (/* ... */)
    fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove trailing commas before } or ]
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    // Try to parse the fixed content
    const parsed = JSON.parse(fixed);
    
    // Return normalized JSON
    return {
      success: true,
      json: JSON.stringify(parsed, null, 2)
    };
  } catch {
    return { success: false };
  }
}

/**
 * Validate a single section file
 */
export function validateSectionFile(filePath: string): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!fs.existsSync(filePath)) {
    errors.push(`File does not exist: ${filePath}`);
    return { errors, warnings };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  // Check schema
  const schemaMatch = content.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  if (!schemaMatch) {
    errors.push(`Missing {% schema %} in ${fileName}`);
  } else {
    const parseResult = tryParseJSON(schemaMatch[1]);
    if (!parseResult.success) {
      errors.push(`Invalid schema JSON in ${fileName}: ${parseResult.error}`);
    }
  }

  // Check tag balance
  const openOutput = (content.match(/\{\{/g) || []).length;
  const closeOutput = (content.match(/\}\}/g) || []).length;
  if (openOutput !== closeOutput) {
    errors.push(`Unbalanced {{ }} tags in ${fileName}`);
  }

  const openLogic = (content.match(/\{%/g) || []).length;
  const closeLogic = (content.match(/%\}/g) || []).length;
  if (openLogic !== closeLogic) {
    errors.push(`Unbalanced {% %} tags in ${fileName}`);
  }

  return { errors, warnings };
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: ts-node themeValidator.ts <theme-directory>');
    process.exit(1);
  }

  const themeDir = args[0];
  const autoFix = args.includes('--auto-fix');

  validateTheme(themeDir, { autoFix })
    .then((report) => {
      console.log('\n=== Theme Validation Report ===\n');

      if (report.errors.length > 0) {
        console.log('ERRORS:');
        report.errors.forEach((err) => console.log(`  ❌ ${err}`));
        console.log();
      }

      if (report.warnings.length > 0) {
        console.log('WARNINGS:');
        report.warnings.forEach((warn) => console.log(`  ⚠️  ${warn}`));
        console.log();
      }

      if (report.autoFixed && report.autoFixed.length > 0) {
        console.log('AUTO-FIXED:');
        report.autoFixed.forEach((fix) =>
          console.log(`  ✅ ${fix.file}: ${fix.action}`)
        );
        console.log();
      }

      if (report.valid) {
        console.log('✅ Theme is valid!');
        process.exit(0);
      } else {
        console.log('❌ Theme validation failed.');
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('Validation error:', err);
      process.exit(1);
    });
}
