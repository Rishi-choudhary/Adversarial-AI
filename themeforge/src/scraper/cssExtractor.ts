import * as csstree from 'css-tree';
import { resolveUrl } from '../lib/utils';

export interface ExtractedCSS {
  content: string;
  urls: string[];
  fonts: FontFace[];
  variables: CSSVariable[];
}

export interface FontFace {
  family: string;
  src: string[];
  weight?: string;
  style?: string;
}

export interface CSSVariable {
  name: string;
  value: string;
}

/**
 * Extract and parse CSS from stylesheet content
 */
export function parseCSS(cssContent: string): ExtractedCSS {
  const urls: string[] = [];
  const fonts: FontFace[] = [];
  const variables: CSSVariable[] = [];

  try {
    const ast = csstree.parse(cssContent, {
      parseCustomProperty: true,
    });

    csstree.walk(ast, {
      enter(node) {
        // Extract URLs
        if (node.type === 'Url') {
          const url = node.value;
          if (typeof url === 'string') {
            urls.push(url);
          }
        }

        // Extract font-face declarations
        if (node.type === 'Atrule' && node.name === 'font-face' && node.block) {
          const font = extractFontFace(node);
          if (font) {
            fonts.push(font);
          }
        }

        // Extract CSS variables
        if (node.type === 'Declaration' && node.property.startsWith('--')) {
          const value = csstree.generate(node.value);
          variables.push({
            name: node.property,
            value,
          });
        }
      },
    });
  } catch (error) {
    console.error('CSS parsing error:', error);
  }

  return {
    content: cssContent,
    urls: [...new Set(urls)],
    fonts,
    variables,
  };
}

/**
 * Extract font-face information from a CSS node
 */
function extractFontFace(node: csstree.Atrule): FontFace | null {
  if (!node.block) return null;

  const font: FontFace = {
    family: '',
    src: [],
  };

  csstree.walk(node.block, {
    enter(child) {
      if (child.type === 'Declaration') {
        const value = csstree.generate(child.value);
        
        switch (child.property) {
          case 'font-family':
            font.family = value.replace(/["']/g, '');
            break;
          case 'src':
            const srcUrls = extractUrlsFromValue(value);
            font.src.push(...srcUrls);
            break;
          case 'font-weight':
            font.weight = value;
            break;
          case 'font-style':
            font.style = value;
            break;
        }
      }
    },
  });

  return font.family ? font : null;
}

/**
 * Extract URLs from a CSS value string
 */
function extractUrlsFromValue(value: string): string[] {
  const urls: string[] = [];
  const regex = /url\(['"]?([^'")\s]+)['"]?\)/gi;
  let match;
  
  while ((match = regex.exec(value)) !== null) {
    urls.push(match[1]);
  }
  
  return urls;
}

/**
 * Merge multiple CSS contents into one
 */
export function mergeCSS(cssContents: string[]): string {
  return cssContents.join('\n\n');
}

/**
 * Rewrite URLs in CSS to use local paths
 */
export function rewriteCSSUrls(
  cssContent: string,
  urlMap: Map<string, string>,
  baseUrl: string
): string {
  let result = cssContent;

  // Replace all URL references
  const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/gi;
  
  result = result.replace(urlRegex, (match, url) => {
    const absoluteUrl = resolveUrl(baseUrl, url);
    const localPath = urlMap.get(absoluteUrl);
    
    if (localPath) {
      return `url('${localPath}')`;
    }
    
    return match;
  });

  return result;
}

/**
 * Scope CSS selectors with a prefix
 */
export function scopeCSS(cssContent: string, scopeClass: string): string {
  try {
    const ast = csstree.parse(cssContent);

    csstree.walk(ast, {
      enter(node, item, list) {
        if (node.type === 'Rule' && node.prelude.type === 'SelectorList') {
          // Add scope class to each selector
          csstree.walk(node.prelude, {
            enter(selectorNode) {
              if (selectorNode.type === 'Selector') {
                // Prepend scope class
                const scopeSelector = csstree.parse(`.${scopeClass}`, {
                  context: 'selector',
                }) as csstree.Selector;
                
                // Insert at the beginning
                if (selectorNode.children) {
                  const firstChild = selectorNode.children.first;
                  if (firstChild && scopeSelector.children) {
                    selectorNode.children.prependData({
                      type: 'ClassSelector',
                      name: scopeClass,
                    } as csstree.ClassSelector);
                    selectorNode.children.prependData({
                      type: 'Combinator',
                      name: ' ',
                    } as csstree.Combinator);
                  }
                }
              }
            },
          });
        }
      },
    });

    return csstree.generate(ast);
  } catch (error) {
    console.error('CSS scoping error:', error);
    return cssContent;
  }
}

/**
 * Minify CSS content
 */
export function minifyCSS(cssContent: string): string {
  try {
    const ast = csstree.parse(cssContent);
    return csstree.generate(ast, { sourceMap: false });
  } catch {
    // Fallback to basic minification
    return cssContent
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}:;,])\s*/g, '$1')
      .trim();
  }
}

/**
 * Extract inline styles from HTML
 */
export function extractInlineStyles(html: string): string[] {
  const styles: string[] = [];
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  
  while ((match = styleRegex.exec(html)) !== null) {
    styles.push(match[1]);
  }
  
  return styles;
}
