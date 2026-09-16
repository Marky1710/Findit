import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Item, User, Message, ModerationReport, Category, ItemType, ItemStatus, Claim, ActivityLog, CampusLocation } from '../types';
import { INITIAL_ITEMS, INITIAL_USERS, INITIAL_MESSAGES, INITIAL_MODERATION, INITIAL_CLAIMS, INITIAL_ACTIVITIES, INITIAL_LOCATIONS } from '../data/initialData';
import { validateStudentRegistration, StudentRegistrationInput, COLLEGE_COURSES, STUDY_YEARS } from '../utils/studentValidation';

export type PageView = 
  | 'home'
  | 'browse'
  | 'matches'
  | 'report-lost'
  | 'report-found'
  | 'item-details'
  | 'dashboard'
  | 'staff-dashboard'
  | 'admin'
  | 'matching-lab';

export interface BrowseFilters {
  query: string;
  type: 'ALL' | 'LOST' | 'FOUND' | 'RECOVERED';
  category: string;
  area: string;
  location: string;
  date: string;
  color: string;
  verificationStatus: 'ALL' | 'VERIFIED' | 'PENDING';
  sortBy: 'newest' | 'oldest' | 'match' | 'updated';
}

export type AuthTab = 'student-login' | 'student-register' | 'staff-login' | 'admin-login';

interface AppContextType {
  currentUser: User | null;
  allUsers: User[];
  items: Item[];
  locations: CampusLocation[];
  messages: Message[];
  claims: Claim[];
  activityLogs: ActivityLog[];
  moderationReports: ModerationReport[];
  currentPage: PageView;
  selectedItemId: string | null;
  activeContactItem: Item | null;
  activeClaimItem: Item | null;
  activeReviewClaim: Claim | null;
  activeEditItem: Item | null;
  browseFilters: BrowseFilters;
  unreadCount: number;
  pendingClaimsCount: number;
  pendingVerificationsCount: number;
  
  // Auth Modal state
  authModalOpen: boolean;
  authModalTab: AuthTab;
  openAuthModal: (tab?: AuthTab) => void;
  closeAuthModal: () => void;
  requireAuth: (action: () => void, targetTab?: AuthTab) => void;

  // Navigation & View Actions
  setCurrentPage: (page: PageView) => void;
  selectItem: (itemId: string) => void;
  openContactModal: (item: Item) => void;
  closeContactModal: () => void;
  openClaimModal: (item: Item) => void;
  closeClaimModal: () => void;
  openReviewClaimModal: (claim: Claim) => void;
  closeReviewClaimModal: () => void;
  openEditModal: (item: Item) => void;
  closeEditModal: () => void;
  setBrowseFilters: React.Dispatch<React.SetStateAction<BrowseFilters>>;
  resetFilters: () => void;
  
  // Item Operations
  addItem: (itemData: {
    type: ItemType;
    itemName: string;
    category: Category;
    description: string;
    location: string;
    area?: string;
    subLocation?: string;
    specificLocation?: string;
    date: string;
    time?: string;
    image: string;
    color: string;
    keywords?: string;
    currentStorageLocation?: string;
    additionalInfo?: string;
    userContactPref: 'in-app' | 'email' | 'phone';
  }) => string;
  updateItem: (item: Item) => void;
  deleteItem: (itemId: string) => Promise<boolean>;
  restoreItem: (itemId: string) => Promise<boolean>;
  refreshItems: () => Promise<void>;
  markAsRecovered: (itemId: string) => void;
  
  // Verification Operations
  verifyItem: (itemId: string, verifierName?: string) => void;
  rejectItemListing: (itemId: string, reason?: string) => void;

  // Campus Locations Management
  addLocation: (area: string, name: string, description?: string) => void;
  updateLocation: (id: string, updates: Partial<CampusLocation>) => void;
  toggleLocationStatus: (id: string) => void;
  
  // Claim Operations
  submitClaim: (
    itemId: string, 
    proofMessage: string, 
    details?: { studentId?: string; department?: string; phone?: string; }
  ) => void;
  approveClaim: (claimId: string, handoverNotes?: string, handoverLocation?: string) => void;
  rejectClaim: (claimId: string, rejectionReason?: string) => void;
  
  // Messaging Operations
  sendMessage: (receiverId: string, itemId: string, text: string) => void;
  markMessageRead: (messageId: string) => void;
  
  // Auth Operations
  loginStudent: (studentId: string, password?: string) => { success: boolean; error?: string };
  loginStaff: (identifier: string, password?: string) => { success: boolean; error?: string };
  loginAdmin: (identifier: string, password?: string) => { success: boolean; error?: string };
  loginWithStudentId: (studentId: string) => boolean;
  registerStudent: (studentData: StudentRegistrationInput) => { success: boolean; error?: string; errors?: Record<string, string> };
  registerStaff: (staffData: { name: string; email: string; department: string; staffId?: string; password?: string; confirmPassword?: string }) => { success: boolean; error?: string };
  registerUser: (userData: { name: string; email: string; studentId: string; phone?: string; department?: string }) => void;
  logout: () => void;
  
  // Admin Operations
  flagItem: (itemId: string, reason: string) => void;
  dismissFlag: (itemId: string) => void;
  toggleUserBlock: (userId: string) => void;
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Clean versioned storage keys — strictly starting with empty user-generated data
const STORAGE_KEYS = {
  ITEMS: 'iyc_items_v4',
  USERS: 'iyc_users_v4',
  LOCATIONS: 'iyc_locations_v4',
  MESSAGES: 'iyc_messages_v4',
  CLAIMS: 'iyc_claims_v4',
  ACTIVITIES: 'iyc_activities_v4',
  MODERATION: 'iyc_moderation_v4',
  CURRENT_USER_ID: 'iyc_current_user_v4'
};

const DEFAULT_FILTERS: BrowseFilters = {
  query: '',
  type: 'ALL',
  category: 'All',
  area: 'All',
  location: 'All',
  date: '',
  color: 'All',
  verificationStatus: 'ALL',
  sortBy: 'newest'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Purge any old fake data from prior demo storage versions if present
  useEffect(() => {
    try {
      const oldKeys = ['iyc_items_v2', 'iyc_items_v3', 'iyc_users_v2', 'iyc_claims_v2', 'iyc_messages_v2'];
      oldKeys.forEach(k => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }, []);

  // Items start strictly empty unless real items were added by user
  const [items, setItems] = useState<Item[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (saved) {
        const parsed: Item[] = JSON.parse(saved);
        // Exclude legacy demo items if any leaked in
        return parsed.filter(i => !['item-1', 'item-2', 'item-3', 'item-4', 'item-5', 'item-6', 'item-7', 'item-8', 'item-9', 'item-10', 'item-11', 'item-12'].includes(i.id));
      }
      return INITIAL_ITEMS; // []
    } catch {
      return INITIAL_ITEMS; // []
    }
  });

  const [locations, setLocations] = useState<CampusLocation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
      return saved ? JSON.parse(saved) : INITIAL_LOCATIONS;
    } catch {
      return INITIAL_LOCATIONS;
    }
  });

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      if (saved) {
        const parsed: User[] = JSON.parse(saved);
        // Exclude all old seed staff, old demo accounts, old demo students, and Kulkarni
        const cleaned = parsed.filter(u => {
          const nameLower = (u.name || '').toLowerCase();
          const emailLower = (u.email || '').toLowerCase();
          if (nameLower.includes('kulkarni') || emailLower.includes('kulkarni')) return false;
          if (['user-bhusan', 'user-mugdha', 'user-prachita', 'user-tamana', 'user-satyam', 'user-priyal', 'user-rohan', 'user-priya', 'user-mayur-demo', 'user-mayur'].includes(u.id)) return false;
          if (u.role === 'admin' && u.email !== 'suryavanshimayur187@gmail.com' && u.id !== 'user-admin-mayur') return false;
          // Only preserve Mayur Suryavanshi as initial admin, or newly registered verified users
          if (u.id === 'user-admin-mayur' || u.email === 'suryavanshimayur187@gmail.com') return true;
          // Newly registered users must have a valid email and emailVerified
          if (u.email && u.emailVerified) return true;
          return false;
        });
        
        // Ensure sole authorized admin Mayur Suryavanshi exists
        const hasMayur = cleaned.some(u => u.id === 'user-admin-mayur' || u.email === 'suryavanshimayur187@gmail.com');
        if (!hasMayur) {
          cleaned.unshift(INITIAL_USERS[0]);
        }
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cleaned));
        return cleaned;
      }
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  // Public website: No auto-login! Starts as null (Visitor/Guest) unless explicitly signed in
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (!savedId) return null;
      if (['user-bhusan', 'user-mugdha', 'user-prachita', 'user-tamana', 'user-satyam', 'user-priyal', 'user-rohan', 'user-priya', 'user-mayur-demo', 'user-mayur', 'user-admin-kulkarni'].includes(savedId)) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
        return null;
      }
      if (savedId === 'user-admin-mayur') return INITIAL_USERS[0];
      const savedUsersStr = localStorage.getItem(STORAGE_KEYS.USERS);
      if (savedUsersStr) {
        const parsed: User[] = JSON.parse(savedUsersStr);
        return parsed.find(u => u.id === savedId) || null;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      return saved ? JSON.parse(saved) : INITIAL_MESSAGES; // []
    } catch {
      return INITIAL_MESSAGES;
    }
  });

  const [claims, setClaims] = useState<Claim[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLAIMS);
      return saved ? JSON.parse(saved) : INITIAL_CLAIMS; // []
    } catch {
      return INITIAL_CLAIMS;
    }
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES; // []
    } catch {
      return INITIAL_ACTIVITIES;
    }
  });

  const [moderationReports, setModerationReports] = useState<ModerationReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MODERATION);
      return saved ? JSON.parse(saved) : INITIAL_MODERATION; // []
    } catch {
      return INITIAL_MODERATION;
    }
  });

  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeContactItem, setActiveContactItem] = useState<Item | null>(null);
  const [activeClaimItem, setActiveClaimItem] = useState<Item | null>(null);
  const [activeReviewClaim, setActiveReviewClaim] = useState<Claim | null>(null);
  const [activeEditItem, setActiveEditItem] = useState<Item | null>(null);
  const [browseFilters, setBrowseFilters] = useState<BrowseFilters>(DEFAULT_FILTERS);

  // Authentication Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<AuthTab>('student-login');
  const [pendingPostAuthAction, setPendingPostAuthAction] = useState<(() => void) | null>(null);

  const openAuthModal = (tab: AuthTab = 'student-login') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setPendingPostAuthAction(null);
  };

  const requireAuth = (action: () => void, targetTab: AuthTab = 'student-login') => {
    if (currentUser) {
      action();
    } else {
      setPendingPostAuthAction(() => action);
      openAuthModal(targetTab);
    }
  };

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }, [locations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }, [allUsers]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUser.id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
      }
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(claims));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }, [claims]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activityLogs));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }, [activityLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MODERATION, JSON.stringify(moderationReports));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }, [moderationReports]);

  // Sync users with server database
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        const userList: User[] = Array.isArray(data) ? data : (data.users || []);
        if (Array.isArray(userList) && userList.length > 0) {
          setAllUsers(userList);
        }
      })
      .catch(() => {});
  }, []);

  // Sync items with backend database (respecting admin vs public/student views)
  const refreshItems = useCallback(async () => {
    try {
      const isAdmin = currentUser?.role === 'admin';
      const url = isAdmin && currentUser
        ? `/api/items?adminId=${encodeURIComponent(currentUser.id)}&includeDeleted=true`
        : '/api/items';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setItems(data);
        }
      }
    } catch (err) {
      console.error('Failed to sync items from backend', err);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  // Actions
  const selectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setCurrentPage('item-details');
  };

  const openContactModal = (item: Item) => {
    requireAuth(() => {
      setActiveContactItem(item);
    });
  };

  const closeContactModal = () => {
    setActiveContactItem(null);
  };

  const openClaimModal = (item: Item) => {
    requireAuth(() => {
      setActiveClaimItem(item);
    });
  };

  const closeClaimModal = () => {
    setActiveClaimItem(null);
  };

  const openReviewClaimModal = (claim: Claim) => {
    setActiveReviewClaim(claim);
  };

  const closeReviewClaimModal = () => {
    setActiveReviewClaim(null);
  };

  const openEditModal = (item: Item) => {
    setActiveEditItem(item);
  };

  const closeEditModal = () => {
    setActiveEditItem(null);
  };

  const resetFilters = () => {
    setBrowseFilters(DEFAULT_FILTERS);
  };

  const addItem = (itemData: {
    type: ItemType;
    itemName: string;
    category: Category;
    description: string;
    location: string;
    area?: string;
    subLocation?: string;
    specificLocation?: string;
    date: string;
    time?: string;
    image: string;
    color: string;
    keywords?: string;
    currentStorageLocation?: string;
    additionalInfo?: string;
    userContactPref: 'in-app' | 'email' | 'phone';
  }): string => {
    const newId = `item-${Date.now()}`;
    const userRole = currentUser?.role || 'student';
    const isStaffOrAdmin = userRole === 'staff' || userRole === 'admin';

    let locDisplay = itemData.location.trim();
    if (itemData.area && itemData.subLocation) {
      locDisplay = `${itemData.area} - ${itemData.subLocation}`;
    }

    const newItem: Item = {
      id: newId,
      userId: currentUser?.id || `user-guest-${Date.now()}`,
      userName: currentUser?.name || 'IYC Student',
      userRole: userRole,
      userContactPref: itemData.userContactPref || 'in-app',
      userEmail: currentUser?.email,
      userPhone: currentUser?.phone,
      type: itemData.type,
      itemName: itemData.itemName.trim(),
      category: itemData.category,
      description: itemData.description.trim(),
      location: locDisplay,
      area: itemData.area,
      subLocation: itemData.subLocation,
      specificLocation: itemData.specificLocation,
      date: itemData.date,
      time: itemData.time,
      image: itemData.image || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80',
      color: itemData.color.trim() || 'Other',
      keywords: itemData.keywords || '',
      status: 'ACTIVE',
      currentStorageLocation: itemData.currentStorageLocation,
      additionalInfo: itemData.additionalInfo,
      verificationStatus: isStaffOrAdmin ? 'VERIFIED' : 'PENDING',
      isVerifiedByAdmin: isStaffOrAdmin,
      verifiedBy: isStaffOrAdmin ? currentUser?.name : undefined,
      verifiedAt: isStaffOrAdmin ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    };

    setItems(prev => [newItem, ...prev]);

    // Persist new report to backend database
    fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    }).catch(err => console.error('Failed to sync new item to backend', err));

    if (currentUser) {
      const newActivity: ActivityLog = {
        id: `act-${Date.now()}`,
        userId: currentUser.id,
        title: `${itemData.type === 'LOST' ? 'Lost' : 'Found'} Report Published`,
        description: `You reported "${itemData.itemName.trim()}" at ${locDisplay}. ${isStaffOrAdmin ? 'Verified automatically.' : 'Submitted for staff verification.'}`,
        timestamp: new Date().toISOString(),
        type: 'STATUS'
      };
      setActivityLogs(prev => [newActivity, ...prev]);
    }

    return newId;
  };

  const updateItem = (updated: Item) => {
    setItems(prev => prev.map(item => (item.id === updated.id ? updated : item)));
  };

  const deleteItem = async (itemId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'admin') {
      alert('Security Notice: Only authenticated Campus Administrators can delete reports.');
      return false;
    }

    try {
      const res = await fetch(`/api/items/${itemId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: currentUser.id })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to soft delete report.');
        return false;
      }

      const deletedAt = new Date().toISOString();
      setItems(prev => prev.map(item => item.id === itemId ? {
        ...item,
        deleted: true,
        deletedAt,
        deletedBy: currentUser.id
      } : item));

      if (selectedItemId === itemId && currentPage === 'item-details') {
        setSelectedItemId(null);
        setCurrentPage(currentUser.role === 'admin' ? 'admin' : 'browse');
      }

      const newActivity: ActivityLog = {
        id: `act-${Date.now()}`,
        userId: currentUser.id,
        title: `Report Soft-Deleted`,
        description: `Admin ${currentUser.name} soft-deleted report "${data.item?.itemName || itemId}".`,
        timestamp: deletedAt,
        type: 'MODERATION'
      };
      setActivityLogs(prev => [newActivity, ...prev]);

      // Re-fetch to ensure complete sync
      await refreshItems();

      return true;
    } catch (err) {
      console.error('Delete item network error', err);
      alert('Failed to delete report due to network error.');
      return false;
    }
  };

  const restoreItem = async (itemId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'admin') {
      alert('Security Notice: Only authenticated Campus Administrators can restore reports.');
      return false;
    }

    try {
      const res = await fetch(`/api/items/${itemId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: currentUser.id })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to restore report.');
        return false;
      }

      // Update local state to restore
      setItems(prev => prev.map(item => {
        if (item.id === itemId) {
          const restored = { ...item, deleted: false };
          delete restored.deletedAt;
          delete restored.deletedBy;
          return restored;
        }
        return item;
      }));

      const newActivity: ActivityLog = {
        id: `act-${Date.now()}`,
        userId: currentUser.id,
        title: `Report Restored`,
        description: `Admin ${currentUser.name} restored report "${data.item?.itemName || itemId}".`,
        timestamp: new Date().toISOString(),
        type: 'MODERATION'
      };
      setActivityLogs(prev => [newActivity, ...prev]);

      // Re-fetch to ensure complete sync
      await refreshItems();

      return true;
    } catch (err) {
      console.error('Restore item network error', err);
      alert('Failed to restore report due to network error.');
      return false;
    }
  };

  const markAsRecovered = (itemId: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              status: 'RECOVERED' as ItemStatus,
              recoveredAt: today
            }
          : item
      )
    );

    setClaims(prev =>
      prev.map(c =>
        c.itemId === itemId && c.status === 'PENDING'
          ? {
              ...c,
              status: 'APPROVED' as const,
              resolvedAt: today,
              resolutionNotes: 'Marked recovered directly by listing reporter.'
            }
          : c
      )
    );

    if (currentUser) {
      const item = items.find(i => i.id === itemId);
      const newActivity: ActivityLog = {
        id: `act-${Date.now()}`,
        userId: currentUser.id,
        title: 'Item Recovered & Case Closed',
        description: `"${item?.itemName || 'Item'}" was officially marked as recovered. Case closed!`,
        timestamp: new Date().toISOString(),
        type: 'RECOVERY'
      };
      setActivityLogs(prev => [newActivity, ...prev]);
    }
  };

  const verifyItem = (itemId: string, verifierName?: string) => {
    const today = new Date().toISOString();
    const verifier = verifierName || currentUser?.name || 'IYC Faculty';

    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              verificationStatus: 'VERIFIED' as const,
              isVerifiedByAdmin: true,
              verifiedBy: verifier,
              verifiedAt: today
            }
          : item
      )
    );
  };

  const rejectItemListing = (itemId: string, reason?: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              verificationStatus: 'REJECTED' as const,
              additionalInfo: `${item.additionalInfo || ''} [Staff Rejection: ${reason || 'Details unverified'}]`
            }
          : item
      )
    );
  };

  const addLocation = (area: string, name: string, description?: string) => {
    const newLoc: CampusLocation = {
      id: `loc-custom-${Date.now()}`,
      area,
      name,
      isActive: true,
      description
    };
    setLocations(prev => [...prev, newLoc]);
  };

  const updateLocation = (id: string, updates: Partial<CampusLocation>) => {
    setLocations(prev =>
      prev.map(loc => (loc.id === id ? { ...loc, ...updates } : loc))
    );
  };

  const toggleLocationStatus = (id: string) => {
    setLocations(prev =>
      prev.map(loc => (loc.id === id ? { ...loc, isActive: !loc.isActive } : loc))
    );
  };

  const submitClaim = (
    itemId: string, 
    proofMessage: string, 
    details?: { studentId?: string; department?: string; phone?: string; }
  ) => {
    const item = items.find(i => i.id === itemId);
    if (!item || !currentUser) return;

    const newClaim: Claim = {
      id: `claim-${Date.now()}`,
      itemId,
      itemName: item.itemName,
      itemType: item.type,
      ownerId: item.userId,
      ownerName: item.userName,
      claimantId: currentUser.id,
      claimantName: currentUser.name,
      claimantEmail: currentUser.email || '',
      claimantStudentId: details?.studentId || currentUser.studentId || '',
      claimantDepartment: details?.department || currentUser.department || '',
      claimantPhone: details?.phone || currentUser.phone || '',
      message: proofMessage.trim(),
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    setClaims(prev => [newClaim, ...prev]);

    setItems(prev =>
      prev.map(i =>
        i.id === itemId ? { ...i, status: 'CLAIMED' as ItemStatus } : i
      )
    );

    sendMessage(
      item.userId,
      itemId,
      `📋 New Ownership Claim Received from ${currentUser.name} (${currentUser.studentId || 'Student'}). Review their proof in your Dashboard.`
    );

    const newActivity: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: currentUser.id,
      title: 'Ownership Claim Submitted',
      description: `Submitted claim with proof for "${item.itemName}". Pending finder/staff review.`,
      timestamp: new Date().toISOString(),
      type: 'STATUS'
    };
    setActivityLogs(prev => [newActivity, ...prev]);
  };

  const approveClaim = (claimId: string, handoverNotes?: string, handoverLocation?: string) => {
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return;

    const today = new Date().toISOString().split('T')[0];
    const item = items.find(i => i.id === claim.itemId);
    const finalHandoverLocation = handoverLocation || item?.currentStorageLocation || 'Computer Science Department Office';
    const finalNotes = handoverNotes || 'Handover verified and completed. Student ID confirmed.';

    setClaims(prev =>
      prev.map(c => {
        if (c.id === claimId) {
          return {
            ...c,
            status: 'APPROVED' as const,
            resolvedAt: today,
            resolutionNotes: finalNotes,
            handoverLocation: finalHandoverLocation
          };
        }
        if (c.itemId === claim.itemId && c.status === 'PENDING') {
          return {
            ...c,
            status: 'REJECTED' as const,
            resolvedAt: today,
            resolutionNotes: 'Closed: Another claimant was verified as the rightful owner.'
          };
        }
        return c;
      })
    );

    setItems(prev =>
      prev.map(i => {
        if (i.id === claim.itemId) {
          return {
            ...i,
            status: 'RECOVERED' as ItemStatus,
            recoveredAt: today
          };
        }
        return i;
      })
    );

    sendMessage(
      claim.claimantId,
      claim.itemId,
      `🎉 Great news! Your ownership claim for "${claim.itemName}" was APPROVED by ${currentUser?.name || 'Staff'}. Collection point: "${finalHandoverLocation}". Please carry your Student ID Card (${claim.claimantStudentId || 'Student ID'}) for physical collection. Notes: "${finalNotes}".`
    );

    const otherClaims = claims.filter(c => c.itemId === claim.itemId && c.id !== claimId && c.status === 'PENDING');
    otherClaims.forEach(oc => {
      sendMessage(
        oc.claimantId,
        oc.itemId,
        `Update on "${oc.itemName}": This item has been verified and returned to another claimant with matching proof.`
      );
    });
  };

  const rejectClaim = (claimId: string, rejectionReason?: string) => {
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return;

    const today = new Date().toISOString().split('T')[0];
    const finalReason = rejectionReason || 'Proof details did not match physical item inspection.';

    setClaims(prev =>
      prev.map(c =>
        c.id === claimId
          ? {
              ...c,
              status: 'REJECTED' as const,
              resolvedAt: today,
              resolutionNotes: finalReason
            }
          : c
      )
    );

    const otherPending = claims.some(c => c.itemId === claim.itemId && c.id !== claimId && c.status === 'PENDING');
    if (!otherPending) {
      setItems(prev =>
        prev.map(i =>
          i.id === claim.itemId && i.status === 'CLAIMED'
            ? { ...i, status: 'ACTIVE' as ItemStatus }
            : i
        )
      );
    }

    sendMessage(
      claim.claimantId,
      claim.itemId,
      `Your ownership claim for "${claim.itemName}" was reviewed and could not be verified by ${currentUser?.name || 'Staff'}. Reason: "${finalReason}".`
    );
  };

  const sendMessage = (receiverId: string, itemId: string, text: string) => {
    const item = items.find(i => i.id === itemId);
    const receiver = allUsers.find(u => u.id === receiverId);

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      senderId: currentUser?.id || 'anonymous',
      senderName: currentUser?.name || 'Campus Member',
      receiverId: receiverId,
      receiverName: receiver ? receiver.name : 'Campus User',
      itemId: itemId,
      itemName: item ? item.itemName : 'Reported Item',
      itemType: item ? item.type : 'LOST',
      text: text.trim(),
      createdAt: new Date().toISOString(),
      read: false
    };

    setMessages(prev => [newMsg, ...prev]);
  };

  const markMessageRead = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg => (msg.id === messageId ? { ...msg, read: true } : msg))
    );
  };

  // Student Login (Student ID + Password)
  const loginStudent = (studentId: string, password?: string): { success: boolean; error?: string } => {
    const cleanId = studentId.trim().toUpperCase();
    const user = allUsers.find(u => (u.studentId || '').toUpperCase() === cleanId && u.role === 'student');

    if (!user) {
      return { success: false, error: 'No student account found with this Student ID.' };
    }

    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    if (user.password && user.password !== password) {
      return { success: false, error: 'Incorrect password. Please verify and try again.' };
    }

    setCurrentUser(user);
    if (pendingPostAuthAction) {
      pendingPostAuthAction();
      setPendingPostAuthAction(null);
    }
    return { success: true };
  };

  // Staff / Faculty Login (Email + Password)
  const loginStaff = (identifier: string, password?: string): { success: boolean; error?: string } => {
    const clean = identifier.trim().toLowerCase();
    const staffUser = allUsers.find(u => 
      (u.role === 'staff' || u.role === 'admin') &&
      ((u.email || '').toLowerCase() === clean ||
       (u.studentId || '').toLowerCase() === clean ||
       u.id.toLowerCase() === clean ||
       u.name.toLowerCase().includes(clean))
    );

    if (!staffUser) {
      return { success: false, error: 'Staff account not found with this email or ID.' };
    }

    if (!password) {
      return { success: false, error: 'Please enter your staff password.' };
    }

    if (staffUser.password && staffUser.password !== password) {
      return { success: false, error: 'Incorrect password. Please verify and try again.' };
    }

    setCurrentUser(staffUser);
    if (pendingPostAuthAction) {
      pendingPostAuthAction();
      setPendingPostAuthAction(null);
    }
    return { success: true };
  };

  // Admin Login (Authorized Admin Mayur Suryavanshi ONLY)
  const loginAdmin = (identifier: string, password?: string): { success: boolean; error?: string } => {
    const clean = identifier.trim().toLowerCase();
    const adminUser = allUsers.find(u => 
      u.role === 'admin' &&
      ((u.email || '').toLowerCase() === clean || (u.studentId || '').toLowerCase() === clean || clean === 'admin')
    );

    if (!adminUser) {
      return { success: false, error: 'Admin account not recognized.' };
    }

    if (!password) {
      return { success: false, error: 'Please enter admin password.' };
    }

    if (adminUser.password && adminUser.password !== password) {
      return { success: false, error: 'Invalid administrator password.' };
    }

    setCurrentUser(adminUser);
    if (pendingPostAuthAction) {
      pendingPostAuthAction();
      setPendingPostAuthAction(null);
    }
    return { success: true };
  };

  const loginWithStudentId = (studentId: string): boolean => {
    const res = loginStudent(studentId);
    return res.success;
  };

  // Student Registration (Full Name, Student ID, Course, Study Year, Mandatory Verified Email, Password, Optional Phone)
  const registerStudent = (studentData: StudentRegistrationInput): { success: boolean; error?: string; errors?: Record<string, string> } => {
    const validation = validateStudentRegistration(studentData);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      return { success: false, error: firstError, errors: validation.errors };
    }

    const cleanId = studentData.studentId.trim().toUpperCase();
    const cleanEmail = (studentData.email || '').trim().toLowerCase();
    
    // Check if studentId already exists
    const exists = allUsers.some(u => (u.studentId || '').toUpperCase() === cleanId);
    if (exists) {
      return { 
        success: false, 
        error: 'An account with this Student ID already exists. Please sign in.',
        errors: { studentId: 'An account with this Student ID already exists. Please sign in.' }
      };
    }

    // Check if email already exists
    const existsEmail = allUsers.some(u => (u.email || '').toLowerCase() === cleanEmail);
    if (existsEmail) {
      return {
        success: false,
        error: 'An account with this email address already exists. Please sign in.',
        errors: { email: 'An account with this email address already exists. Please sign in.' }
      };
    }

    // Resolve course & department
    const courseObj = COLLEGE_COURSES.find(c => c.code.toUpperCase() === studentData.courseCode.toUpperCase());
    const yearObj = STUDY_YEARS.find(y => y.code.toUpperCase() === studentData.studyYear.toUpperCase());
    const courseName = courseObj ? courseObj.name : studentData.courseCode;
    const departmentName = courseObj ? courseObj.department : 'General';
    const yearLabel = yearObj ? yearObj.label : studentData.studyYear;

    const newStudent: User = {
      id: `user-student-${Date.now()}`,
      name: validation.cleanedData?.name || studentData.name.trim(),
      studentId: cleanId,
      course: courseName,
      department: departmentName,
      year: yearLabel,
      role: 'student', // strictly student — never admin or staff!
      email: cleanEmail,
      emailVerified: true,
      phone: studentData.phone ? studentData.phone.trim() : undefined,
      password: studentData.password,
      createdAt: new Date().toISOString().split('T')[0]
    };

    // Save student to state (DO NOT auto-log in!)
    setAllUsers(prev => [...prev, newStudent]);

    return { success: true };
  };

  // Staff Registration
  const registerStaff = (staffData: {
    name: string;
    email: string;
    department: string;
    staffId?: string;
    password?: string;
    confirmPassword?: string;
    verificationToken?: string;
  }): { success: boolean; error?: string } => {
    const trimmedEmail = (staffData.email || '').trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (allUsers.some(u => (u.email || '').toLowerCase() === trimmedEmail)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    if (!staffData.password || staffData.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    if (staffData.confirmPassword && staffData.password !== staffData.confirmPassword) {
      return { success: false, error: 'Passwords do not match.' };
    }

    const newStaff: User = {
      id: `user-staff-${Date.now()}`,
      name: staffData.name.trim(),
      email: trimmedEmail,
      emailVerified: true,
      department: staffData.department || 'General Faculty',
      studentId: staffData.staffId?.trim() ? staffData.staffId.trim().toUpperCase() : 'Not Assigned',
      designation: 'Faculty / Staff Member',
      role: 'staff',
      password: staffData.password,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setAllUsers(prev => [...prev, newStaff]);
    return { success: true };
  };

  const registerUser = (userData: {
    name: string;
    email: string;
    studentId: string;
    phone?: string;
    department?: string;
  }) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      studentId: userData.studentId,
      department: userData.department || 'Computer Science',
      role: 'student',
      createdAt: new Date().toISOString().split('T')[0]
    };

    setAllUsers(prev => [...prev, newUser]);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    setCurrentPage('home');
  };

  const flagItem = (itemId: string, reason: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, isReportedSuspicious: true } : item
      )
    );
    const newReport: ModerationReport = {
      id: `rep-${Date.now()}`,
      itemId,
      reportedBy: currentUser?.name || 'Anonymous Student',
      reason,
      createdAt: new Date().toISOString(),
      status: 'PENDING'
    };
    setModerationReports(prev => [newReport, ...prev]);
  };

  const dismissFlag = (itemId: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, isReportedSuspicious: false } : item
      )
    );
    setModerationReports(prev =>
      prev.map(r => (r.itemId === itemId ? { ...r, status: 'DISMISSED' } : r))
    );
  };

  const toggleUserBlock = (userId: string) => {
    setAllUsers(prev =>
      prev.map(u => u.id === userId ? { ...u } : u)
    );
  };

  const resetToDefaultData = () => {
    localStorage.clear();
    setItems(INITIAL_ITEMS);
    setLocations(INITIAL_LOCATIONS);
    setAllUsers(INITIAL_USERS);
    setMessages(INITIAL_MESSAGES);
    setClaims(INITIAL_CLAIMS);
    setActivityLogs(INITIAL_ACTIVITIES);
    setModerationReports(INITIAL_MODERATION);
    setCurrentUser(null);
    setCurrentPage('home');
  };

  const unreadCount = currentUser 
    ? messages.filter(m => m.receiverId === currentUser.id && !m.read).length
    : 0;

  const pendingClaimsCount = currentUser
    ? claims.filter(c => c.ownerId === currentUser.id && c.status === 'PENDING').length
    : 0;

  const pendingVerificationsCount = items.filter(
    i => !i.deleted && i.verificationStatus === 'PENDING'
  ).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        allUsers,
        items,
        locations,
        messages,
        claims,
        activityLogs,
        moderationReports,
        currentPage,
        selectedItemId,
        activeContactItem,
        activeClaimItem,
        activeReviewClaim,
        activeEditItem,
        browseFilters,
        unreadCount,
        pendingClaimsCount,
        pendingVerificationsCount,
        authModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        requireAuth,
        setCurrentPage,
        selectItem,
        openContactModal,
        closeContactModal,
        openClaimModal,
        closeClaimModal,
        openReviewClaimModal,
        closeReviewClaimModal,
        openEditModal,
        closeEditModal,
        setBrowseFilters,
        resetFilters,
        addItem,
        updateItem,
        deleteItem,
        restoreItem,
        refreshItems,
        markAsRecovered,
        verifyItem,
        rejectItemListing,
        addLocation,
        updateLocation,
        toggleLocationStatus,
        submitClaim,
        approveClaim,
        rejectClaim,
        sendMessage,
        markMessageRead,
        loginStudent,
        loginStaff,
        loginAdmin,
        loginWithStudentId, 
        registerStudent,
        registerStaff,
        registerUser,
        logout,
        flagItem,
        dismissFlag,
        toggleUserBlock,
        resetToDefaultData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
