import { Item, MatchScoreDetails, MatchStrength } from '../types';

/**
 * Color family mappings for semantic color matching (e.g. Silver = Grey, Navy = Blue)
 */
const COLOR_FAMILIES: Record<string, string[]> = {
  grey: ['grey', 'gray', 'silver', 'metallic', 'steel', 'titanium'],
  silver: ['silver', 'grey', 'gray', 'steel', 'metallic', 'aluminum'],
  blue: ['blue', 'navy', 'cyan', 'sky', 'indigo', 'azure', 'denim'],
  black: ['black', 'dark', 'charcoal', 'matte black', 'obsidian'],
  white: ['white', 'cream', 'off-white', 'ivory'],
  red: ['red', 'maroon', 'crimson', 'burgundy', 'rose', 'pink'],
  brown: ['brown', 'tan', 'beige', 'khaki', 'coffee', 'chocolate'],
  green: ['green', 'olive', 'mint', 'emerald', 'teal'],
  yellow: ['yellow', 'golden', 'gold', 'amber', 'mustard'],
  orange: ['orange', 'peach', 'coral'],
  purple: ['purple', 'violet', 'lavender', 'magenta']
};

/**
 * Known object sub-clusters to verify physical compatibility and prevent false positives
 * (e.g. Phone vs Mouse in the same room on the same day must not score as a match)
 */
const OBJECT_CLUSTERS: Record<string, string[]> = {
  phone: ['phone', 'iphone', 'mobile', 'smartphone', 'android', 'samsung', 'oneplus', 'pixel', 'redmi', 'realme'],
  laptop: ['laptop', 'notebook', 'macbook', 'chromebook', 'thinkpad', 'dell', 'hp', 'lenovo', 'asus', 'acer'],
  audio: ['earbuds', 'earphones', 'headphones', 'airpods', 'headset', 'airdopes', 'buds', 'earphone', 'headphone'],
  mouse: ['mouse', 'trackpad', 'pointer'],
  keyboard: ['keyboard', 'keypad'],
  calculator: ['calculator', 'casio', 'scientific'],
  watch: ['watch', 'smartwatch', 'band', 'fitbit', 'titan', 'fastrack'],
  charger: ['charger', 'cable', 'adapter', 'wire', 'powerbank', 'cord'],
  card: ['card', 'id', 'license', 'pass', 'aadhaar', 'ticket', 'identity', 'hall'],
  bottle: ['bottle', 'flask', 'sipper', 'thermos', 'milton', 'tumbler'],
  umbrella: ['umbrella', 'raincoat'],
  keys: ['key', 'keys', 'keychain', 'bunch'],
  wallet: ['wallet', 'purse', 'pouch', 'billfold'],
  bag: ['bag', 'backpack', 'sack', 'rucksack', 'duffel', 'briefcase'],
  book: ['book', 'notebook', 'register', 'diary', 'journal', 'textbook', 'notes']
};

/**
 * Calculates a match score between two items (usually one LOST and one FOUND)
 * Based on the TY BSc CS Mini Project Automated Matching Algorithm:
 * - Category Match: 30 points
 * - Location Match: 25 points
 * - Date Proximity: 20 points
 * - Color Match: 15 points
 * - Keyword / Title Similarity: 10 points
 * Total: 100 points.
 * Classifications:
 * - 85–100 points: Strong Match
 * - 60–84 points:  Possible Match (Threshold >= 60)
 * - Below 60 points: Low Match
 */
export function calculateMatchScore(itemA: Item, itemB: Item): MatchScoreDetails {
  // Check object cluster compatibility
  const clusterA = detectObjectCluster(itemA);
  const clusterB = detectObjectCluster(itemB);
  const hasConflictingClusters = clusterA && clusterB && clusterA !== clusterB;

  // 1. Category Matching (Max 30 points)
  let categoryScore = 0;
  const catA = itemA.category.toLowerCase().trim();
  const catB = itemB.category.toLowerCase().trim();

  if (catA === catB) {
    if (hasConflictingClusters) {
      // Incompatible object types under broad generic category (e.g. Phone vs Mouse in Electronics)
      categoryScore = 10;
    } else {
      categoryScore = 30;
    }
  } else {
    // Related categories partial credit
    const relatedGroups: string[][] = [
      ['id cards', 'documents', 'wallet'],
      ['books & stationery', 'documents'],
      ['electronics', 'other'],
      ['clothing', 'bags'],
      ['wallet', 'bags']
    ];

    for (const group of relatedGroups) {
      if (group.includes(catA) && group.includes(catB)) {
        // If both are documents/cards or share cluster
        if (clusterA && clusterB && clusterA === clusterB) {
          categoryScore = 25;
        } else {
          categoryScore = 18;
        }
        break;
      }
    }
  }

  // 2. Location Matching (Max 25 points)
  const locationScore = calculateLocationScore(itemA, itemB);

  // 3. Date Proximity (Max 20 points)
  // Rubric:
  // - Same date: 20 pts
  // - Within 1 day: 18 pts
  // - Within 3 days: 15 pts
  // - Within 7 days: 10 pts
  // - Within 14 days: 5 pts
  // - More than 14 days: 0 pts
  let dateScore = 0;
  try {
    const timeA = new Date(itemA.date).getTime();
    const timeB = new Date(itemB.date).getTime();
    const diffDays = Math.round(Math.abs(timeA - timeB) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      dateScore = 20;
    } else if (diffDays <= 1) {
      dateScore = 18;
    } else if (diffDays <= 3) {
      dateScore = 15;
    } else if (diffDays <= 7) {
      dateScore = 10;
    } else if (diffDays <= 14) {
      dateScore = 5;
    } else {
      dateScore = 0;
    }
  } catch {
    dateScore = 10;
  }

  // 4. Color Matching (Max 15 points)
  let colorScore = 0;
  const colorA = (itemA.color || '').trim().toLowerCase();
  const colorB = (itemB.color || '').trim().toLowerCase();

  if (colorA && colorB && colorA !== 'other' && colorB !== 'other') {
    if (colorA === colorB || colorA.includes(colorB) || colorB.includes(colorA)) {
      colorScore = 15;
    } else if (areColorsInSameFamily(colorA, colorB)) {
      colorScore = 14;
    } else if (
      itemA.description.toLowerCase().includes(colorB) ||
      itemB.description.toLowerCase().includes(colorA) ||
      itemA.itemName.toLowerCase().includes(colorB) ||
      itemB.itemName.toLowerCase().includes(colorA)
    ) {
      colorScore = 12;
    }
  } else if (!colorA || !colorB || colorA === 'other' || colorB === 'other') {
    colorScore = 5;
  }

  // 5. Keyword & Title Similarity (Max 10 points)
  let keywordsScore = 0;
  const titleTokensA = extractTokens(itemA.itemName);
  const titleTokensB = extractTokens(itemB.itemName);
  const titleShared = titleTokensA.filter(t => titleTokensB.includes(t));

  const allTokensA = extractTokens(`${itemA.itemName} ${itemA.description} ${itemA.keywords || ''}`);
  const allTokensB = extractTokens(`${itemB.itemName} ${itemB.description} ${itemB.keywords || ''}`);
  const matchingTokens = allTokensA.filter(token => allTokensB.includes(token));

  // High title affinity check
  if (titleShared.length >= 2 || (clusterA && clusterB && clusterA === clusterB)) {
    keywordsScore = 10;
  } else if (titleShared.length === 1) {
    keywordsScore = 8;
  } else if (matchingTokens.length >= 3) {
    keywordsScore = 10;
  } else if (matchingTokens.length === 2) {
    keywordsScore = 7;
  } else if (matchingTokens.length === 1) {
    keywordsScore = 4;
  }

  // Calculate raw total
  let totalScore = Math.round(categoryScore + locationScore + dateScore + colorScore + keywordsScore);

  // False positive safeguard: If clusters directly conflict and there is 0 keyword and 0 color overlap,
  // cap total score below the 60% threshold
  if (hasConflictingClusters && keywordsScore === 0 && colorScore === 0) {
    totalScore = Math.min(totalScore, 45);
  }

  totalScore = Math.min(100, Math.max(0, totalScore));

  // Classifications matching Section 2 & 11:
  // 85–100 points: Strong Match
  // 60–84 points:  Possible Match (Threshold >= 60)
  // Below 60 points: Low Match
  let matchStrength: MatchStrength = 'Low Match';
  if (totalScore >= 85) {
    matchStrength = 'Strong Match';
  } else if (totalScore >= 60) {
    matchStrength = 'Possible Match';
  }

  const isPossibleMatch = totalScore >= 60;

  return {
    categoryScore,
    locationScore,
    dateScore,
    colorScore,
    keywordsScore,
    totalScore,
    matchStrength,
    isPossibleMatch,
    matchedItem: itemB
  };
}

export function getMatchStrengthDetails(strength: MatchStrength) {
  switch (strength) {
    case 'Very Strong Match':
    case 'Strong Match':
      return {
        label: 'Strong Match',
        badgeBg: 'bg-emerald-600 text-white',
        cardBorder: 'border-emerald-400 ring-1 ring-emerald-400/30',
        textClass: 'text-emerald-700 font-bold',
        pillBg: 'bg-emerald-100 text-emerald-800'
      };
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
        label: 'Low Match',
        badgeBg: 'bg-slate-500 text-white',
        cardBorder: 'border-slate-200',
        textClass: 'text-slate-600',
        pillBg: 'bg-slate-100 text-slate-700'
      };
  }
}

/**
 * Detects whether an item belongs to a recognized physical object cluster
 */
function detectObjectCluster(item: Item): string | null {
  const combinedText = `${item.itemName} ${item.description} ${item.keywords || ''}`.toLowerCase();
  
  for (const [clusterKey, keywords] of Object.entries(OBJECT_CLUSTERS)) {
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(combinedText)) {
        return clusterKey;
      }
    }
  }
  return null;
}

/**
 * Checks if two color strings belong to the same perceptual color family (e.g. Silver = Grey)
 */
function areColorsInSameFamily(colA: string, colB: string): boolean {
  for (const list of Object.values(COLOR_FAMILIES)) {
    const hasA = list.some(c => colA.includes(c));
    const hasB = list.some(c => colB.includes(c));
    if (hasA && hasB) return true;
  }
  return false;
}

/**
 * Helper to identify specific Computer Science department rooms
 */
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
 * - Exact same location: 25 points
 * - CS1 !== CS2
 * - Lab A !== Lab B
 * - Same general area but different specific location: 10 points
 * - Different location: 0 points
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
    // Same general department, different specific lab -> partial 10 points
    return 10;
  }

  // 2. Conflict check: CS1 vs CS2 (both in CS, but different classrooms)
  if ((aCS1 && bCS2) || (aCS2 && bCS1)) {
    // Same general department, different classroom -> partial 10 points
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
      return 23;
    }
  }

  // 10. Check if same general area (e.g. Computer Science Department)
  if (areaA && areaB && areaA === areaB) {
    return 10; // Same general area, different room
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
 * Normalizes campus location names and abbreviations
 */
function cleanLocation(str: string): string {
  if (!str) return '';
  
  let text = str.toLowerCase();

  // Normalize college acronyms & abbreviations
  text = text
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

/**
 * Normalizes and extracts meaningful tokens with simple singularization
 */
function extractTokens(text: string): string[] {
  if (!text) return [];

  const stopWords = new Set([
    'a', 'an', 'the', 'in', 'on', 'at', 'with', 'by', 'for', 'of', 'and', 'or', 'is', 'it', 'was',
    'has', 'had', 'lost', 'found', 'please', 'help', 'near', 'some', 'item', 'my', 'left', 'keep'
  ]);

  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .map(w => {
          // Simple singularization
          if (w.endsWith('s') && w.length > 3 && !w.endsWith('ss')) {
            return w.slice(0, -1);
          }
          return w;
        })
        .filter(w => w.length > 2 && !stopWords.has(w))
    )
  );
}

/**
 * Finds all matching candidates for an item from a list of items.
 * If candidate is LOST, we match against active FOUND items.
 * If candidate is FOUND, we match against active LOST items.
 */
export function findMatches(item: Item, allItems: Item[]): MatchScoreDetails[] {
  // Ignore deleted items completely in matching
  if (item.deleted) return [];

  const oppositeType = item.type === 'LOST' ? 'FOUND' : 'LOST';

  return allItems
    .filter(other => !other.deleted && other.id !== item.id && other.type === oppositeType && other.status !== 'RECOVERED')
    .map(other => calculateMatchScore(item, other))
    .sort((a, b) => b.totalScore - a.totalScore);
}
