import { Item, MatchScoreDetails, MatchStrength, MatchConfidenceLevel } from '../types';
import { 
  calculateTextSemanticSimilarity, 
  extractEntities, 
  COLOR_TAXONOMY,
  preprocessText,
  lemmatizeToken
} from './nlpSemanticEngine';

/**
 * Checks if two color strings belong to the same perceptual color family (e.g. Silver = Grey, Navy = Blue)
 */
function areColorsInSameFamily(colA: string, colB: string): boolean {
  const normA = (colA || '').toLowerCase().trim();
  const normB = (colB || '').toLowerCase().trim();
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  for (const list of Object.values(COLOR_TAXONOMY)) {
    const hasA = list.some(c => normA.includes(c));
    const hasB = list.some(c => normB.includes(c));
    if (hasA && hasB) return true;
  }
  return false;
}

/**
 * Checks if a report is eligible for matching according to Section 13 & 14 rules:
 * - NOT deleted (item.deleted !== true)
 * - NOT rejected (item.verificationStatus !== 'REJECTED')
 * - NOT recovered (item.status !== 'RECOVERED')
 * - NOT closed (item.status !== 'CLOSED')
 */
export function isReportEligibleForMatching(item: Item): boolean {
  if (!item) return false;
  if (item.deleted) return false;
  if (item.verificationStatus === 'REJECTED') return false;
  if (item.status === 'RECOVERED' || item.status === 'CLOSED') return false;
  return true;
}

/**
 * Normalizes campus location names and abbreviations
 */
function cleanLocation(str: string): string {
  if (!str) return '';
  let text = str.toLowerCase();

  // Normalize college acronyms & abbreviations & campus zones
  text = text
    .replace(/\bcafeteria\b/g, 'canteen')
    .replace(/\bmess\b/g, 'canteen')
    .replace(/\bcomp\s*sci\b/g, 'computer science')
    .replace(/\bcs\b/g, 'computer science')
    .replace(/\baudi\b/g, 'auditorium')
    .replace(/\blib\b/g, 'library')
    .replace(/\blaboratory\b/g, 'lab');

  // Strip generic location filler words
  text = text
    .replace(/college|campus|near|around|the|at|floor|dept|department|area|spot|building/gi, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  return text;
}

function normalizeLocStr(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isLabA(normStr: string): boolean {
  return /\blab\s*a\b/i.test(normStr) || /\blaba\b/i.test(normStr);
}

function isLabB(normStr: string): boolean {
  return /\blab\s*b\b/i.test(normStr) || /\blabb\b/i.test(normStr);
}

function isCS1(normStr: string): boolean {
  return /\bcs\s*1\b/i.test(normStr) || /\bcs1\b/i.test(normStr) || /\bclassroom\s*1\b/i.test(normStr);
}

function isCS2(normStr: string): boolean {
  return /\bcs\s*2\b/i.test(normStr) || /\bcs2\b/i.test(normStr) || /\bclassroom\s*2\b/i.test(normStr);
}

/**
 * Calculates location match score adhering to college specifics:
 * - Exact same location / room: 25 points
 * - CS1 vs CS2 or Lab A vs Lab B: 10 points (same department, distinct room)
 * - Same general department / zone: 10 points
 * - Distinct unrelated location: 0 points
 */
export function calculateLocationScore(itemA: Item, itemB: Item): number {
  const areaA = (itemA.area || '').trim().toLowerCase();
  const areaB = (itemB.area || '').trim().toLowerCase();
  const subA = (itemA.subLocation || '').trim();
  const subB = (itemB.subLocation || '').trim();

  const fullA = `${itemA.area || ''} ${itemA.subLocation || ''} ${itemA.location || ''}`;
  const fullB = `${itemB.area || ''} ${itemB.subLocation || ''} ${itemB.location || ''}`;

  const normA = normalizeLocStr(fullA);
  const normB = normalizeLocStr(fullB);

  const aLabA = isLabA(normA);
  const bLabA = isLabA(normB);
  const aLabB = isLabB(normA);
  const bLabB = isLabB(normB);

  const aCS1 = isCS1(normA);
  const bCS1 = isCS1(normB);
  const aCS2 = isCS2(normA);
  const bCS2 = isCS2(normB);

  // 1. Conflict check: Lab A vs Lab B (both in CS, but different labs)
  if ((aLabA && bLabB) || (aLabB && bLabA)) {
    return 10;
  }

  // 2. Conflict check: CS1 vs CS2 (both in CS, but different classrooms)
  if ((aCS1 && bCS2) || (aCS2 && bCS1)) {
    return 10;
  }

  // 3. Conflict check: Classroom vs Lab (CS1/CS2 vs Lab A/Lab B)
  if (((aCS1 || aCS2) && (bLabA || bLabB)) || ((bCS1 || bCS2) && (aLabA || aLabB))) {
    return 10;
  }

  // 4. Exact match on Lab A
  if (aLabA && bLabA) {
    return 25;
  }

  // 5. Exact match on Lab B
  if (aLabB && bLabB) {
    return 25;
  }

  // 6. Exact match on CS1
  if (aCS1 && bCS1) {
    return 25;
  }

  // 7. Exact match on CS2
  if (aCS2 && bCS2) {
    return 25;
  }

  // 8. Exact match on structured subLocation
  if (subA && subB && subA.toLowerCase() === subB.toLowerCase()) {
    return 25;
  }

  // 9. Match on raw location string
  const cleanA = cleanLocation(itemA.location);
  const cleanB = cleanLocation(itemB.location);

  if (cleanA && cleanB) {
    if (cleanA === cleanB) {
      return 25;
    }
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
      return 25;
    }
    const zones = ['canteen', 'library', 'auditorium', 'gymkhana', 'parking', 'gate', 'office', 'ground'];
    for (const z of zones) {
      if (cleanA.includes(z) && cleanB.includes(z)) {
        return 25;
      }
    }
  }

  // 10. Same general area
  if (areaA && areaB && areaA === areaB) {
    return 10;
  }

  // 11. Word-level fallback
  if (cleanA && cleanB) {
    const wordsA = cleanA.split(' ').filter(w => w.length > 2);
    const wordsB = cleanB.split(' ').filter(w => w.length > 2);
    const commonWords = wordsA.filter(w => wordsB.includes(w));
    if (commonWords.length >= 2) {
      return 15;
    }
    if (commonWords.length === 1 && !aLabA && !bLabA && !aLabB && !bLabB && !aCS1 && !bCS1 && !aCS2 && !bCS2) {
      return 10;
    }
  }

  return 0;
}

/**
 * Calculates date proximity score (Max 15 points)
 */
function calculateDateScore(itemA: Item, itemB: Item): { score: number; diffDays: number } {
  try {
    const timeA = new Date(itemA.date).getTime();
    const timeB = new Date(itemB.date).getTime();
    if (isNaN(timeA) || isNaN(timeB)) {
      return { score: 8, diffDays: 0 };
    }
    const diffDays = Math.round(Math.abs(timeA - timeB) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { score: 15, diffDays: 0 };
    if (diffDays <= 1) return { score: 14, diffDays };
    if (diffDays <= 3) return { score: 12, diffDays };
    if (diffDays <= 7) return { score: 8, diffDays };
    if (diffDays <= 14) return { score: 4, diffDays };
    return { score: 0, diffDays };
  } catch {
    return { score: 8, diffDays: 0 };
  }
}

/**
 * Main Automated NLP-based Matching Algorithm for Ismail Yusuf College
 *
 * Transparent 100-Point Scoring Rubric:
 * 1. NLP Semantic & Text Similarity: Max 25 points (Direct NLP semantic analysis of descriptions, titles, brands)
 * 2. Category & Conceptual Compatibility: Max 25 points
 * 3. Location Proximity & Specificity: Max 25 points
 * 4. Date/Time Proximity: Max 15 points
 * 5. Color Family & Visual Attributes: Max 10 points
 * Total = 100 Points
 *
 * Classifications:
 * - High confidence / Strong Match: >= 85 points
 * - Possible match: 60–84 points (Threshold: 60%)
 * - Low confidence / Low Match: < 60 points
 */
export function calculateMatchScore(itemA: Item, itemB: Item): MatchScoreDetails {
  const matchFactors: string[] = [];

  // Entity extraction via NLP engine
  const entityA = extractEntities(itemA);
  const entityB = extractEntities(itemB);

  // 1. NLP SEMANTIC TEXT SIMILARITY (Max 25 points)
  const semanticResult = calculateTextSemanticSimilarity(itemA, itemB);
  const nlpPercentage = semanticResult.score; // 0 to 100
  // Scale 0-100% to 0-25 points
  let keywordsScore = Math.round((nlpPercentage / 100) * 25);
  keywordsScore = Math.min(25, Math.max(0, keywordsScore));

  if (nlpPercentage >= 65) {
    if (semanticResult.sharedConceptName) {
      matchFactors.push(`Similar item description (${semanticResult.sharedConceptName})`);
    } else {
      matchFactors.push('Similar item description');
    }
  }
  if (semanticResult.brandRelationship === 'match' && entityA.brand) {
    matchFactors.push(`Same brand (${entityA.brand.toUpperCase()})`);
  }

  // 2. CATEGORY & CONCEPTUAL COMPATIBILITY (Max 25 points)
  let categoryScore = 0;
  const catA = (itemA.category || '').toLowerCase().trim();
  const catB = (itemB.category || '').toLowerCase().trim();

  // Concept conflict detection (e.g. Phone vs Mouse under general Electronics)
  const hasConflictingConcepts = 
    entityA.primaryConcept && 
    entityB.primaryConcept && 
    entityA.primaryConcept.id !== entityB.primaryConcept.id;

  if (catA === catB) {
    if (hasConflictingConcepts) {
      // Incompatible item types under generic category (e.g. Laptop vs Earbuds under Electronics)
      categoryScore = 5;
    } else {
      categoryScore = 25;
      matchFactors.push(`Same category (${itemA.category})`);
    }
  } else {
    // Check semantically related categories
    const relatedGroups: string[][] = [
      ['id cards', 'documents', 'wallet'],
      ['books & stationery', 'documents'],
      ['electronics', 'other'],
      ['clothing', 'bags'],
      ['wallet', 'bags']
    ];

    let isRelated = false;
    for (const group of relatedGroups) {
      if (group.includes(catA) && group.includes(catB)) {
        isRelated = true;
        break;
      }
    }

    if (isRelated) {
      if (entityA.primaryConcept && entityB.primaryConcept && entityA.primaryConcept.id === entityB.primaryConcept.id) {
        categoryScore = 22;
        matchFactors.push(`Compatible category (${itemA.category} ↔ ${itemB.category})`);
      } else {
        categoryScore = 15;
      }
    }
  }

  // 3. LOCATION MATCHING (Max 25 points)
  const locationScore = calculateLocationScore(itemA, itemB);
  if (locationScore >= 20) {
    matchFactors.push(`Same location (${itemA.location})`);
  } else if (locationScore >= 10) {
    matchFactors.push(`Nearby location (${itemA.area || 'Same department'})`);
  }

  // 4. DATE PROXIMITY (Max 15 points)
  const { score: dateScore, diffDays } = calculateDateScore(itemA, itemB);
  if (dateScore >= 14) {
    matchFactors.push(diffDays === 0 ? 'Reported on the same day' : 'Reported within 24 hours');
  } else if (dateScore >= 10) {
    matchFactors.push(`Reported within ${diffDays} days`);
  }

  // 5. COLOR MATCHING (Max 10 points)
  let colorScore = 0;
  const colA = (itemA.color || '').trim().toLowerCase();
  const colB = (itemB.color || '').trim().toLowerCase();

  if (colA && colB && colA !== 'other' && colB !== 'other') {
    if (colA === colB || colA.includes(colB) || colB.includes(colA)) {
      colorScore = 10;
      matchFactors.push(`Same color (${itemA.color})`);
    } else if (areColorsInSameFamily(colA, colB)) {
      colorScore = 9;
      matchFactors.push(`Matching color shade (${colA} ↔ ${colB})`);
    } else if (
      itemA.description.toLowerCase().includes(colB) ||
      itemB.description.toLowerCase().includes(colA) ||
      itemA.itemName.toLowerCase().includes(colB) ||
      itemB.itemName.toLowerCase().includes(colA)
    ) {
      colorScore = 8;
      matchFactors.push(`Color reference in report text`);
    } else {
      // Conflicting prominent colors (e.g. Red vs Green)
      colorScore = 0;
    }
  } else {
    // Unspecified / Other color receives neutral baseline
    colorScore = 4;
  }

  // TOTAL SCORE COMPUTATION
  let totalScore = Math.round(keywordsScore + categoryScore + locationScore + dateScore + colorScore);

  // PRECISION SAFEGUARD:
  // If concept clusters strongly conflict (e.g. Phone vs Mouse, or Laptop vs Umbrella),
  // cap total score strictly below the 60% threshold to prevent false positives.
  if (hasConflictingConcepts) {
    totalScore = Math.min(totalScore, 45);
  }

  // Conflicting brands safeguard (e.g. Apple iPhone vs Samsung Galaxy)
  if (semanticResult.brandRelationship === 'conflict') {
    totalScore = Math.min(totalScore, 48);
  }

  totalScore = Math.min(100, Math.max(0, totalScore));

  // CONFIDENCE LEVEL & STRENGTH
  let confidenceLevel: MatchConfidenceLevel = 'Low confidence';
  let matchStrength: MatchStrength = 'Low Match';

  if (totalScore >= 85) {
    confidenceLevel = 'High confidence';
    matchStrength = 'Strong Match';
  } else if (totalScore >= 60) {
    confidenceLevel = 'Possible match';
    matchStrength = 'Possible Match';
  } else {
    confidenceLevel = 'Low confidence';
    matchStrength = 'Low Match';
  }

  const isPossibleMatch = totalScore >= 60;

  return {
    categoryScore,
    locationScore,
    dateScore,
    colorScore,
    keywordsScore,
    nlpScore: nlpPercentage,
    totalScore,
    matchStrength,
    confidenceLevel,
    isPossibleMatch,
    matchedItem: itemB,
    matchFactors,
    explanation: semanticResult.explanation
  };
}

/**
 * Returns UI styling details for a given MatchStrength
 */
export function getMatchStrengthDetails(strength: MatchStrength) {
  switch (strength) {
    case 'High confidence':
    case 'Very Strong Match':
    case 'Strong Match':
      return {
        label: 'High Confidence',
        badgeBg: 'bg-emerald-600 text-white',
        cardBorder: 'border-emerald-400 ring-1 ring-emerald-400/30',
        textClass: 'text-emerald-700 font-bold',
        pillBg: 'bg-emerald-100 text-emerald-800'
      };
    case 'Possible match':
    case 'Possible Match':
      return {
        label: 'Possible Match',
        badgeBg: 'bg-blue-600 text-white',
        cardBorder: 'border-blue-300',
        textClass: 'text-blue-700 font-semibold',
        pillBg: 'bg-blue-100 text-blue-800'
      };
    default:
      return {
        label: 'Low Confidence',
        badgeBg: 'bg-slate-500 text-white',
        cardBorder: 'border-slate-200',
        textClass: 'text-slate-600',
        pillBg: 'bg-slate-100 text-slate-700'
      };
  }
}

/**
 * Finds all matching candidate pairings for an item from allItems.
 * Enforces Requirements 13 & 14:
 * - Excludes DELETED items
 * - Excludes REJECTED items (verificationStatus === 'REJECTED')
 * - Excludes RECOVERED items (status === 'RECOVERED')
 * - Excludes CLOSED items (status === 'CLOSED')
 * Only matches opposite report types (LOST with FOUND, FOUND with LOST).
 */
export function findMatches(item: Item, allItems: Item[]): MatchScoreDetails[] {
  if (!isReportEligibleForMatching(item)) return [];

  const oppositeType = item.type === 'LOST' ? 'FOUND' : 'LOST';

  return allItems
    .filter(other => 
      isReportEligibleForMatching(other) && 
      other.id !== item.id && 
      other.type === oppositeType
    )
    .map(other => calculateMatchScore(item, other))
    .sort((a, b) => b.totalScore - a.totalScore);
}
