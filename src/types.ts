export type ItemType = 'LOST' | 'FOUND';

export type ItemStatus = 'ACTIVE' | 'MATCHED' | 'CLAIMED' | 'RECOVERED' | 'CLOSED';

export type Category = 
  | 'ID Cards'
  | 'Electronics'
  | 'Documents'
  | 'Wallet'
  | 'Keys'
  | 'Bags'
  | 'Clothing'
  | 'Books & Stationery'
  | 'Other';

export interface User {
  id: string;
  name: string;
  email?: string;
  emailVerified?: boolean;
  phone?: string;
  role: 'student' | 'staff' | 'admin';
  studentId?: string;
  course?: string;
  department?: string;
  year?: string;
  division?: string;
  designation?: string;
  password?: string;
  avatar?: string;
  createdAt: string;
  isBlocked?: boolean;
  isRestricted?: boolean;
  isDeleted?: boolean;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  status?: string;
}

export interface CampusLocation {
  id: string;
  area: string;
  name: string;
  isActive: boolean;
  description?: string;
}

export interface Item {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  userContactPref: 'in-app' | 'email' | 'phone';
  userEmail?: string;
  userPhone?: string;
  type: ItemType;
  itemName: string;
  category: Category;
  description: string;
  location: string;
  area?: string;
  subLocation?: string;
  specificLocation?: string;
  date: string; // YYYY-MM-DD
  time?: string;
  image: string;
  color: string;
  keywords?: string; // Comma separated or space separated tags
  status: ItemStatus;
  currentStorageLocation?: string; // For FOUND items: e.g. "Library Desk", "Security Office"
  additionalInfo?: string;
  isVerifiedByAdmin?: boolean;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  isReportedSuspicious?: boolean;
  recoveredAt?: string; // When item was successfully recovered
  deleted?: boolean; // Soft delete flag
  deletedAt?: string; // Timestamp when soft deleted by admin
  deletedBy?: string; // ID of admin who deleted the report
  createdAt: string;
}

export type MatchStrength = 'Very Strong Match' | 'Strong Match' | 'Possible Match' | 'Low Match' | 'High confidence' | 'Possible match' | 'Low confidence';
export type MatchConfidenceLevel = 'High confidence' | 'Possible match' | 'Low confidence';

export interface MatchScoreDetails {
  categoryScore: number; // Max 25
  locationScore: number; // Max 25
  dateScore: number;     // Max 15
  colorScore: number;    // Max 10
  keywordsScore: number; // Max 25 (NLP Semantic & Text Similarity)
  nlpScore?: number;     // Direct NLP Semantic similarity percentage (0 - 100)
  totalScore: number;    // Max 100
  matchStrength: MatchStrength;
  confidenceLevel: MatchConfidenceLevel;
  isPossibleMatch: boolean; // >= 60 (Possible Match starts at 60%)
  matchedItem: Item;
  matchFactors: string[];   // Important factors (e.g. "Similar item description", "Same color", "Same location", "Similar category")
  explanation?: string;
}

export interface StoredMatch {
  id: string; // `${lostItemId}_${foundItemId}` immutable report pair identifier
  lostItemId: string;
  foundItemId: string;
  lostItem?: Item;
  foundItem?: Item;
  categoryScore: number;
  locationScore: number;
  dateScore: number;
  colorScore: number;
  keywordsScore: number;
  nlpScore: number;
  totalScore: number;
  matchStrength: MatchStrength;
  confidenceLevel: MatchConfidenceLevel;
  isPossibleMatch: boolean;
  matchFactors: string[];
  explanation: string;
  calculatedAt: string;
}

export interface Claim {
  id: string;
  itemId: string;
  itemName: string;
  itemType: ItemType;
  claimantId: string;
  claimantName: string;
  claimantEmail?: string;
  claimantStudentId?: string;
  claimantDepartment?: string;
  claimantPhone?: string;
  ownerId: string; // The person who reported the item
  ownerName: string;
  message: string; // Proof / explanation of ownership
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string; // Handover verification notes by reviewer
  handoverLocation?: string; // Location where physical handover is authorized
}

export interface ActivityLog {
  id: string;
  userId: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'MATCH' | 'CLAIM' | 'RECOVERY' | 'STATUS' | 'MODERATION';
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName?: string;
  itemId: string;
  itemName: string;
  itemType: ItemType;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface ModerationReport {
  id: string;
  itemId: string;
  reportedBy: string;
  reason: string;
  createdAt: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
}
