import { DetectedSection } from './sectionDetector';
import { simpleHash } from '../lib/utils';

export interface DeduplicationResult {
  unique: DetectedSection[];
  duplicates: DuplicateGroup[];
}

export interface DuplicateGroup {
  fingerprint: string;
  sections: DetectedSection[];
  representative: DetectedSection;
}

/**
 * Generate a structural fingerprint for a section
 * This captures the structure without content
 */
export function generateFingerprint(section: DetectedSection): string {
  const html = section.html;
  
  // Remove content but keep structure
  const structure = html
    // Remove text content
    .replace(/>([^<]+)</g, '><')
    // Remove attribute values but keep attribute names
    .replace(/="[^"]*"/g, '=""')
    .replace(/='[^']*'/g, "=''")
    // Remove inline styles values
    .replace(/style="[^"]*"/gi, 'style=""')
    // Remove IDs (they're unique)
    .replace(/id="[^"]*"/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  return simpleHash(structure);
}

/**
 * Calculate structural similarity between two sections
 */
export function calculateSimilarity(
  section1: DetectedSection,
  section2: DetectedSection
): number {
  const fp1 = generateFingerprint(section1);
  const fp2 = generateFingerprint(section2);

  // If fingerprints match exactly, they're very similar
  if (fp1 === fp2) return 1.0;

  // Otherwise, calculate a simple tag-based similarity
  const tags1 = extractTags(section1.html);
  const tags2 = extractTags(section2.html);

  const intersection = tags1.filter(tag => tags2.includes(tag));
  const union = [...new Set([...tags1, ...tags2])];

  if (union.length === 0) return 0;

  return intersection.length / union.length;
}

/**
 * Extract HTML tags from content
 */
function extractTags(html: string): string[] {
  const tagRegex = /<(\w+)[^>]*>/g;
  const tags: string[] = [];
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    tags.push(match[1].toLowerCase());
  }

  return tags;
}

/**
 * Deduplicate sections based on structural similarity
 */
export function deduplicateSections(
  sections: DetectedSection[],
  options: { threshold?: number } = {}
): DeduplicationResult {
  const { threshold = 0.85 } = options;

  const fingerprints = new Map<string, DetectedSection[]>();

  // Group by fingerprint
  for (const section of sections) {
    const fp = generateFingerprint(section);
    
    if (!fingerprints.has(fp)) {
      fingerprints.set(fp, []);
    }
    fingerprints.get(fp)!.push(section);
  }

  const unique: DetectedSection[] = [];
  const duplicates: DuplicateGroup[] = [];

  for (const [fingerprint, group] of fingerprints.entries()) {
    if (group.length === 1) {
      unique.push(group[0]);
    } else {
      // Multiple sections with same fingerprint
      // Select the best representative
      const representative = selectRepresentative(group);
      unique.push(representative);
      
      duplicates.push({
        fingerprint,
        sections: group,
        representative,
      });
    }
  }

  // Also check for near-duplicates using similarity
  const nearDuplicates = findNearDuplicates(unique, threshold);
  
  // Remove near-duplicates from unique
  const finalUnique = unique.filter(section => {
    return !nearDuplicates.some(group => 
      group.sections.includes(section) && group.representative !== section
    );
  });

  return {
    unique: finalUnique,
    duplicates: [...duplicates, ...nearDuplicates],
  };
}

/**
 * Find sections that are structurally similar but not exact duplicates
 */
function findNearDuplicates(
  sections: DetectedSection[],
  threshold: number
): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const used = new Set<string>();

  for (let i = 0; i < sections.length; i++) {
    if (used.has(sections[i].id)) continue;

    const similarSections: DetectedSection[] = [sections[i]];

    for (let j = i + 1; j < sections.length; j++) {
      if (used.has(sections[j].id)) continue;

      const similarity = calculateSimilarity(sections[i], sections[j]);
      if (similarity >= threshold) {
        similarSections.push(sections[j]);
        used.add(sections[j].id);
      }
    }

    if (similarSections.length > 1) {
      used.add(sections[i].id);
      const representative = selectRepresentative(similarSections);
      
      groups.push({
        fingerprint: generateFingerprint(representative),
        sections: similarSections,
        representative,
      });
    }
  }

  return groups;
}

/**
 * Select the best representative from a group of similar sections
 */
function selectRepresentative(sections: DetectedSection[]): DetectedSection {
  // Prefer sections with more content
  return sections.reduce((best, current) => {
    const bestScore = scoreSectionQuality(best);
    const currentScore = scoreSectionQuality(current);
    return currentScore > bestScore ? current : best;
  });
}

/**
 * Score a section's quality for selection
 */
function scoreSectionQuality(section: DetectedSection): number {
  let score = 0;

  // Prefer longer content
  score += section.html.length / 1000;

  // Prefer semantic elements
  if (['section', 'article', 'header', 'footer', 'main'].includes(section.element)) {
    score += 10;
  }

  // Prefer sections with IDs
  if (section.id && !section.id.startsWith('section-')) {
    score += 5;
  }

  // Prefer sections with meaningful class names
  if (section.classList.length > 0 && section.classList[0].length > 3) {
    score += 3;
  }

  return score;
}

/**
 * Merge duplicate sections into a single template
 */
export function mergeDuplicates(group: DuplicateGroup): string {
  // For now, just return the representative's HTML
  // In a more advanced implementation, this could extract
  // common patterns and create a template with variables
  return group.representative.html;
}
