/**
 * NLP Preprocessing & Semantic Similarity Engine for FindIt
 * Smart Lost & Found Management System - Ismail Yusuf College
 *
 * Implements:
 * 1. Text normalization: Lowercasing, punctuation stripping, contraction expansion.
 * 2. Tokenization & stop words removal.
 * 3. Morphological stemming & singular/plural lemmatization.
 * 4. Synonym & Concept ontology (e.g. earbuds <-> earphones, wallet <-> purse, mobile <-> smartphone).
 * 5. Entity extraction (Item concept, Brand, Color, Connectivity, Location cues).
 * 6. Soft-Cosine / Semantic Word Alignment matching with n-gram recognition.
 * 7. Transparent factor explanation for academic project viva.
 */

// ----------------------------------------------------
// 1. STOP WORDS & NOISE FILTER
// ----------------------------------------------------
export const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
  'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me',
  'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only',
  'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so',
  'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
  'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  // Domain noise words in lost & found reports
  'lost', 'found', 'please', 'help', 'contact', 'anyone', 'someone', 'kindly', 'inform', 'finder',
  'owner', 'yesterday', 'today', 'somewhere', 'anywhere', 'item', 'thing', 'stuff', 'looking',
  'reward', 'return', 'keep', 'kept', 'handed', 'handover', 'belonging', 'belongs', 'left', 'around',
  'near', 'inside', 'outside', 'side', 'got', 'saw'
]);

// ----------------------------------------------------
// 2. LEMMA DICTIONARY & STEMMING
// ----------------------------------------------------
const IRREGULAR_LEMMAS: Record<string, string> = {
  earbuds: 'earbud',
  earphones: 'earphone',
  headphones: 'headphone',
  airpods: 'airpod',
  airdopes: 'airdope',
  glasses: 'glass',
  spectacles: 'spectacle',
  specs: 'spec',
  sunglasses: 'sunglass',
  keys: 'key',
  keychains: 'keychain',
  wallets: 'wallet',
  purses: 'purse',
  pouches: 'pouch',
  phones: 'phone',
  smartphones: 'smartphone',
  cellphones: 'cellphone',
  mobiles: 'mobile',
  laptops: 'laptop',
  notebooks: 'notebook',
  macbooks: 'macbook',
  chargers: 'charger',
  cables: 'cable',
  adapters: 'adapter',
  wires: 'wire',
  bottles: 'bottle',
  flasks: 'flask',
  tumblers: 'tumbler',
  watches: 'watch',
  smartwatches: 'smartwatch',
  cards: 'card',
  documents: 'document',
  tickets: 'ticket',
  passes: 'pass',
  books: 'book',
  registers: 'register',
  diaries: 'diary',
  umbrellas: 'umbrella',
  bags: 'bag',
  backpacks: 'backpack',
  rucksacks: 'rucksack',
  pencils: 'pencil',
  pens: 'pen'
};

/**
 * Normalizes singular/plural variations and common suffixes
 */
export function lemmatizeToken(word: string): string {
  if (!word) return '';
  const lower = word.toLowerCase().trim();
  if (IRREGULAR_LEMMAS[lower]) return IRREGULAR_LEMMAS[lower];

  // Plurals ending in ies -> y (e.g. batteries -> battery)
  if (lower.endsWith('ies') && lower.length > 4) {
    return lower.slice(0, -3) + 'y';
  }
  // Plurals ending in es (e.g. watches -> watch, boxes -> box)
  if (lower.endsWith('es') && lower.length > 4) {
    if (lower.endsWith('ches') || lower.endsWith('shes') || lower.endsWith('xes')) {
      return lower.slice(0, -2);
    }
  }
  // Regular -s (e.g. cables -> cable, laptops -> laptop)
  if (lower.endsWith('s') && lower.length > 3 && !lower.endsWith('ss')) {
    return lower.slice(0, -1);
  }

  return lower;
}

// ----------------------------------------------------
// 3. SEMANTIC CONCEPT TAXONOMY & SYNONYMS
// ----------------------------------------------------
export interface ConceptGroup {
  id: string;
  name: string;
  categoryHint: string;
  synonyms: string[];
}

export const CONCEPT_GROUPS: ConceptGroup[] = [
  {
    id: 'audio_earpiece',
    name: 'Audio Earpieces & Earphones',
    categoryHint: 'electronics',
    synonyms: [
      'earbud', 'earbuds', 'earphone', 'earphones', 'headphone', 'headphones', 'headset',
      'airpod', 'airpods', 'airdope', 'airdopes', 'bud', 'buds', 'earpiece', 'neckband',
      'tws', 'earpod', 'earpods', 'in-ear', 'inear', 'handsfree', 'hearable'
    ]
  },
  {
    id: 'mobile_device',
    name: 'Mobile Phone & Smartphone',
    categoryHint: 'electronics',
    synonyms: [
      'smartphone', 'smartphones', 'phone', 'phones', 'mobile', 'mobiles', 'cellphone',
      'cellphones', 'cell', 'handset', 'cellular', 'iphone', 'android'
    ]
  },
  {
    id: 'money_container',
    name: 'Wallet & Purse',
    categoryHint: 'wallet',
    synonyms: [
      'wallet', 'wallets', 'purse', 'purses', 'billfold', 'pouch', 'pouches', 'clutch',
      'moneybag', 'moneyclip', 'coinpurse', 'pocketbook'
    ]
  },
  {
    id: 'portable_computer',
    name: 'Laptop & Notebook',
    categoryHint: 'electronics',
    synonyms: [
      'laptop', 'laptops', 'notebook', 'notebooks', 'macbook', 'macbooks', 'chromebook',
      'thinkpad', 'ultrabook', 'pc'
    ]
  },
  {
    id: 'bag_container',
    name: 'Backpack & Bag',
    categoryHint: 'bags',
    synonyms: [
      'backpack', 'backpacks', 'bag', 'bags', 'rucksack', 'rucksacks', 'knapsack',
      'satchel', 'duffel', 'tote', 'kitbag', 'schoolbag', 'briefcase'
    ]
  },
  {
    id: 'keys_bundle',
    name: 'Keys & Keychain',
    categoryHint: 'other',
    synonyms: [
      'key', 'keys', 'keychain', 'keychains', 'keyring', 'keyrings', 'fob', 'keyfob',
      'bunch of keys', 'bike key', 'car key'
    ]
  },
  {
    id: 'eyewear',
    name: 'Glasses & Spectacles',
    categoryHint: 'other',
    synonyms: [
      'spectacle', 'spectacles', 'spec', 'specs', 'glass', 'glasses', 'sunglass',
      'sunglasses', 'goggle', 'goggles', 'shade', 'shades', 'eyewear', 'sunnies', 'frame', 'frames'
    ]
  },
  {
    id: 'timepiece',
    name: 'Watch & Smartwatch',
    categoryHint: 'electronics',
    synonyms: [
      'watch', 'watches', 'smartwatch', 'smartwatches', 'wristwatch', 'timepiece',
      'fitbit', 'band', 'smartband'
    ]
  },
  {
    id: 'personal_card',
    name: 'ID Card & Document',
    categoryHint: 'id cards',
    synonyms: [
      'id', 'card', 'identity', 'hallticket', 'admitcard', 'license', 'pass', 'collegeid',
      'aadhar', 'aadhaar', 'pancard', 'ticket', 'smartcard'
    ]
  },
  {
    id: 'power_accessory',
    name: 'Charger & Power Cable',
    categoryHint: 'electronics',
    synonyms: [
      'charger', 'chargers', 'adapter', 'adapters', 'cable', 'cables', 'wire', 'wires',
      'powerbank', 'power cord', 'lightning cable', 'type-c', 'type c', 'usb-c', 'cord'
    ]
  },
  {
    id: 'hydration',
    name: 'Water Bottle & Flask',
    categoryHint: 'other',
    synonyms: [
      'bottle', 'bottles', 'flask', 'flasks', 'sipper', 'sippers', 'thermos', 'tumbler',
      'tumblers', 'waterbottle', 'canteen'
    ]
  },
  {
    id: 'stationery',
    name: 'Book, Notebook & Stationery',
    categoryHint: 'books & stationery',
    synonyms: [
      'book', 'books', 'notebook', 'notebooks', 'register', 'registers', 'diary', 'diaries',
      'textbook', 'journal', 'pen', 'pencil', 'notes'
    ]
  },
  {
    id: 'umbrella_gear',
    name: 'Umbrella & Rainwear',
    categoryHint: 'other',
    synonyms: ['umbrella', 'umbrellas', 'raincoat', 'parasol']
  },
  {
    id: 'computer_mouse',
    name: 'Computer Mouse',
    categoryHint: 'electronics',
    synonyms: ['mouse', 'mice', 'trackpad', 'pointer', 'optical mouse', 'wireless mouse']
  },
  {
    id: 'computer_keyboard',
    name: 'Computer Keyboard',
    categoryHint: 'electronics',
    synonyms: ['keyboard', 'keyboards', 'keypad', 'mechanical keyboard']
  },
  {
    id: 'calculator_device',
    name: 'Calculator',
    categoryHint: 'electronics',
    synonyms: ['calculator', 'calculators', 'scientific calculator', 'casio fx']
  },
  {
    id: 'storage_drive',
    name: 'Flash Drive & Storage',
    categoryHint: 'electronics',
    synonyms: ['pendrive', 'pen drive', 'usb drive', 'flash drive', 'hard drive', 'ssd', 'thumb drive']
  }
];

// ----------------------------------------------------
// 4. SYNONYM MAP (Direct pairwise synonym lookup)
// ----------------------------------------------------
const DIRECT_SYNONYMS: Record<string, string[]> = {
  // Audio
  earbud: ['earphone', 'headphone', 'airpod', 'airdope', 'bud', 'headset', 'earpiece'],
  earphone: ['earbud', 'headphone', 'airpod', 'airdope', 'bud', 'headset', 'earpiece'],
  headphone: ['earphone', 'earbud', 'headset', 'airpod'],
  airpod: ['earbud', 'earphone', 'headphone', 'airdope', 'bud'],
  airdope: ['earbud', 'earphone', 'airpod', 'bud'],
  // Devices
  mobile: ['smartphone', 'phone', 'cellphone', 'handset'],
  smartphone: ['mobile', 'phone', 'cellphone', 'handset'],
  phone: ['mobile', 'smartphone', 'cellphone', 'handset'],
  cellphone: ['mobile', 'smartphone', 'phone', 'handset'],
  laptop: ['notebook', 'macbook', 'chromebook', 'thinkpad'],
  notebook: ['laptop', 'macbook', 'register', 'diary'],
  // Wallet / Bags
  wallet: ['purse', 'billfold', 'pouch', 'pocketbook', 'moneyclip'],
  purse: ['wallet', 'pouch', 'billfold', 'clutch', 'handbag'],
  backpack: ['bag', 'rucksack', 'knapsack', 'satchel'],
  bag: ['backpack', 'rucksack', 'satchel', 'tote', 'duffel'],
  // Connectivity
  wireless: ['bluetooth', 'tws', 'cordless'],
  bluetooth: ['wireless', 'tws', 'cordless'],
  wired: ['corded', 'cable'],
  // Eyewear
  spectacle: ['glass', 'spec', 'eyewear', 'sunglass'],
  glass: ['spectacle', 'spec', 'eyewear'],
  spec: ['spectacle', 'glass', 'eyewear'],
  sunglass: ['shade', 'goggle', 'spectacle'],
  // Hydration
  bottle: ['flask', 'sipper', 'thermos', 'tumbler'],
  flask: ['bottle', 'sipper', 'thermos'],
  // Identification
  id: ['card', 'identity', 'pass', 'hallticket', 'admitcard'],
  card: ['id', 'pass', 'identity'],
  identity: ['id', 'card', 'pass']
};

// ----------------------------------------------------
// 5. BRAND ENTITIES
// ----------------------------------------------------
export const BRAND_ENTITIES = [
  'boat', 'apple', 'samsung', 'sony', 'jbl', 'oneplus', 'noise', 'boult', 'realme', 'xiaomi',
  'redmi', 'poco', 'vivo', 'oppo', 'google', 'pixel', 'motorola', 'nothing', 'dell', 'hp',
  'lenovo', 'asus', 'acer', 'msi', 'titan', 'fastrack', 'casio', 'fossil', 'timex', 'milton',
  'cello', 'tupperware', 'camel', 'parker', 'classmate', 'trimax', 'reynolds', 'wildcraft',
  'skybags', 'american tourister', 'safari', 'puma', 'nike', 'adidas', 'sparx', 'bata'
];

// ----------------------------------------------------
// 6. COLOR RECOGNITION & FAMILIES
// ----------------------------------------------------
export const COLOR_TAXONOMY: Record<string, string[]> = {
  black: ['black', 'dark', 'charcoal', 'matte black', 'obsidian', 'jet black'],
  blue: ['blue', 'navy', 'cyan', 'sky blue', 'indigo', 'azure', 'denim', 'royal blue'],
  grey: ['grey', 'gray', 'silver', 'metallic', 'steel', 'titanium', 'space grey'],
  silver: ['silver', 'grey', 'gray', 'metallic', 'aluminum'],
  white: ['white', 'cream', 'off-white', 'ivory'],
  red: ['red', 'maroon', 'crimson', 'burgundy', 'rose', 'pink'],
  brown: ['brown', 'tan', 'beige', 'khaki', 'coffee', 'chocolate'],
  green: ['green', 'olive', 'mint', 'emerald', 'teal'],
  yellow: ['yellow', 'golden', 'gold', 'amber', 'mustard'],
  orange: ['orange', 'peach', 'coral'],
  purple: ['purple', 'violet', 'lavender', 'magenta']
};

// ----------------------------------------------------
// 7. LOCATION NORMALIZATION MAPPINGS
// ----------------------------------------------------
export const LOCATION_SYNONYMS: Record<string, string> = {
  'cs': 'computer science',
  'comp sci': 'computer science',
  'audi': 'auditorium',
  'lib': 'library',
  'canteen': 'cafeteria',
  'cafeteria': 'canteen',
  'mess': 'canteen',
  'gym': 'gymkhana',
  'gymkhana': 'sports ground',
  'lab a': 'lab a',
  'laboratory a': 'lab a',
  'cs lab a': 'computer science lab a',
  'cs lab b': 'computer science lab b',
  'cs1': 'classroom 1',
  'cs 1': 'classroom 1',
  'cs2': 'classroom 2',
  'cs 2': 'classroom 2'
};

// ----------------------------------------------------
// 8. TEXT PREPROCESSING PIPELINE
// ----------------------------------------------------

/**
 * Expand contractions and standard English abbreviations
 */
export function expandContractions(text: string): string {
  return text
    .replace(/won['’]t/gi, 'will not')
    .replace(/can['’]t/gi, 'cannot')
    .replace(/n['’]t/gi, ' not')
    .replace(/['’]re/gi, ' are')
    .replace(/['’]s/gi, ' is')
    .replace(/['’]d/gi, ' would')
    .replace(/['’]ll/gi, ' will')
    .replace(/['’]t/gi, ' not')
    .replace(/['’]ve/gi, ' have')
    .replace(/['’]m/gi, ' am');
}

/**
 * Tokenize and normalize text into clean, lemmatized tokens
 */
export function preprocessText(text: string): string[] {
  if (!text) return [];

  const expanded = expandContractions(text);
  // Replace punctuation with space, keeping alphanumerics and hyphens
  const cleaned = expanded
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rawTokens = cleaned.split(' ');
  const tokens: string[] = [];

  for (const raw of rawTokens) {
    // Handle hyphenated tokens like "type-c" or "in-ear"
    if (raw.includes('-')) {
      const parts = raw.split('-');
      for (const p of parts) {
        const lem = lemmatizeToken(p);
        if (lem && lem.length > 1 && !STOP_WORDS.has(lem)) {
          tokens.push(lem);
        }
      }
      const combined = raw.replace('-', '');
      if (combined.length > 2 && !STOP_WORDS.has(combined)) {
        tokens.push(combined);
      }
      continue;
    }

    const lem = lemmatizeToken(raw);
    if (lem && lem.length > 1 && !STOP_WORDS.has(lem)) {
      tokens.push(lem);
    }
  }

  return Array.from(new Set(tokens));
}

// ----------------------------------------------------
// 9. ENTITY EXTRACTION
// ----------------------------------------------------
export interface ExtractedEntities {
  itemNameNormalized: string[];
  primaryConcept: ConceptGroup | null;
  brand: string | null;
  colors: string[];
  connectivity: 'wireless' | 'wired' | null;
  locationNormalized: string;
  distinctiveTokens: string[];
}

export function extractEntities(item: {
  itemName: string;
  description: string;
  category?: string;
  color?: string;
  location?: string;
  keywords?: string;
}): ExtractedEntities {
  const combinedText = `${item.itemName} ${item.description} ${item.keywords || ''} ${item.color || ''}`.toLowerCase();
  const tokens = preprocessText(combinedText);

  // 1. Detect Brand
  let detectedBrand: string | null = null;
  for (const b of BRAND_ENTITIES) {
    const regex = new RegExp(`\\b${b}\\b`, 'i');
    if (regex.test(combinedText)) {
      detectedBrand = b;
      break;
    }
  }

  // 2. Detect Primary Concept Group
  let detectedConcept: ConceptGroup | null = null;
  let bestConceptScore = 0;

  const itemNameLower = (item.itemName || '').toLowerCase();
  for (const group of CONCEPT_GROUPS) {
    let score = 0;
    for (const syn of group.synonyms) {
      const regex = new RegExp(`\\b${syn.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(itemNameLower)) {
        score += 6; // Item name match has highest priority
      } else if (regex.test(combinedText)) {
        score += 2;
      }
    }
    if (score > bestConceptScore) {
      bestConceptScore = score;
      detectedConcept = group;
    }
  }

  // 3. Detect Colors
  const detectedColors: string[] = [];
  for (const [canonicalColor, aliases] of Object.entries(COLOR_TAXONOMY)) {
    for (const alias of aliases) {
      const regex = new RegExp(`\\b${alias}\\b`, 'i');
      if (regex.test(combinedText)) {
        if (!detectedColors.includes(canonicalColor)) {
          detectedColors.push(canonicalColor);
        }
        break;
      }
    }
  }

  // 4. Detect Connectivity
  let connectivity: 'wireless' | 'wired' | null = null;
  if (/\b(wireless|bluetooth|tws|cordless|airpods|airpod|airdopes)\b/i.test(combinedText)) {
    connectivity = 'wireless';
  } else if (/\b(wired|corded|3\.5mm|aux)\b/i.test(combinedText)) {
    connectivity = 'wired';
  }

  // 5. Clean Location
  let locClean = (item.location || '').toLowerCase();
  for (const [abbr, expanded] of Object.entries(LOCATION_SYNONYMS)) {
    const reg = new RegExp(`\\b${abbr}\\b`, 'gi');
    locClean = locClean.replace(reg, expanded);
  }

  return {
    itemNameNormalized: preprocessText(item.itemName),
    primaryConcept: detectedConcept,
    brand: detectedBrand,
    colors: detectedColors,
    connectivity,
    locationNormalized: locClean.trim(),
    distinctiveTokens: tokens
  };
}

// ----------------------------------------------------
// 10. TOKEN SEMANTIC SIMILARITY (Word alignment)
// ----------------------------------------------------

/**
 * Calculates semantic similarity between two individual tokens (0.0 to 1.0)
 */
export function tokenSemanticSimilarity(t1: string, t2: string): number {
  if (!t1 || !t2) return 0;
  if (t1 === t2) return 1.0;

  const lem1 = lemmatizeToken(t1);
  const lem2 = lemmatizeToken(t2);
  if (lem1 === lem2) return 1.0;

  // Direct synonym lookup
  if (DIRECT_SYNONYMS[lem1]?.includes(lem2) || DIRECT_SYNONYMS[lem2]?.includes(lem1)) {
    return 0.95;
  }

  // Check if both belong to the same Concept Group
  for (const group of CONCEPT_GROUPS) {
    const has1 = group.synonyms.includes(lem1) || group.synonyms.includes(t1);
    const has2 = group.synonyms.includes(lem2) || group.synonyms.includes(t2);
    if (has1 && has2) {
      return 0.92;
    }
  }

  // Connectivity synonyms
  const wirelessTerms = ['wireless', 'bluetooth', 'tws', 'cordless'];
  if (wirelessTerms.includes(lem1) && wirelessTerms.includes(lem2)) {
    return 0.95;
  }

  // Substring overlap (e.g. "earphone" vs "phone" is NOT the same, but "airpods" vs "airpod" is)
  if (t1.length > 4 && t2.length > 4) {
    if (t1.startsWith(t2) || t2.startsWith(t1)) {
      return 0.85;
    }
  }

  // Levenshtein distance for typos (e.g. "earphone" vs "earfone")
  const dist = levenshteinDistance(t1, t2);
  const maxLen = Math.max(t1.length, t2.length);
  if (maxLen > 4 && dist === 1) {
    return 0.88;
  }

  return 0.0;
}

/**
 * Levenshtein distance helper
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + 1   // substitution
        );
      }
    }
  }
  return dp[m][n];
}

// ----------------------------------------------------
// 11. SEMANTIC SIMILARITY FOR DESCRIPTIONS (NLP Score)
// ----------------------------------------------------

export interface SemanticComparisonResult {
  score: number; // 0 to 100 percentage
  tokenScore: number; // 0 to 100
  titleScore: number; // 0 to 100
  conceptMatch: boolean;
  sharedConceptName?: string;
  brandRelationship: 'match' | 'conflict' | 'neutral';
  connectivityMatch: boolean;
  explanation: string;
}

/**
 * Calculates a semantic similarity score between two text reports using NLP techniques:
 * - Word alignment across descriptions and titles
 * - Synonym expansion (e.g. "earbuds" <-> "earphones")
 * - Concept cluster matching
 * - Brand verification
 */
export function calculateTextSemanticSimilarity(
  itemA: { itemName: string; description: string; keywords?: string; color?: string; location?: string },
  itemB: { itemName: string; description: string; keywords?: string; color?: string; location?: string }
): SemanticComparisonResult {
  const entityA = extractEntities(itemA);
  const entityB = extractEntities(itemB);

  // 1. Title Semantic Alignment
  const titleTokensA = entityA.itemNameNormalized;
  const titleTokensB = entityB.itemNameNormalized;

  let titleMatchSum = 0;
  let titleTotalWeight = 0;

  for (const tA of titleTokensA) {
    let maxSim = 0;
    for (const tB of titleTokensB) {
      const sim = tokenSemanticSimilarity(tA, tB);
      if (sim > maxSim) maxSim = sim;
    }
    titleMatchSum += maxSim;
    titleTotalWeight += 1;
  }

  for (const tB of titleTokensB) {
    let maxSim = 0;
    for (const tA of titleTokensA) {
      const sim = tokenSemanticSimilarity(tB, tA);
      if (sim > maxSim) maxSim = sim;
    }
    titleMatchSum += maxSim;
    titleTotalWeight += 1;
  }

  const titleScore = titleTotalWeight > 0 ? (titleMatchSum / titleTotalWeight) * 100 : 0;

  // 2. Full Description Semantic Alignment (Soft Cosine)
  const fullTokensA = entityA.distinctiveTokens;
  const fullTokensB = entityB.distinctiveTokens;

  let fullMatchSum = 0;
  let fullTotalWeight = 0;

  for (const tA of fullTokensA) {
    let maxSim = 0;
    for (const tB of fullTokensB) {
      const sim = tokenSemanticSimilarity(tA, tB);
      if (sim > maxSim) maxSim = sim;
    }
    // Weight terms: Brand terms & device terms receive higher weight
    const weight = BRAND_ENTITIES.includes(tA) ? 1.8 : 1.0;
    fullMatchSum += maxSim * weight;
    fullTotalWeight += weight;
  }

  for (const tB of fullTokensB) {
    let maxSim = 0;
    for (const tA of fullTokensA) {
      const sim = tokenSemanticSimilarity(tB, tA);
      if (sim > maxSim) maxSim = sim;
    }
    const weight = BRAND_ENTITIES.includes(tB) ? 1.8 : 1.0;
    fullMatchSum += maxSim * weight;
    fullTotalWeight += weight;
  }

  const tokenScore = fullTotalWeight > 0 ? (fullMatchSum / fullTotalWeight) * 100 : 0;

  // 3. Concept Group Evaluation
  let conceptMatch = false;
  let sharedConceptName: string | undefined;

  if (entityA.primaryConcept && entityB.primaryConcept) {
    if (entityA.primaryConcept.id === entityB.primaryConcept.id) {
      conceptMatch = true;
      sharedConceptName = entityA.primaryConcept.name;
    }
  }

  // 4. Brand Relationship
  let brandRelationship: 'match' | 'conflict' | 'neutral' = 'neutral';
  if (entityA.brand && entityB.brand) {
    if (entityA.brand === entityB.brand) {
      brandRelationship = 'match';
    } else {
      brandRelationship = 'conflict';
    }
  }

  // 5. Connectivity Alignment
  let connectivityMatch = false;
  if (entityA.connectivity && entityB.connectivity) {
    if (entityA.connectivity === entityB.connectivity) {
      connectivityMatch = true;
    }
  }

  // 6. Aggregate Semantic Score (0 to 100)
  // Weighted: 40% Title alignment + 40% Description alignment + 20% Concept/Feature boost
  let rawScore = (titleScore * 0.45) + (tokenScore * 0.40);

  // If both share the exact same conceptual class (e.g. earbuds <-> earphones, or wallet <-> purse)
  if (conceptMatch) {
    rawScore = Math.max(rawScore, 65);
    rawScore += 15;
  }

  // Brand boosts or penalties
  if (brandRelationship === 'match') {
    rawScore += 15;
  } else if (brandRelationship === 'conflict') {
    rawScore = Math.min(rawScore, 35); // Conflicting brands (e.g. Apple vs Samsung) sharply drops similarity
  }

  if (connectivityMatch) {
    rawScore += 5;
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Generate clear explanation
  const explanations: string[] = [];
  if (conceptMatch && sharedConceptName) {
    explanations.push(`Semantically matched as ${sharedConceptName}`);
  }
  if (brandRelationship === 'match' && entityA.brand) {
    explanations.push(`Identified common brand: ${entityA.brand.toUpperCase()}`);
  }
  if (connectivityMatch && entityA.connectivity) {
    explanations.push(`Matching connectivity type: ${entityA.connectivity}`);
  }

  return {
    score: finalScore,
    tokenScore: Math.round(tokenScore),
    titleScore: Math.round(titleScore),
    conceptMatch,
    sharedConceptName,
    brandRelationship,
    connectivityMatch,
    explanation: explanations.join('; ') || 'Text descriptions evaluated for lexical and semantic overlap.'
  };
}
