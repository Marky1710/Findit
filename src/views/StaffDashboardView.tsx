import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Item, Claim } from '../types';
import { findMatches } from '../utils/matchingAlgorithm';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MapPin, 
  Calendar, 
  User as UserIcon, 
  Layers, 
  Search, 
  AlertTriangle, 
  Eye, 
  Award,
  BookOpen,
  ArrowRight,
  Filter,
  Check,
  Building,
  Laptop,
  Sparkles,
  Flag,
  Trash2,
  ExternalLink,
  FileCheck2
} from 'lucide-react';

export const StaffDashboardView: React.FC = () => {
  const { 
    currentUser, 
    allUsers, 
    items, 
    claims, 
    moderationReports, 
    verifyItem, 
    rejectItemListing, 
    approveClaim, 
    rejectClaim, 
    openReviewClaimModal, 
    dismissFlag, 
    deleteItem, 
    selectItem, 
    setCurrentPage, 
    openAuthModal 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'pending' | 'claims' | 'matches' | 'reported' | 'verified' | 'cs-facilities'>('pending');
  const [selectedFacility, setSelectedFacility] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectModalItem, setRejectModalItem] = useState<Item | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Role Protection: Restricted to Staff & Admin
  if (!currentUser || (currentUser.role !== 'staff' && currentUser.role !== 'admin')) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">
              Staff &amp; Faculty Access Restricted
            </h2>
            <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
              This verification hub is reserved for authorized Ismail Yusuf College teachers, faculty members, and CS department lab custodians.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => openAuthModal('staff-login')}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all"
            >
              Sign In with Staff Account
            </button>
            <button
              onClick={() => setCurrentPage('home')}
              className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CS Staff list
  const staffMembers = useMemo(() => {
    return allUsers.filter(u => u.role === 'staff' || u.role === 'admin');
  }, [allUsers]);

  // Active items excluding soft-deleted reports
  const activeItems = useMemo(() => items.filter(i => !i.deleted), [items]);

  // Pending verification queue
  const pendingItems = useMemo(() => {
    return activeItems.filter(i => (i.verificationStatus === 'PENDING' || !i.isVerifiedByAdmin) && i.status !== 'RECOVERED');
  }, [activeItems]);

  // Verified items
  const verifiedItems = useMemo(() => {
    return activeItems.filter(i => i.verificationStatus === 'VERIFIED');
  }, [activeItems]);

  // CS Department items
  const csDepartmentItems = useMemo(() => {
    return activeItems.filter(i => {
      const isCS = (i.area || '').toLowerCase().includes('computer science') ||
                   (i.location || '').toLowerCase().includes('lab a') ||
                   (i.location || '').toLowerCase().includes('lab b') ||
                   (i.location || '').toLowerCase().includes('cs1') ||
                   (i.location || '').toLowerCase().includes('cs2');
      if (!isCS) return false;
      if (selectedFacility === 'ALL') return true;
      if (selectedFacility === 'Lab A') return (i.subLocation || i.location).toLowerCase().includes('lab a');
      if (selectedFacility === 'Lab B') return (i.subLocation || i.location).toLowerCase().includes('lab b');
      if (selectedFacility === 'CS1') return (i.subLocation || i.location).toLowerCase().includes('cs1');
      if (selectedFacility === 'CS2') return (i.subLocation || i.location).toLowerCase().includes('cs2');
      return true;
    });
  }, [activeItems, selectedFacility]);

  // Claims on items
  const pendingClaims = useMemo(() => {
    return claims.filter(c => c.status === 'PENDING');
  }, [claims]);

  // Possible matches count & pairs
  const allMatchPairs = useMemo(() => {
    return activeItems
      .filter(i => i.type === 'LOST')
      .flatMap(lostItem => {
        return findMatches(lostItem, activeItems)
          .filter(m => m.totalScore >= 60)
          .map(match => ({
            lostItem,
            foundItem: match.matchedItem,
            score: match.totalScore,
            isHighConfidence: match.isPossibleMatch
          }));
      })
      .sort((a, b) => b.score - a.score);
  }, [activeItems]);

  // Reported / Flagged listings queue
  const pendingReportedListings = useMemo(() => {
    return (moderationReports || []).filter(r => r.status === 'PENDING');
  }, [moderationReports]);

  const handleVerify = (itemId: string) => {
    verifyItem(itemId, currentUser.name);
  };

  const handleRejectSubmit = () => {
    if (rejectModalItem) {
      rejectItemListing(rejectModalItem.id, rejectionReason || 'Details could not be verified by faculty');
      setRejectModalItem(null);
      setRejectionReason('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>FACULTY &amp; STAFF VERIFICATION PORTAL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Computer Science Department Hub
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Ismail Yusuf College, Jogeshwari (East), Mumbai. Review student lost/found reports, verify listings for Lab A, Lab B, CS1 &amp; CS2, and authorize item handovers.
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
              <span className="text-slate-400 font-medium">Logged in as:</span>
              <span className="bg-white/10 px-2.5 py-1 rounded-lg font-bold text-white flex items-center space-x-1.5 border border-white/10">
                <span>{currentUser.name}</span>
                <span className="text-[10px] bg-blue-500/40 text-blue-200 px-1.5 py-0.2 rounded font-semibold uppercase">
                  {currentUser.role}
                </span>
              </span>
              <span className="text-slate-400">• {currentUser.department || 'Computer Science'}</span>
            </div>
          </div>

          {/* Official Department Custodian Info Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 max-w-xs text-xs space-y-2">
            <div className="flex items-center space-x-2 text-blue-200 font-bold uppercase tracking-wider text-[11px]">
              <Building className="w-4 h-4 text-amber-300" />
              <span>Department Custodian</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Designated custodian for Lab A, Lab B, CS1 &amp; CS2. Review physical descriptions and student proofs before approving handover.
            </p>
          </div>
        </div>

        {/* Quick KPI stats matching Section 9 exact specification */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div 
            onClick={() => setActiveTab('pending')}
            className="bg-white/5 hover:bg-white/10 cursor-pointer rounded-xl p-3 border border-white/10 transition-colors"
          >
            <div className="text-xs text-slate-300">Pending Verification</div>
            <div className="text-2xl font-black text-amber-300 mt-0.5">{pendingItems.length}</div>
          </div>
          <div 
            onClick={() => setActiveTab('claims')}
            className="bg-white/5 hover:bg-white/10 cursor-pointer rounded-xl p-3 border border-white/10 transition-colors"
          >
            <div className="text-xs text-slate-300">Claims to Review</div>
            <div className="text-2xl font-black text-emerald-300 mt-0.5">{pendingClaims.length}</div>
          </div>
          <div 
            onClick={() => setActiveTab('matches')}
            className="bg-white/5 hover:bg-white/10 cursor-pointer rounded-xl p-3 border border-white/10 transition-colors"
          >
            <div className="text-xs text-slate-300 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-indigo-300" />
              <span>Possible Matches</span>
            </div>
            <div className="text-2xl font-black text-blue-300 mt-0.5">{allMatchPairs.length}</div>
          </div>
          <div 
            onClick={() => setActiveTab('reported')}
            className="bg-white/5 hover:bg-white/10 cursor-pointer rounded-xl p-3 border border-white/10 transition-colors"
          >
            <div className="text-xs text-slate-300 flex items-center space-x-1">
              <Flag className="w-3 h-3 text-rose-300" />
              <span>Reported Listings</span>
            </div>
            <div className="text-2xl font-black text-rose-300 mt-0.5">{pendingReportedListings.length}</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Listings</span>
          {pendingItems.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
              activeTab === 'pending' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {pendingItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'claims'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Claims to Review</span>
          {pendingClaims.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
              activeTab === 'claims' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {pendingClaims.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'matches'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Possible Matches</span>
          <span className="text-xs opacity-75">({allMatchPairs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reported')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'reported'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>Reported Listings</span>
          {pendingReportedListings.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
              activeTab === 'reported' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-800'
            }`}>
              {pendingReportedListings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('verified')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'verified'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Recently Verified Items</span>
        </button>

        <button
          onClick={() => setActiveTab('cs-facilities')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'cs-facilities'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>CS Labs &amp; Classrooms</span>
          <span className="text-xs opacity-75">({csDepartmentItems.length})</span>
        </button>
      </div>

      {/* Tab 1: Pending Verification Queue */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">Student Listings Awaiting Review</h2>
              <p className="text-xs text-slate-500">
                Staff approval promotes listings to "Verified" status across the college search index.
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              Showing {pendingItems.length} items
            </div>
          </div>

          {pendingItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900">Queue is Clear!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                All student lost and found reports have been reviewed and verified by staff.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingItems.map(item => (
                <div 
                  key={item.id} 
                  className="bg-white rounded-2xl border border-amber-200 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-amber-300 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold ${
                          item.type === 'LOST' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.type}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
                          Pending Verification
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">{item.date}</span>
                    </div>

                    <div className="flex items-start space-x-3 mt-3">
                      <img 
                        src={item.image} 
                        alt={item.itemName} 
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0" 
                      />
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900 truncate">{item.itemName}</h3>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{item.description}</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Reported By</span>
                        <span className="font-semibold text-slate-800">{item.userName}</span>
                        {item.userRole && (
                          <span className="text-[10px] text-slate-500 block">Role: {item.userRole}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Campus Location</span>
                        <span className="font-semibold text-slate-800">{item.subLocation || item.location}</span>
                        {item.area && (
                          <span className="text-[10px] text-slate-500 block">{item.area}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => selectItem(item.id)}
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center space-x-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Review Listing</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setRejectModalItem(item)}
                        className="px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleVerify(item.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Verify</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: CS Facilities */}
      {activeTab === 'cs-facilities' && (
        <div className="space-y-6">
          {/* Facility Filter Pills */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Computer Science Department Facilities</h2>
              <p className="text-xs text-slate-500">Filter lost &amp; found inventory by specific CS labs and lecture halls.</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'Lab A', 'Lab B', 'CS1', 'CS2'].map(fac => (
                <button
                  key={fac}
                  onClick={() => setSelectedFacility(fac)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    selectedFacility === fac
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {fac === 'ALL' ? 'All Facilities' : fac}
                </button>
              ))}
            </div>
          </div>

          {/* Quick CS Room Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lab A</div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">Software Development Lab</div>
              <div className="text-xs text-blue-600 font-bold mt-2">
                {activeItems.filter(i => (i.subLocation || i.location).toLowerCase().includes('lab a')).length} items reported
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lab B</div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">Advanced Systems Lab</div>
              <div className="text-xs text-blue-600 font-bold mt-2">
                {activeItems.filter(i => (i.subLocation || i.location).toLowerCase().includes('lab b')).length} items reported
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">CS1</div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">Classroom 1</div>
              <div className="text-xs text-blue-600 font-bold mt-2">
                {activeItems.filter(i => (i.subLocation || i.location).toLowerCase().includes('cs1')).length} items reported
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">CS2</div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">Classroom 2</div>
              <div className="text-xs text-blue-600 font-bold mt-2">
                {activeItems.filter(i => (i.subLocation || i.location).toLowerCase().includes('cs2')).length} items reported
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                Items in {selectedFacility === 'ALL' ? 'Computer Science Department' : selectedFacility}
              </h3>
              <span className="text-xs text-slate-500 font-semibold">{csDepartmentItems.length} records</span>
            </div>

            <div className="divide-y divide-slate-100">
              {csDepartmentItems.map(item => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <img 
                      src={item.image} 
                      alt={item.itemName} 
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" 
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                          item.type === 'LOST' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.type}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 truncate">{item.itemName}</h4>
                        {item.verificationStatus === 'VERIFIED' && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                        <span>Room: <strong className="text-slate-700">{item.subLocation || item.location}</strong></span>
                        <span>Date: {item.date}</span>
                        <span>Finder/Owner: {item.userName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => selectItem(item.id)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700"
                    >
                      View Details
                    </button>
                    {item.verificationStatus !== 'VERIFIED' && (
                      <button
                        onClick={() => handleVerify(item.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Claims & Handover Approvals */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <h2 className="text-base font-bold text-slate-900">Student Ownership Claims</h2>
            <p className="text-xs text-slate-500">
              Review ownership evidence submitted by students with their registered Student ID before authorizing physical handover.
            </p>
          </div>

          {pendingClaims.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Pending Ownership Claims</h3>
              <p className="text-xs text-slate-500 mt-1">All claims have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingClaims.map(claim => (
                <div key={claim.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="text-xs text-slate-400 font-semibold">Claim for Item:</div>
                      <h3 className="text-base font-bold text-slate-900">{claim.itemName}</h3>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                        Pending Staff Approval
                      </span>
                      <div className="text-[11px] text-slate-400 mt-0.5">{claim.createdAt.split('T')[0]}</div>
                    </div>
                  </div>

                  {/* Claimant verification info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Claimant Name</span>
                      <span className="font-bold text-slate-800">{claim.claimantName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Student ID</span>
                      <span className="font-bold text-blue-700">{claim.claimantStudentId || 'Verified in person'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Department / Class</span>
                      <span className="font-semibold text-slate-700">{claim.claimantDepartment || 'Computer Science'}</span>
                    </div>
                  </div>

                  {/* Proof Details */}
                  <div>
                    <span className="text-slate-500 text-xs font-bold block mb-1">Submitted Proof of Ownership:</span>
                    <p className="text-xs text-slate-700 bg-amber-50/60 border border-amber-200/60 p-3 rounded-xl leading-relaxed">
                      "{claim.proofMessage}"
                    </p>
                  </div>

                  {/* Handover Actions */}
                  <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                      onClick={() => openReviewClaimModal(claim)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center space-x-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>Review Claim</span>
                    </button>
                    <button
                      onClick={async () => {
                        const success = await rejectClaim(claim.id, 'Proof does not match physical item inspection');
                        if (success) {
                          setActionFeedback(`Claim rejected.`);
                          setTimeout(() => setActionFeedback(null), 3000);
                        } else {
                          alert('Failed to reject claim.');
                        }
                      }}
                      className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors"
                    >
                      Reject Claim
                    </button>
                    <button
                      onClick={async () => {
                        const success = await approveClaim(claim.id, 'Verified by Computer Science Faculty', 'Computer Science Dept Office');
                        if (success) {
                          setActionFeedback(`Claim approved and marked recovered.`);
                          setTimeout(() => setActionFeedback(null), 3000);
                        } else {
                          alert('Failed to approve claim.');
                        }
                      }}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Authorize Handover</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Possible Matches (Requirement 9) */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Smart Match Candidates (College Algorithm)</span>
              </h2>
              <p className="text-xs text-slate-500">
                AI and location-aware pairings between student lost reports and submitted found items.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 self-start sm:self-auto">
              {allMatchPairs.length} Candidate Pair{allMatchPairs.length === 1 ? '' : 's'} (≥60%)
            </span>
          </div>

          {allMatchPairs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No High-Confidence Matches Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                When students report matching items in CS1, CS2, Lab A, Lab B or other campus areas, they will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allMatchPairs.map((pair, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-600 text-white">
                        {pair.score}% Match Score
                      </span>
                      {pair.isHighConfidence && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          High Probability
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">Pair #{idx + 1}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-xs">
                    {/* Lost Item */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase text-red-600 flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span>Reported Lost by {pair.lostItem.userName}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <img src={pair.lostItem.image} alt={pair.lostItem.itemName} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                        <div>
                          <div className="font-bold text-slate-900">{pair.lostItem.itemName}</div>
                          <div className="text-slate-500 text-[11px]">
                            {pair.lostItem.subLocation || pair.lostItem.location} • {pair.lostItem.date}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => selectItem(pair.lostItem.id)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 pt-1"
                      >
                        <span>View Lost Report</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Found Item */}
                    <div className="space-y-1.5 sm:border-l sm:border-slate-200 sm:pl-4">
                      <div className="text-[10px] font-bold uppercase text-emerald-600 flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Found by {pair.foundItem.userName}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <img src={pair.foundItem.image} alt={pair.foundItem.itemName} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                        <div>
                          <div className="font-bold text-slate-900">{pair.foundItem.itemName}</div>
                          <div className="text-slate-500 text-[11px]">
                            {pair.foundItem.subLocation || pair.foundItem.location} • {pair.foundItem.date}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => selectItem(pair.foundItem.id)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 pt-1"
                      >
                        <span>View Found Item</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Reported Listings (Requirement 9) */}
      {activeTab === 'reported' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Flag className="w-4 h-4 text-rose-600" />
                <span>Reported &amp; Flagged Listings</span>
              </h2>
              <p className="text-xs text-slate-500">
                User reports submitted for inaccurate info, inappropriate content, or spam.
              </p>
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 self-start sm:self-auto">
              {pendingReportedListings.length} Pending
            </span>
          </div>

          {pendingReportedListings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Flagged Listings</h3>
              <p className="text-xs text-slate-500 mt-1">All community reports have been addressed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingReportedListings.map(report => {
                const flaggedItem = items.find(i => i.id === report.itemId);
                return (
                  <div key={report.id} className="bg-white rounded-2xl border border-rose-200 p-4 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase mr-2">
                          Flag: {report.reason}
                        </span>
                        <span className="text-xs text-slate-500">
                          Reported by <strong className="text-slate-800">{report.reporterName}</strong> on {report.createdAt.split('T')[0]}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 self-start sm:self-auto">
                        Pending Action
                      </span>
                    </div>

                    {report.details && (
                      <div className="text-xs bg-slate-50 p-2.5 rounded-xl text-slate-700 border border-slate-100 italic">
                        "{report.details}"
                      </div>
                    )}

                    {flaggedItem ? (
                      <div className="flex items-center justify-between gap-3 bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                        <div className="flex items-center space-x-3">
                          <img src={flaggedItem.image} alt={flaggedItem.itemName} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{flaggedItem.itemName}</h4>
                            <p className="text-xs text-slate-500">{flaggedItem.location} • By {flaggedItem.userName}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => selectItem(flaggedItem.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 flex items-center space-x-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Review Listing</span>
                          </button>
                          <button
                            onClick={() => dismissFlag(report.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300"
                          >
                            Dismiss Flag
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove listing "${flaggedItem.itemName}" from college directory?`)) {
                                deleteItem(flaggedItem.id);
                                dismissFlag(report.id);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove Listing</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">
                        Item has already been removed or resolved.
                        <button
                          onClick={() => dismissFlag(report.id)}
                          className="ml-2 text-blue-600 font-bold hover:underline"
                        >
                          Dismiss Report
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Verified Items */}
      {activeTab === 'verified' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Staff-Verified Listings Directory</h2>
              <p className="text-xs text-slate-500">Items that have been vetted and approved for the college community.</p>
            </div>
            <span className="text-xs text-slate-500 font-semibold">{verifiedItems.length} verified</span>
          </div>

          <div className="divide-y divide-slate-100">
            {verifiedItems.map(item => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                <div className="flex items-center space-x-3">
                  <img src={item.image} alt={item.itemName} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        item.type === 'LOST' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.type}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{item.itemName}</h4>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      <span>{item.location} • Date: {item.date}</span>
                      {item.verifiedBy && (
                        <span className="ml-2 text-indigo-700 font-semibold">Verified by: {item.verifiedBy}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => selectItem(item.id)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 self-end sm:self-auto"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Reject Listing Review</h3>
            <p className="text-xs text-slate-500">
              Provide a reason for rejecting "{rejectModalItem.itemName}". The student will receive an in-app notice.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete details, duplicate report, item already claimed in Lab A..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setRejectModalItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
