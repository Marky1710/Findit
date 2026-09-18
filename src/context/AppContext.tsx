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
  ) => Promise<boolean>;
  approveClaim: (claimId: string, handoverNotes?: string, handoverLocation?: string) => Promise<boolean>;
  rejectClaim: (claimId: string, rejectionReason?: string) => Promise<boolean>;
  
  // Messaging Operations
  sendMessage: (receiverId: string, itemId: string, text: string) => void;
  markMessageRead: (messageId: string) => void;
  
  // Auth Operations
  loginStudent: (studentId: string, password?: string, authenticatedUser?: User) => { success: boolean; error?: string };
  loginStaff: (identifier: string, password?: string, authenticatedUser?: User) => { success: boolean; error?: string };
  loginAdmin: (identifier: string, password?: string, authenticatedUser?: User) => { success: boolean; error?: string };
  loginWithStudentId: (studentId: string) => boolean;
  registerStudent: (studentData: StudentRegistrationInput, createdUser?: User) => { success: boolean; error?: string; errors?: Record<string, string> };
  registerStaff: (staffData: { name: string; email: string; department: string; staffId?: string; password?: string; confirmPassword?: string }, createdUser?: User) => { success: boolean; error?: string };
  registerUser: (userData: { name: string; email: string; studentId: string; phone?: string; department?: string }) => void;
  logout: () => void;
  
  // Admin Operations
  flagItem: (itemId: string, reason: string) => void;
  dismissFlag: (itemId: string) => void;
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  restrictUser: (userId: string) => Promise<boolean>;
  unrestrictUser: (userId: string) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Persistent session key only — backend database is the single source of truth for all entities
const STORAGE_KEYS = {
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

// Safe JSON parser to ensure non-JSON or HTML fallbacks never crash state sync
async function parseJsonSafely<T>(response: Response | null, fallback: T): Promise<T> {
  if (!response || !response.ok) return fallback;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return fallback;
  }
  try {
    const text = await response.text();
    if (!text || !text.trim()) return fallback;
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Purge any stale client-side localStorage caches to guarantee backend single source of truth
  useEffect(() => {
    try {
      const staleKeys = [
        'iyc_items_v2', 'iyc_items_v3', 'iyc_items_v4',
        'iyc_users_v2', 'iyc_users_v3', 'iyc_users_v4',
        'iyc_locations_v4',
        'iyc_messages_v2', 'iyc_messages_v4',
        'iyc_claims_v2', 'iyc_claims_v4',
        'iyc_activities_v4',
        'iyc_moderation_v4'
      ];
      staleKeys.forEach(k => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }, []);

  // Items start strictly empty and are populated authoritatively from the backend database
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<CampusLocation[]>(INITIAL_LOCATIONS);
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [moderationReports, setModerationReports] = useState<ModerationReport[]>([]);

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

  // Persist only user session token/ID to localStorage for seamless authentication
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUser.id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
      }
    } catch (e) {
      console.error('Session write error', e);
    }
  }, [currentUser]);

  // Authoritative Backend Data Fetcher: Centralized Single Source of Truth
  const refreshAllData = useCallback(async () => {
    try {
      const isAdmin = currentUser?.role === 'admin';
      const itemsUrl = isAdmin && currentUser
        ? `/api/items?adminId=${encodeURIComponent(currentUser.id)}&includeDeleted=true`
        : '/api/items';

      const reqHeaders = { 'Accept': 'application/json' };

      const [itemsRes, usersRes, claimsRes, msgsRes, actsRes, modsRes, locsRes] = await Promise.all([
        fetch(itemsUrl, { headers: reqHeaders }).catch(() => null),
        fetch('/api/users', { headers: reqHeaders }).catch(() => null),
        fetch('/api/claims', { headers: reqHeaders }).catch(() => null),
        fetch('/api/messages', { headers: reqHeaders }).catch(() => null),
        fetch('/api/activities', { headers: reqHeaders }).catch(() => null),
        fetch('/api/moderation', { headers: reqHeaders }).catch(() => null),
        fetch('/api/locations', { headers: reqHeaders }).catch(() => null)
      ]);

      const [itemsData, usersData, claimsData, msgsData, actsData, modsData, locsData] = await Promise.all([
        parseJsonSafely<Item[] | null>(itemsRes, null),
        parseJsonSafely<User[] | { users: User[] } | null>(usersRes, null),
        parseJsonSafely<Claim[] | null>(claimsRes, null),
        parseJsonSafely<Message[] | null>(msgsRes, null),
        parseJsonSafely<ActivityLog[] | null>(actsRes, null),
        parseJsonSafely<ModerationReport[] | null>(modsRes, null),
        parseJsonSafely<CampusLocation[] | null>(locsRes, null)
      ]);

      if (Array.isArray(itemsData)) {
        setItems(itemsData); // Authoritatively set even if empty array []
      }

      if (usersData) {
        const userList: User[] = Array.isArray(usersData) ? usersData : (usersData.users || []);
        if (Array.isArray(userList)) {
          setAllUsers(userList);
          if (currentUser) {
            const updatedCurrentUser = userList.find(u => u.id === currentUser.id);
            if (!updatedCurrentUser || updatedCurrentUser.isDeleted) {
              setCurrentUser(null);
              localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
              setCurrentPage('home');
            } else {
              setCurrentUser(updatedCurrentUser);
            }
          }
        }
      }

      if (Array.isArray(claimsData)) {
        setClaims(claimsData); // Authoritatively set even if empty array []
      }

      if (Array.isArray(msgsData)) {
        setMessages(msgsData); // Authoritatively set even if empty array []
      }

      if (Array.isArray(actsData)) {
        setActivityLogs(actsData); // Authoritatively set even if empty array []
      }

      if (Array.isArray(modsData)) {
        setModerationReports(modsData); // Authoritatively set even if empty array []
      }

      if (Array.isArray(locsData) && locsData.length > 0) {
        setLocations(locsData);
      }
    } catch (err) {
      console.warn('Authoritative database sync non-fatal error:', err);
    }
  }, [currentUser]);

  // Restore authenticated session on initial mount & fetch initial backend state
  useEffect(() => {
    const savedUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (savedUserId) {
      fetch(`/api/auth/me?userId=${encodeURIComponent(savedUserId)}`, {
        headers: { 'Accept': 'application/json' }
      })
        .then(async res => {
          if (!res.ok) return null;
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('application/json')) return null;
          return res.json().catch(() => null);
        })
        .then(data => {
          if (data && data.success && data.user) {
            setCurrentUser(data.user);
          } else if (data && data.success === false) {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
            setCurrentUser(null);
          }
        })
        .catch(() => {});
    }

    refreshAllData();
  }, [refreshAllData]);

  // Re-fetch data when authentication context changes
  const refreshItems = useCallback(async () => {
    await refreshAllData();
  }, [refreshAllData]);

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
    if (currentUser?.isBlocked) {
      alert('Your account has been blocked. You cannot submit new reports.');
      return '';
    }
    if (currentUser?.isRestricted) {
      alert('Your account is restricted. You cannot submit new reports at this time.');
      return '';
    }
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

  const updateItem = async (updated: Item) => {
    try {
      const res = await fetch(`/api/items/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (err) {
      console.error('Failed to update item on backend:', err);
    }
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
      const data = await res.json().catch(() => ({ success: false, error: 'Invalid server response' }));
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
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ adminId: currentUser.id })
      });
      const data = await res.json().catch(() => ({ success: false, error: 'Invalid server response' }));
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

    fetch(`/api/items/${itemId}/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser?.id, userName: currentUser?.name })
    })
    .then(() => refreshAllData())
    .catch(err => console.error('Failed to sync recovery to backend:', err));
  };

  const verifyItem = async (itemId: string, verifierName?: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      alert('Security Notice: Only Campus Administrators can verify reports.');
      return;
    }
    
    try {
      const res = await fetch(`/api/items/${itemId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ adminId: currentUser.id })
      });
      const data = await res.json().catch(() => ({ success: false, error: 'Invalid server response' }));
      if (res.ok && data.success) {
        await refreshAllData();
      } else {
        alert(data.error || 'Failed to verify report.');
      }
    } catch (err) {
      console.error('Failed to sync verification to backend:', err);
      alert('Network error while verifying report.');
    }
  };

  const rejectItemListing = (itemId: string, reason?: string) => {
    const finalReason = reason || 'Details unverified';
    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              verificationStatus: 'REJECTED' as const,
              additionalInfo: `${item.additionalInfo || ''} [Staff Rejection: ${finalReason}]`
            }
          : item
      )
    );

    fetch(`/api/items/${itemId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ reason: finalReason, verifiedBy: currentUser?.name })
    })
    .then(() => refreshAllData())
    .catch(err => console.error('Failed to sync rejection to backend:', err));
  };

  const addLocation = (area: string, name: string, description?: string) => {
    const newLoc: CampusLocation = {
      id: `loc-${Date.now()}`,
      area,
      name,
      isActive: true,
      description
    };
    setLocations(prev => [...prev, newLoc]);

    fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ area, name, description })
    })
    .then(() => refreshAllData())
    .catch(err => console.error('Failed to sync location to backend:', err));
  };

  const updateLocation = (id: string, updates: Partial<CampusLocation>) => {
    setLocations(prev =>
      prev.map(loc => (loc.id === id ? { ...loc, ...updates } : loc))
    );

    fetch(`/api/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(updates)
    })
    .then(() => refreshAllData())
    .catch(err => console.error('Failed to sync location update to backend:', err));
  };

  const toggleLocationStatus = (id: string) => {
    setLocations(prev =>
      prev.map(loc => (loc.id === id ? { ...loc, isActive: !loc.isActive } : loc))
    );

    fetch(`/api/locations/${id}/toggle`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    })
    .then(() => refreshAllData())
    .catch(err => console.error('Failed to toggle location on backend:', err));
  };

  const submitClaim = async (
    itemId: string, 
    proofMessage: string, 
    details?: { studentId?: string; department?: string; phone?: string; }
  ): Promise<boolean> => {
    if (currentUser?.isBlocked) {
      alert('Your account has been blocked. You cannot submit claims.');
      return false;
    }
    if (currentUser?.isRestricted) {
      alert('Your account is restricted. You cannot submit claims at this time.');
      return false;
    }
    const item = items.find(i => i.id === itemId);
    if (!item || !currentUser) return false;

    const newClaim: Partial<Claim> = {
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
      message: proofMessage.trim()
    };

    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(newClaim)
      });
      const data = await res.json().catch(() => ({ success: false }));
      
      if (res.ok && data.success) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to submit claim to backend:', err);
      return false;
    }
  };

  const approveClaim = async (claimId: string, handoverNotes?: string, handoverLocation?: string): Promise<boolean> => {
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return false;

    const item = items.find(i => i.id === claim.itemId);
    const finalHandoverLocation = handoverLocation || item?.currentStorageLocation || 'Computer Science Department Office';
    const finalNotes = handoverNotes || 'Handover verified and completed. Student ID confirmed.';

    try {
      const res = await fetch(`/api/claims/${claimId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          reviewerId: currentUser?.id,
          reviewerName: currentUser?.name || 'Staff',
          resolutionNotes: finalNotes,
          handoverLocation: finalHandoverLocation
        })
      });
      const data = await res.json().catch(() => ({ success: false }));
      if (res.ok && data.success) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to sync claim approval to backend:', err);
      return false;
    }
  };

  const rejectClaim = async (claimId: string, rejectionReason?: string): Promise<boolean> => {
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return false;

    const finalReason = rejectionReason || 'Proof details did not match physical item inspection.';

    try {
      const res = await fetch(`/api/claims/${claimId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          reviewerId: currentUser?.id,
          reviewerName: currentUser?.name || 'Staff',
          resolutionNotes: finalReason
        })
      });
      const data = await res.json().catch(() => ({ success: false }));
      if (res.ok && data.success) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to sync claim rejection to backend:', err);
      return false;
    }
  };

  const sendMessage = (receiverId: string, itemId: string, text: string) => {
    if (currentUser?.isBlocked) {
      alert('Your account has been blocked. You cannot send messages.');
      return;
    }
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

    // Persist message to backend database
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg)
    })
    .then(() => refreshAllData())
    .catch(err => console.error('Failed to sync message to backend:', err));
  };

  const markMessageRead = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg => (msg.id === messageId ? { ...msg, read: true } : msg))
    );

    fetch(`/api/messages/${messageId}/read`, {
      method: 'POST'
    }).catch(err => console.error('Failed to mark message read on backend:', err));
  };

  // Student Login (Student ID + Password)
  const loginStudent = (studentId: string, password?: string, authenticatedUser?: User): { success: boolean; error?: string } => {
    if (authenticatedUser) {
      setCurrentUser(authenticatedUser);
      setAllUsers(prev => {
        const idx = prev.findIndex(u => u.id === authenticatedUser.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = authenticatedUser;
          return next;
        }
        return [...prev, authenticatedUser];
      });
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, authenticatedUser.id);
      } catch {}
      if (pendingPostAuthAction) {
        pendingPostAuthAction();
        setPendingPostAuthAction(null);
      }
      return { success: true };
    }

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
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    } catch {}
    if (pendingPostAuthAction) {
      pendingPostAuthAction();
      setPendingPostAuthAction(null);
    }
    return { success: true };
  };

  // Staff / Faculty Login (Email + Password)
  const loginStaff = (identifier: string, password?: string, authenticatedUser?: User): { success: boolean; error?: string } => {
    if (authenticatedUser) {
      setCurrentUser(authenticatedUser);
      setAllUsers(prev => {
        const idx = prev.findIndex(u => u.id === authenticatedUser.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = authenticatedUser;
          return next;
        }
        return [...prev, authenticatedUser];
      });
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, authenticatedUser.id);
      } catch {}
      if (pendingPostAuthAction) {
        pendingPostAuthAction();
        setPendingPostAuthAction(null);
      }
      return { success: true };
    }

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
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, staffUser.id);
    } catch {}
    if (pendingPostAuthAction) {
      pendingPostAuthAction();
      setPendingPostAuthAction(null);
    }
    return { success: true };
  };

  // Admin Login (Authorized Admin Mayur Suryavanshi ONLY)
  const loginAdmin = (identifier: string, password?: string, authenticatedUser?: User): { success: boolean; error?: string } => {
    if (authenticatedUser) {
      setCurrentUser(authenticatedUser);
      setAllUsers(prev => {
        const idx = prev.findIndex(u => u.id === authenticatedUser.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = authenticatedUser;
          return next;
        }
        return [...prev, authenticatedUser];
      });
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, authenticatedUser.id);
      } catch {}
      if (pendingPostAuthAction) {
        pendingPostAuthAction();
        setPendingPostAuthAction(null);
      }
      return { success: true };
    }

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
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, adminUser.id);
    } catch {}
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
  const registerStudent = (studentData: StudentRegistrationInput, createdUser?: User): { success: boolean; error?: string; errors?: Record<string, string> } => {
    if (createdUser) {
      setAllUsers(prev => {
        if (prev.some(u => u.id === createdUser.id)) return prev;
        return [...prev, createdUser];
      });
      return { success: true };
    }

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
  }, createdUser?: User): { success: boolean; error?: string } => {
    if (createdUser) {
      setAllUsers(prev => {
        if (prev.some(u => u.id === createdUser.id)) return prev;
        return [...prev, createdUser];
      });
      return { success: true };
    }

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

    fetch(`/api/items/${itemId}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason,
        reportedBy: currentUser?.name || 'Anonymous Student',
        userId: currentUser?.id
      })
    })
    .then(() => refreshAllData())
    .catch(err => console.error('Failed to sync item flag to backend:', err));
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

    fetch(`/api/items/${itemId}/dismiss-flag`, {
      method: 'POST'
    })
    .then(() => refreshAllData())
    .catch(err => console.error('Failed to dismiss flag on backend:', err));
  };

  const blockUser = async (userId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/block`, { 
        method: 'PUT',
        headers: { 'x-admin-id': currentUser?.id || '' }
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch { return false; }
  };

  const unblockUser = async (userId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/unblock`, { 
        method: 'PUT',
        headers: { 'x-admin-id': currentUser?.id || '' }
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch { return false; }
  };

  const restrictUser = async (userId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/restrict`, { 
        method: 'PUT',
        headers: { 'x-admin-id': currentUser?.id || '' }
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch { return false; }
  };

  const unrestrictUser = async (userId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/unrestrict`, { 
        method: 'PUT',
        headers: { 'x-admin-id': currentUser?.id || '' }
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch { return false; }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { 
        method: 'DELETE',
        headers: { 'x-admin-id': currentUser?.id || '' }
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch { return false; }
  };

  const resetToDefaultData = () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    fetch('/api/reset', {
      method: 'POST'
    })
    .then(() => refreshAllData())
    .catch(err => console.error('Failed to reset backend database:', err));
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
        blockUser,
        unblockUser,
        restrictUser,
        unrestrictUser,
        deleteUser,
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
