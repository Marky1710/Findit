import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { findMatches } from '../utils/matchingAlgorithm';
import { CampusLocation } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { 
  ShieldCheck, 
  Users, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Check, 
  X, 
  ExternalLink, 
  Database, 
  FileText, 
  BarChart3, 
  Lock,
  Search,
  Sparkles, 
  Download,
  Terminal,
  MapPin,
  Plus,
  Power,
  Pencil,
  Clock,
  FileCheck2,
  RotateCcw,
  RefreshCw
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const { 
    items, 
    allUsers, 
    moderationReports, 
    claims,
    locations,
    addLocation,
    updateLocation,
    toggleLocationStatus,
    approveClaim,
    rejectClaim,
    openReviewClaimModal,
    verifyItem, 
    deleteItem, 
    restoreItem,
    refreshItems,
    dismissFlag, 
    selectItem,
    currentUser,
    setCurrentPage,
    openAuthModal,
    blockUser,
    unblockUser,
    restrictUser,
    unrestrictUser,
    deleteUser
  } = useApp();

  const [activeTab, setActiveTab] = useState<'items' | 'users' | 'claims' | 'moderation' | 'matches' | 'locations' | 'schema'>('items');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LOST' | 'FOUND' | 'DELETED'>('ALL');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Role Protection: Admin Only
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">
              Campus Administrator Access Required
            </h2>
            <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
              This console is strictly restricted to certified system administrators of Ismail Yusuf College. Please sign in with administrator credentials.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => openAuthModal('admin-login')}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all"
            >
              Sign In as Administrator
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

  // Location Management State
  const [locationArea, setLocationArea] = useState('Computer Science Department');
  const [locationName, setLocationName] = useState('');
  const [locationDesc, setLocationDesc] = useState('');
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [locationFilter, setLocationFilter] = useState<'ALL' | 'CS' | 'CAMPUS'>('ALL');

  // Location Editing State
  const [editingLocation, setEditingLocation] = useState<CampusLocation | null>(null);
  const [editArea, setEditArea] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Report lists: separate active vs soft-deleted
  const activeItems = items.filter(i => !i.deleted);
  const deletedItems = items.filter(i => i.deleted);

  // Statistics based on actual database reports (excluding soft-deleted)
  const totalLostItems = activeItems.filter(i => i.type === 'LOST').length;
  const totalFoundItems = activeItems.filter(i => i.type === 'FOUND').length;
  const totalRecoveredItems = activeItems.filter(i => i.status === 'RECOVERED').length;
  const pendingVerificationItems = activeItems.filter(i => i.verificationStatus === 'PENDING').length;
  const pendingClaimsCount = claims.filter(c => c.status === 'PENDING').length;
  const totalDeletedCount = deletedItems.length;

  // Calculate algorithmic match pairs for active items
  const allMatchPairs = activeItems
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

  const possibleMatchesCount = allMatchPairs.length;

  // Most reported locations based on actual active database reports
  const locationCounts: Record<string, number> = {};
  activeItems.forEach(item => {
    const loc = (item.subLocation || item.location || '').trim();
    if (loc) {
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    }
  });

  const mostReportedLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, count]) => count > 0);

  // Filtered items based on filterType and search
  const displayItems = items.filter(item => {
    if (filterType === 'DELETED') {
      if (!item.deleted) return false;
    } else {
      if (item.deleted) return false;
      if (filterType !== 'ALL' && item.type !== filterType) return false;
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        item.itemName.toLowerCase().includes(q) ||
        item.userName.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Action handlers with exact prompt confirmation
  const handleDeleteReport = async (item: { id: string; itemName: string }) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      const ok = await deleteItem(item.id);
      if (ok) {
        setActionFeedback(`Report "${item.itemName}" was soft-deleted. Normal users & staff can no longer see it.`);
        setTimeout(() => setActionFeedback(null), 4500);
      }
    }
  };

  const handleRestoreReport = async (item: { id: string; itemName: string }) => {
    if (window.confirm(`Restore report "${item.itemName}" back to active listings?`)) {
      const ok = await restoreItem(item.id);
      if (ok) {
        setActionFeedback(`Report "${item.itemName}" was restored and is now visible again.`);
        setTimeout(() => setActionFeedback(null), 4500);
      }
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshItems();
    setIsRefreshing(false);
    setActionFeedback("Admin Console synchronized with database.");
    setTimeout(() => setActionFeedback(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>CAMPUS MODERATION &amp; AUDIT CONSOLE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-xs text-slate-400">
            Monitor listings, verify student ownership claims, suppress spam/fake posts, and audit algorithm scores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 flex items-center space-x-2 transition-all"
            title="Force refresh data from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Database'}</span>
          </button>

          <div className="flex items-center space-x-3 text-xs bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <div className="text-slate-300">
              Active Admin: <strong className="text-white">{currentUser.name}</strong>
            </div>
            <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 font-bold rounded-lg border border-indigo-400/30 text-[10px] uppercase">
              Authorized Root
            </span>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionFeedback && (
        <div className="bg-slate-900 text-white px-4 sm:px-5 py-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-lg border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white font-bold px-2 py-0.5">
            ✕
          </button>
        </div>
      )}

      {/* Metrics Row: Calculated from actual database data (Requirement 15) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        
        <div className="bg-white rounded-2xl border border-red-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Total Lost</div>
          <div className="text-3xl font-black text-red-600 font-mono my-1">{totalLostItems}</div>
          <div className="text-[11px] text-slate-400">Total reported missing</div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Total Found</div>
          <div className="text-3xl font-black text-emerald-600 font-mono my-1">{totalFoundItems}</div>
          <div className="text-[11px] text-slate-400">Total submitted items</div>
        </div>

        <div className="bg-white rounded-2xl border border-indigo-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>Matches</span>
          </div>
          <div className="text-3xl font-black text-indigo-600 font-mono my-1">{possibleMatchesCount}</div>
          <div className="text-[11px] text-slate-400">Possible match pairs (≥60%)</div>
        </div>

        <div className="bg-white rounded-2xl border border-blue-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Recovered</div>
          <div className="text-3xl font-black text-blue-600 font-mono my-1">{totalRecoveredItems}</div>
          <div className="text-[11px] text-slate-400">Reunited successfully</div>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center space-x-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>Pending Verif.</span>
          </div>
          <div className="text-3xl font-black text-amber-600 font-mono my-1">{pendingVerificationItems}</div>
          <div className="text-[11px] text-slate-400">Awaiting staff review</div>
        </div>

        <div className="bg-white rounded-2xl border border-purple-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center space-x-1">
            <FileCheck2 className="w-3 h-3 text-purple-500" />
            <span>Claims</span>
          </div>
          <div className="text-3xl font-black text-purple-600 font-mono my-1">{pendingClaimsCount}</div>
          <div className="text-[11px] text-slate-400">Ownership proofs pending</div>
        </div>

        <div 
          onClick={() => {
            setActiveTab('items');
            setFilterType('DELETED');
          }}
          className={`bg-white rounded-2xl border p-4 shadow-xs cursor-pointer transition-all hover:scale-102 ${
            filterType === 'DELETED' && activeTab === 'items'
              ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-300'
              : 'border-rose-200 hover:border-rose-400 hover:bg-rose-50/20'
          }`}
          title="Click to view soft-deleted reports"
        >
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center space-x-1">
            <Trash2 className="w-3 h-3 text-rose-500" />
            <span>Soft-Deleted</span>
          </div>
          <div className="text-3xl font-black text-rose-600 font-mono my-1">{totalDeletedCount}</div>
          <div className="text-[11px] text-slate-400">Excluded from public</div>
        </div>

      </div>

      {/* Most Reported Locations (Requirement 15: Based on actual database reports, only display locations with reports) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
              Most Reported Locations (Actual Incident Data)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Only showing locations with active or historical reports
          </span>
        </div>

        {mostReportedLocations.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No reports with location tags recorded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {mostReportedLocations.map(([locName, count]) => {
              const isCS = locName.toLowerCase().includes('cs') || locName.toLowerCase().includes('lab');
              return (
                <button
                  key={locName}
                  onClick={() => {
                    setSearchTerm(locName);
                    setActiveTab('items');
                  }}
                  className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                    isCS
                      ? 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  }`}
                  title={`Filter items in ${locName}`}
                >
                  <span className="font-bold">{locName}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isCS ? 'bg-blue-200 text-blue-900' : 'bg-emerald-200 text-emerald-900'
                  }`}>
                    {count} {count === 1 ? 'report' : 'reports'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Navigation Tabs matching Section 10 */}
      <div className="border-b border-slate-200 flex flex-wrap items-center gap-2 sm:gap-6">
        <button
          onClick={() => {
            setActiveTab('items');
            if (filterType === 'DELETED') setFilterType('ALL');
          }}
          className={`pb-3 text-xs sm:text-sm font-bold transition-all relative ${
            activeTab === 'items' && filterType !== 'DELETED'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Active Listings ({activeItems.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('items');
            setFilterType('DELETED');
          }}
          className={`pb-3 text-xs sm:text-sm font-bold transition-all relative flex items-center space-x-1.5 ${
            activeTab === 'items' && filterType === 'DELETED'
              ? 'text-rose-600 border-b-2 border-rose-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          <span>Soft-Deleted Reports</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
            totalDeletedCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {totalDeletedCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-all relative ${
            activeTab === 'users'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Users ({allUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('claims')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-all relative flex items-center space-x-1.5 ${
            activeTab === 'claims'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Campus Claims &amp; Verification</span>
          <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {claims.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('moderation')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-all relative flex items-center space-x-1.5 ${
            activeTab === 'moderation'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Reported Content &amp; Spam</span>
          <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {moderationReports.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-all relative flex items-center space-x-1.5 ${
            activeTab === 'matches'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Matched Items Log ({allMatchPairs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('locations')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-all relative flex items-center space-x-1.5 ${
            activeTab === 'locations'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>Campus Locations ({locations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-all relative flex items-center space-x-1.5 ${
            activeTab === 'schema'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-blue-500" />
          <span>Database Schema &amp; Project Info</span>
        </button>
      </div>

      {/* TAB 1: Items Management */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search items or reporter..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  filterType === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Active ({activeItems.length})
              </button>
              <button
                onClick={() => setFilterType('LOST')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  filterType === 'LOST' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Lost ({totalLostItems})
              </button>
              <button
                onClick={() => setFilterType('FOUND')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  filterType === 'FOUND' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Found ({totalFoundItems})
              </button>
              <button
                onClick={() => setFilterType('DELETED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors ${
                  filterType === 'DELETED' 
                    ? 'bg-rose-600 text-white' 
                    : totalDeletedCount > 0
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Soft-Deleted ({totalDeletedCount})</span>
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Item &amp; Category</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Posted By</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Status &amp; Verification</th>
                    <th className="py-3 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        {filterType === 'DELETED' ? (
                          <div className="space-y-1.5">
                            <Trash2 className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="font-bold text-slate-700">No soft-deleted reports</p>
                            <p className="text-xs text-slate-400">All registered reports are currently active in the database.</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <Search className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="font-bold text-slate-700">No reports match your filters</p>
                            <p className="text-xs text-slate-400">Try adjusting your search keywords or filter category.</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    displayItems.map(item => (
                      <tr 
                        key={item.id} 
                        className={`transition-colors ${
                          item.deleted 
                            ? 'bg-rose-50/30 hover:bg-rose-50/60' 
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        
                        <td className="py-3 px-4 font-semibold text-slate-900 flex items-center space-x-3">
                          <img
                            src={item.image}
                            alt={item.itemName}
                            className={`w-10 h-10 rounded-lg object-cover border shrink-0 ${item.deleted ? 'opacity-70 grayscale-30' : ''}`}
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className={`font-bold ${item.deleted ? 'text-rose-950 line-through' : 'text-slate-900'}`}>
                                {item.itemName}
                              </span>
                              {item.deleted && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-600 text-white uppercase tracking-wider">
                                  Deleted
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {item.category} • Color: {item.color} • {item.date}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            item.type === 'LOST' 
                              ? 'bg-red-50 text-red-700 border border-red-200' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {item.type}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-800">
                          <div className="font-medium">{item.userName}</div>
                          <div className="text-[10px] text-slate-400">{item.userEmail}</div>
                        </td>

                        <td className="py-3 px-4 text-slate-700">
                          {item.location}
                        </td>

                        <td className="py-3 px-4">
                          {item.deleted ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-black border border-rose-200">
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span>Deleted</span>
                              </span>
                              {item.deletedAt && (
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {new Date(item.deletedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </div>
                              )}
                              <div className="text-[10px] text-rose-600 font-semibold flex items-center space-x-1">
                                <span>Deleted by Admin</span>
                              </div>
                            </div>
                          ) : item.isVerifiedByAdmin ? (
                            <span className="inline-flex items-center space-x-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                              Pending Review
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {item.deleted ? (
                            <div className="inline-flex items-center space-x-1.5">
                              <button
                                onClick={() => selectItem(item.id)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold"
                                title="View details"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleRestoreReport(item)}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center space-x-1 shadow-xs transition-all"
                                title="Restore report to public listings"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore</span>
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center space-x-1">
                              {!item.isVerifiedByAdmin && (
                                <button
                                  onClick={() => verifyItem(item.id)}
                                  className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold border border-blue-200"
                                  title="Verify report authenticity"
                                >
                                  Verify
                                </button>
                              )}

                              <button
                                onClick={() => selectItem(item.id)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold"
                                title="View listing details"
                              >
                                View
                              </button>

                              <button
                                onClick={() => handleDeleteReport(item)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                                title="Soft delete this report"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: Users Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">Campus Registered Users &amp; Permissions</h3>
            <span className="text-xs text-slate-500">Total Accounts: {allUsers.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Student/Staff ID</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 flex items-center space-x-3">
                      <UserAvatar name={user.name} role={user.role} size="sm" />
                      <div>
                        <div className="font-bold text-slate-900">{user.name}</div>
                        <div className="text-[10px] text-slate-400">{user.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      {user.studentId || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {user.department}
                    </td>
                    <td className="py-3 px-4 flex flex-col items-start gap-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        user.role === 'admin' 
                          ? 'bg-indigo-100 text-indigo-800' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {user.role}
                      </span>
                      {user.isBlocked && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">Blocked</span>}
                      {user.isRestricted && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">Restricted</span>}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-medium rounded text-[11px] border border-slate-200 inline-block">
                        {user.role === 'admin' ? 'Root Admin' : user.role === 'staff' ? 'Faculty Staff' : 'Student Account'}
                      </span>
                      {user.role !== 'admin' && (
                        <>
                          <button
                            onClick={async () => {
                              const success = user.isBlocked ? await unblockUser(user.id) : await blockUser(user.id);
                              if (success) {
                                setActionFeedback(`User ${user.name} has been ${user.isBlocked ? 'unblocked' : 'blocked'}.`);
                                setTimeout(() => setActionFeedback(null), 3000);
                              } else {
                                alert(`Failed to ${user.isBlocked ? 'unblock' : 'block'} user.`);
                              }
                            }}
                            className={`px-2 py-1 font-bold rounded text-[11px] ${user.isBlocked ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600' : 'bg-red-50 hover:bg-red-100 text-red-600'}`}
                          >
                            {user.isBlocked ? 'Unblock' : 'Block'}
                          </button>
                          
                          <button
                            onClick={async () => {
                              const success = user.isRestricted ? await unrestrictUser(user.id) : await restrictUser(user.id);
                              if (success) {
                                setActionFeedback(`User ${user.name} has been ${user.isRestricted ? 'unrestricted' : 'restricted'}.`);
                                setTimeout(() => setActionFeedback(null), 3000);
                              } else {
                                alert(`Failed to ${user.isRestricted ? 'unrestrict' : 'restrict'} user.`);
                              }
                            }}
                            className={`px-2 py-1 font-bold rounded text-[11px] ${user.isRestricted ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600' : 'bg-orange-50 hover:bg-orange-100 text-orange-600'}`}
                          >
                            {user.isRestricted ? 'Unrestrict' : 'Restrict'}
                          </button>

                          <button
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete the user ${user.name}? This action cannot be undone and will also delete their items.`)) {
                                const success = await deleteUser(user.id);
                                if (success) {
                                  setActionFeedback(`User ${user.name} deleted successfully.`);
                                  setTimeout(() => setActionFeedback(null), 3000);
                                } else {
                                  alert('Failed to delete user.');
                                }
                              }
                            }}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-[11px] ml-2"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Reported Content / Moderation */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Content Moderation Queue: </span>
              Users can flag suspicious listings, inappropriate photos, or duplicate entries. Review and take administrative action below.
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Flagged Item</th>
                    <th className="py-3 px-4">Reported By</th>
                    <th className="py-3 px-4">Reason / Issue</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Moderator Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {moderationReports.map(rep => {
                    const reportedItem = items.find(i => i.id === rep.itemId);
                    return (
                      <tr key={rep.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => reportedItem && selectItem(reportedItem.id)}
                            className="font-bold text-blue-600 hover:underline text-left"
                          >
                            {reportedItem ? reportedItem.itemName : `Item ID: ${rep.itemId}`}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-slate-800">{rep.reportedBy}</td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs">{rep.reason}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rep.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {rep.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => dismissFlag(rep.itemId)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded"
                          >
                            Dismiss Report
                          </button>
                          <button
                            onClick={() => {
                              if (reportedItem && confirm('Remove this reported listing completely?')) {
                                deleteItem(reportedItem.id);
                              }
                            }}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded"
                          >
                            Remove Post
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Campus Claims & Ownership Verification */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>All Campus Ownership Claims ({claims.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Audited student claims, submitted proofs, and authorized handovers
              </p>
            </div>
            <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {claims.filter(c => c.status === 'PENDING').length} Pending Campus Handover Reviews
            </div>
          </div>

          {claims.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
              No claims submitted across the platform yet.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Item Under Claim</th>
                      <th className="py-3 px-4">Claimant (Student)</th>
                      <th className="py-3 px-4">Reported By</th>
                      <th className="py-3 px-4">Proof Description</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {claims.map(claim => {
                      const item = items.find(i => i.id === claim.itemId);
                      return (
                        <tr key={claim.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{claim.itemName}</div>
                            <div className="text-[10px] text-slate-400">ID: {claim.itemId}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{claim.claimantName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              ID: {claim.claimantStudentId || 'Verified'}
                            </div>
                            <div className="text-[10px] text-slate-400">{claim.claimantEmail}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-700">{claim.ownerName}</div>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="italic text-slate-600 bg-slate-50 p-2 rounded text-[11px] line-clamp-2" title={claim.message}>
                              "{claim.message}"
                            </div>
                            {claim.resolutionNotes && (
                              <div className="text-[10px] text-emerald-700 font-medium mt-1">
                                Note: {claim.resolutionNotes}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              claim.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : claim.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {claim.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => openReviewClaimModal(claim)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded border border-indigo-200"
                              title="Inspect ownership evidence and physical handover checklist"
                            >
                              Review &amp; Handover
                            </button>

                            {claim.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={async () => {
                                    const success = await approveClaim(claim.id);
                                    if (success) {
                                      setActionFeedback(`Claim approved successfully.`);
                                      setTimeout(() => setActionFeedback(null), 3000);
                                    } else {
                                      alert('Failed to approve claim.');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={async () => {
                                    const success = await rejectClaim(claim.id);
                                    if (success) {
                                      setActionFeedback(`Claim rejected successfully.`);
                                      setTimeout(() => setActionFeedback(null), 3000);
                                    } else {
                                      alert('Failed to reject claim.');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[11px] rounded"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Matched Items Log (Algorithm Audit) */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Automated Algorithm Match Audit Log
              </h3>
              <p className="text-xs text-slate-500">
                System calculation log showing paired Lost vs Found items and similarity scores
              </p>
            </div>

            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
              {allMatchPairs.filter(p => p.isHighConfidence).length} Confident Match Pairings
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Lost Item (Owner)</th>
                    <th className="py-3 px-4">Matched Found Item (Finder)</th>
                    <th className="py-3 px-4">Location / Spot</th>
                    <th className="py-3 px-4">Match Score</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allMatchPairs.map((pair, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{pair.lostItem.itemName}</div>
                        <div className="text-[10px] text-slate-400">Owner: {pair.lostItem.userName}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-emerald-800">{pair.foundItem.itemName}</div>
                        <div className="text-[10px] text-slate-400">Finder: {pair.foundItem.userName}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {pair.lostItem.location} ↔ {pair.foundItem.location}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full font-mono font-black text-xs ${
                          pair.score >= 85
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-teal-100 text-teal-800 border border-teal-200'
                        }`}>
                          {pair.score}% {pair.isHighConfidence ? '★ High Match' : ''}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => selectItem(pair.lostItem.id)}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-[11px]"
                        >
                          Inspect Pair
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Campus Locations Management (IYC Configuration) */}
      {activeTab === 'locations' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <span>Ismail Yusuf College Campus Locations</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage official campus zones, Computer Science department facilities (Lab A, Lab B, CS1, CS2), and general student areas.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAddLocationModal(!showAddLocationModal)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddLocationModal ? 'Cancel' : 'Add Location'}</span>
                </button>
              </div>
            </div>

            {/* Quick Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 mr-2">Filter by Area:</span>
              <button
                onClick={() => setLocationFilter('ALL')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  locationFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Areas ({locations.length})
              </button>
              <button
                onClick={() => setLocationFilter('CS')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  locationFilter === 'CS'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                CS Department ({locations.filter(l => l.area.includes('Computer Science')).length})
              </button>
              <button
                onClick={() => setLocationFilter('CAMPUS')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  locationFilter === 'CAMPUS'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Campus Grounds &amp; Facilities ({locations.filter(l => !l.area.includes('Computer Science')).length})
              </button>
            </div>

            {/* Add Location Form Collapsible */}
            {showAddLocationModal && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!locationName.trim()) return;
                  addLocation(locationArea, locationName.trim(), locationDesc.trim());
                  setLocationName('');
                  setLocationDesc('');
                  setShowAddLocationModal(false);
                }}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 animate-in fade-in duration-150"
              >
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Add New Campus Location
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Campus Area</label>
                    <select
                      value={locationArea}
                      onChange={e => setLocationArea(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      <option value="Computer Science Department">Computer Science Department</option>
                      <option value="Campus Grounds & Other Locations">Campus Grounds & Other Locations</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Facility / Room Name</label>
                    <input
                      type="text"
                      required
                      value={locationName}
                      onChange={e => setLocationName(e.target.value)}
                      placeholder="e.g. Lab C, Physics Dept, Seminar Hall"
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
                    <input
                      type="text"
                      value={locationDesc}
                      onChange={e => setLocationDesc(e.target.value)}
                      placeholder="e.g. 2nd Floor, Main Building"
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddLocationModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs"
                  >
                    Save Location
                  </button>
                </div>
              </form>
            )}

            {/* Edit Location Modal / Inline Form (Requirement 13) */}
            {editingLocation && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!editName.trim()) return;
                  updateLocation(editingLocation.id, {
                    area: editArea,
                    name: editName.trim(),
                    description: editDesc.trim()
                  });
                  setEditingLocation(null);
                }}
                className="p-4 bg-indigo-50/80 rounded-xl border border-indigo-200 space-y-4 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Edit Location: {editingLocation.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingLocation(null)}
                    className="text-indigo-400 hover:text-indigo-700 text-xs font-bold"
                  >
                    ✕ Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-indigo-900 mb-1">Campus Area</label>
                    <select
                      value={editArea}
                      onChange={e => setEditArea(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="Computer Science Department">Computer Science Department</option>
                      <option value="Campus Grounds & Other Locations">Campus Grounds & Other Locations</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-indigo-900 mb-1">Facility / Room Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-indigo-900 mb-1">Description</label>
                    <input
                      type="text"
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingLocation(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* Locations Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Area</th>
                    <th className="py-2.5 px-3">Facility / Room Name</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {locations
                    .filter(loc => {
                      if (locationFilter === 'CS') return loc.area.includes('Computer Science');
                      if (locationFilter === 'CAMPUS') return !loc.area.includes('Computer Science');
                      return true;
                    })
                    .map(loc => (
                      <tr key={loc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            loc.area.includes('Computer Science')
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {loc.area}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 text-sm">
                          {loc.name}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {loc.description || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            loc.isActive
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {loc.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingLocation(loc);
                              setEditArea(loc.area);
                              setEditName(loc.name);
                              setEditDesc(loc.description || '');
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors inline-flex items-center space-x-1"
                            title="Edit location details"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => toggleLocationStatus(loc.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors inline-flex items-center space-x-1 ${
                              loc.isActive
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                            title={loc.isActive ? 'Disable location (preserves historical reports)' : 'Enable location'}
                          >
                            <Power className="w-3 h-3" />
                            <span>{loc.isActive ? 'Disable' : 'Enable'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Database Schema & Technical Architecture (For TY BSc CS Viva!) */}
      {activeTab === 'schema' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-slate-200 rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 text-white">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-lg">
                TY BSc CS Mini-Project Technical Architecture &amp; Database Design
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This system implements a 4-table relational data model (Users, Items, Messages, Matches) and an automated 100-point multi-parameter scoring engine.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              
              {/* Users Schema */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-indigo-400 font-bold">1. Table: users</div>
                <pre className="text-slate-300 text-[11px] leading-relaxed">
{`CREATE TABLE users (
  user_id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role ENUM('student', 'admin'),
  student_id VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`}
                </pre>
              </div>

              {/* Items Schema */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-emerald-400 font-bold">2. Table: items</div>
                <pre className="text-slate-300 text-[11px] leading-relaxed">
{`CREATE TABLE items (
  item_id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(user_id),
  type ENUM('LOST', 'FOUND') NOT NULL,
  item_name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  location VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  color VARCHAR(30),
  image_url TEXT,
  storage_location VARCHAR(150),
  status ENUM('ACTIVE', 'MATCHED', 'RECOVERED'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`}
                </pre>
              </div>

              {/* Messages Schema */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-blue-400 font-bold">3. Table: messages (Safe Contact)</div>
                <pre className="text-slate-300 text-[11px] leading-relaxed">
{`CREATE TABLE messages (
  message_id VARCHAR(36) PRIMARY KEY,
  sender_id VARCHAR(36) REFERENCES users(user_id),
  receiver_id VARCHAR(36) REFERENCES users(user_id),
  item_id VARCHAR(36) REFERENCES items(item_id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`}
                </pre>
              </div>

              {/* Matches Schema */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-amber-400 font-bold">4. Table: matches (Algorithmic Output)</div>
                <pre className="text-slate-300 text-[11px] leading-relaxed">
{`CREATE TABLE matches (
  match_id VARCHAR(36) PRIMARY KEY,
  lost_item_id VARCHAR(36) REFERENCES items(item_id),
  found_item_id VARCHAR(36) REFERENCES items(item_id),
  match_score INT NOT NULL, -- 0 to 100
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`}
                </pre>
              </div>

              {/* Claims Schema */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-pink-400 font-bold">5. Table: claims (Ownership Verification)</div>
                <pre className="text-slate-300 text-[11px] leading-relaxed">
{`CREATE TABLE claims (
  claim_id VARCHAR(36) PRIMARY KEY,
  item_id VARCHAR(36) REFERENCES items(item_id),
  claimant_id VARCHAR(36) REFERENCES users(user_id),
  owner_id VARCHAR(36) REFERENCES users(user_id),
  proof_message TEXT NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);`}
                </pre>
              </div>

              {/* Activity Logs Schema */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 md:col-span-2">
                <div className="text-purple-400 font-bold">6. Table: activity_logs (Audit Trail)</div>
                <pre className="text-slate-300 text-[11px] leading-relaxed">
{`CREATE TABLE activity_logs (
  log_id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(user_id),
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  event_type ENUM('MATCH', 'CLAIM', 'RECOVERY', 'STATUS') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`}
                </pre>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
