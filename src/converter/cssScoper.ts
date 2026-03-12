/**
 * CSS Scoper - Scopes CSS rules to specific section IDs
 * Ensures CSS isolation between different Shopify sections
 */

export interface CssScopingOptions {
  sectionId: string;
  sectionClass: string;
  preserveGlobalStyles?: boolean;
}

export interface ScopedCssResult {
  scopedCss: string;
  extractedVariables: Record<string, string>;
  warnings: string[];
}

/**
 * Scope CSS rules to a specific section
 */
export function scopeCss(
  css: string, 
  options: CssScopingOptions
): ScopedCssResult {
  const { sectionId, sectionClass, preserveGlobalStyles = false } = options;
  const sectionSelector = `.section-${sectionId}`;
  const warnings: string[] = [];
  const extractedVariables: Record<string, string> = {};
  
  // Parse and process CSS
  let scopedCss = css;
  
  // Extract CSS custom properties (variables)
  const variablePattern = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = variablePattern.exec(css)) !== null) {
    extractedVariables[`--${match[1]}`] = match[2].trim();
  }
  
  // Split CSS into rules
  const rules = splitCssRules(css);
  const scopedRules: string[] = [];
  
  for (const rule of rules) {
    const trimmedRule = rule.trim();
    
    // Skip empty rules
    if (!trimmedRule) continue;
    
    // Handle @-rules (media queries, keyframes, etc.)
    if (trimmedRule.startsWith('@')) {
      scopedRules.push(scopeAtRule(trimmedRule, sectionSelector, preserveGlobalStyles));
      continue;
    }
    
    // Handle regular CSS rules
    scopedRules.push(scopeRegularRule(trimmedRule, sectionSelector, preserveGlobalStyles, warnings));
  }
  
  scopedCss = scopedRules.join('\n\n');
  
  return {
    scopedCss,
    extractedVariables,
    warnings
  };
}

/**
 * Split CSS into individual rules (handling nested structures)
 */
function splitCssRules(css: string): string[] {
  const rules: string[] = [];
  let current = '';
  let depth = 0;
  
  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    
    if (char === '{') {
      depth++;
      current += char;
    } else if (char === '}') {
      depth--;
      current += char;
      
      if (depth === 0) {
        rules.push(current.trim());
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  // Handle any remaining content
  if (current.trim()) {
    rules.push(current.trim());
  }
  
  return rules;
}

/**
 * Scope @-rules (media queries, keyframes, etc.)
 */
function scopeAtRule(
  rule: string, 
  sectionSelector: string, 
  preserveGlobalStyles: boolean
): string {
  // Handle @keyframes - don't scope these
  if (rule.startsWith('@keyframes') || rule.startsWith('@-webkit-keyframes')) {
    return rule;
  }
  
  // Handle @font-face - don't scope these
  if (rule.startsWith('@font-face')) {
    return rule;
  }
  
  // Handle @import - keep as is
  if (rule.startsWith('@import')) {
    return rule;
  }
  
  // Handle @media queries - scope the inner rules
  if (rule.startsWith('@media') || rule.startsWith('@supports')) {
    const atRuleMatch = rule.match(/^(@[^{]+)\{([\s\S]*)\}$/);
    if (atRuleMatch) {
      const atRuleDeclaration = atRuleMatch[1];
      const innerCss = atRuleMatch[2];
      
      // Recursively scope inner rules
      const innerRules = splitCssRules(innerCss);
      const scopedInnerRules = innerRules.map(innerRule => 
        scopeRegularRule(innerRule, sectionSelector, preserveGlobalStyles, [])
      );
      
      return `${atRuleDeclaration}{\n  ${scopedInnerRules.join('\n  ')}\n}`;
    }
  }
  
  return rule;
}

/**
 * Scope a regular CSS rule
 */
function scopeRegularRule(
  rule: string, 
  sectionSelector: string, 
  preserveGlobalStyles: boolean,
  warnings: string[]
): string {
  // Parse selector and declaration
  const selectorMatch = rule.match(/^([^{]+)\{([\s\S]*)\}$/);
  if (!selectorMatch) {
    return rule;
  }
  
  const selectors = selectorMatch[1].split(',').map(s => s.trim());
  const declarations = selectorMatch[2];
  
  const scopedSelectors = selectors.map(selector => {
    // Don't scope global selectors if preserveGlobalStyles is true
    if (preserveGlobalStyles) {
      const globalSelectors = ['html', 'body', ':root', '*'];
      if (globalSelectors.some(g => selector.startsWith(g))) {
        warnings.push(`Global selector "${selector}" kept as-is due to preserveGlobalStyles option`);
        return selector;
      }
    }
    
    // Handle pseudo-elements on :root
    if (selector.startsWith(':root')) {
      return selector.replace(':root', sectionSelector);
    }
    
    // Handle combined selectors
    if (selector.includes(' ')) {
      // Scope the first part of descendant/child selectors
      const parts = selector.split(' ');
      parts[0] = scopeSimpleSelector(parts[0], sectionSelector);
      return parts.join(' ');
    }
    
    return scopeSimpleSelector(selector, sectionSelector);
  });
  
  return `${scopedSelectors.join(',\n')} {${declarations}}`;
}

/**
 * Scope a simple (non-compound) selector
 */
function scopeSimpleSelector(selector: string, sectionSelector: string): string {
  // Don't double-scope
  if (selector.includes(sectionSelector)) {
    return selector;
  }
  
  // Handle element selectors
  if (/^[a-zA-Z]/.test(selector)) {
    return `${sectionSelector} ${selector}`;
  }
  
  // Handle class selectors
  if (selector.startsWith('.')) {
    return `${sectionSelector} ${selector}`;
  }
  
  // Handle ID selectors
  if (selector.startsWith('#')) {
    return `${sectionSelector} ${selector}`;
  }
  
  // Handle attribute selectors
  if (selector.startsWith('[')) {
    return `${sectionSelector} ${selector}`;
  }
  
  // Handle pseudo-class selectors
  if (selector.startsWith(':')) {
    return `${sectionSelector}${selector}`;
  }
  
  return `${sectionSelector} ${selector}`;
}

/**
 * Generate a scoped CSS file for a section
 */
export function generateSectionCssFile(
  sectionName: string,
  originalCss: string
): string {
  const { scopedCss, extractedVariables } = scopeCss(originalCss, {
    sectionId: `{{ section.id }}`,
    sectionClass: `section-${sectionName}`
  });
  
  // Build the final CSS file content
  let cssFileContent = `/**
 * Section: ${sectionName}
 * Generated by ThemeForge
 * 
 * This CSS is automatically scoped to the section.
 * Edit with caution.
 */

`;

  // Add CSS variables if any were extracted
  if (Object.keys(extractedVariables).length > 0) {
    cssFileContent += `.section-${sectionName} {\n`;
    for (const [varName, varValue] of Object.entries(extractedVariables)) {
      cssFileContent += `  ${varName}: ${varValue};\n`;
    }
    cssFileContent += `}\n\n`;
  }
  
  cssFileContent += scopedCss;
  
  return cssFileContent;
}

export default {
  scopeCss,
  generateSectionCssFile
};
