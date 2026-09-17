import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { findMatches } from '../utils/matchingAlgorithm';
import { Category, ItemType } from '../types';
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  Sparkles, 
  ArrowUpDown, 
  RotateCcw, 
  Plus, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Tag,
  Clock
} from 'lucide-react';

const CATEGORIES: ('All' | Category)[] = [
  'All',
  'Electronics',
  'Documents',
  'Wallet',
  'Keys',
  'Bags',
  'Clothing',
  'Books & Stationery',
  'Other'
];

const POPULAR_LOCATIONS = [
  'All',
  'Lab A',
  'Lab B',
  'CS1',
  'CS2',
  'Computer Science Department',
  'College Canteen',
  'Central Library',
  'Sports Ground',
  'Main Auditorium',
  'Security Cabin Gate 1'
];

export const BrowseView: React.FC = () => {
  const { 
    items, 
    browseFilters, 
    setBrowseFilters, 
    resetFilters, 
    selectItem, 
    setCurrentPage 
  } = useApp();

  // Active non-deleted items
  const activeItems = useMemo(() => items.filter(i => !i.deleted), [items]);

  // Filter logic
  const filteredItems = useMemo(() => {
    return activeItems.filter(item => {
      // 1. Status/Type filter
      if (browseFilters.type === 'ALL') {
        if (item.status === 'RECOVERED') return false;
      } else if (browseFilters.type === 'RECOVERED') {
        if (item.status !== 'RECOVERED') return false;
      } else {
        if (item.type !== browseFilters.type) return false;
        if (item.status === 'RECOVERED') return false;
      }

      // 2. Category filter
      if (browseFilters.category !== 'All' && item.category !== browseFilters.category) {
        return false;
      }

      // 3. Location filter
      if (browseFilters.location !== 'All') {
        const cleanLoc = item.location.toLowerCase();
        const targetLoc = browseFilters.location.toLowerCase();
        if (!cleanLoc.includes(targetLoc) && !targetLoc.includes(cleanLoc)) {
          return false;
        }
      }

      // 4. Date filter
      if (browseFilters.date && item.date !== browseFilters.date) {
        return false;
      }

      // 5. Query / keyword filter
      if (browseFilters.query) {
        const q = browseFilters.query.toLowerCase();
        const matchesName = item.itemName.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesLoc = item.location.toLowerCase().includes(q);
        const matchesColor = (item.color || '').toLowerCase().includes(q);
        const matchesCat = item.category.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesLoc && !matchesColor && !matchesCat) {
          return false;
        }
      }

      return true;
    });
  }, [items, browseFilters]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
            Browse Lost &amp; Found Items
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, filter by location or category, and inspect possible matching records.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage('report-lost')}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
          >
            + Report Lost
          </button>
          <button
            onClick={() => setCurrentPage('report-found')}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            + Report Found
          </button>
        </div>
      </div>

      {/* Primary Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        
        {/* Search Input */}
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            id="browse-search-input"
            value={browseFilters.query}
            onChange={e => setBrowseFilters(prev => ({ ...prev, query: e.target.value }))}
            placeholder='Search by item name, description, color, brand (e.g. "black wallet", "earbuds", "ID Card")...'
            className="w-full pl-11 pr-24 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          {browseFilters.query && (
            <button
              onClick={() => setBrowseFilters(prev => ({ ...prev, query: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 px-2 py-1 rounded"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status / Type Segmented Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setBrowseFilters(prev => ({ ...prev, type: 'ALL' }))}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                browseFilters.type === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Items ({activeItems.filter(i => i.status !== 'RECOVERED').length})
            </button>
            <button
              onClick={() => setBrowseFilters(prev => ({ ...prev, type: 'LOST' }))}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                browseFilters.type === 'LOST'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-red-700 hover:bg-red-50'
              }`}
            >
              Lost Items ({activeItems.filter(i => i.type === 'LOST' && i.status !== 'RECOVERED').length})
            </button>
            <button
              onClick={() => setBrowseFilters(prev => ({ ...prev, type: 'FOUND' }))}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                browseFilters.type === 'FOUND'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Found Items ({activeItems.filter(i => i.type === 'FOUND' && i.status !== 'RECOVERED').length})
            </button>
            <button
              onClick={() => setBrowseFilters(prev => ({ ...prev, type: 'RECOVERED' }))}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                browseFilters.type === 'RECOVERED'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              Recovered ({activeItems.filter(i => i.status === 'RECOVERED').length})
            </button>
          </div>

          {/* Reset Filters button */}
          <button
            onClick={resetFilters}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 py-1 px-2.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>

        {/* Detailed Filters Grid (Category, Location, Date) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          
          {/* Category Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              id="filter-category"
              value={browseFilters.category}
              onChange={e => setBrowseFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Location Select */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Location
            </label>
            <select
              id="filter-location"
              value={browseFilters.location}
              onChange={e => setBrowseFilters(prev => ({ ...prev, location: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {POPULAR_LOCATIONS.map(loc => (
                <option key={loc} value={loc}>
                  {loc === 'All' ? 'All Campus Locations' : loc}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Date
            </label>
            <div className="relative">
              <input
                type="date"
                id="filter-date"
                value={browseFilters.date}
                onChange={e => setBrowseFilters(prev => ({ ...prev, date: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 py-1.5 px-3 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {browseFilters.date && (
                <button
                  type="button"
                  onClick={() => setBrowseFilters(prev => ({ ...prev, date: '' }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Results Count & Active Pills */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span className="font-semibold text-slate-700">
          Showing <span className="text-slate-900 font-bold">{filteredItems.length}</span> items
        </span>
        <span className="text-slate-400">
          Click any card to view full details, safe contact &amp; matching candidates
        </span>
      </div>

      {/* Items Grid matching the ASCII card structure */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No matching items found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search keywords, location or category filters, or be the first to report it!
          </p>
          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Clear Filters
            </button>
            <button
              onClick={() => setCurrentPage('report-lost')}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              Report Lost Item
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => {
            const matches = findMatches(item, activeItems);
            const topMatch = matches[0];
            const hasPossibleMatch = topMatch && topMatch.isPossibleMatch;

            return (
              <div
                key={item.id}
                id={`item-card-${item.id}`}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Image Section */}
                <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.itemName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3 flex items-center space-x-1.5">
                    {item.status === 'RECOVERED' ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-blue-600 text-white shadow-sm">
                        RECOVERED ✓
                      </span>
                    ) : item.type === 'LOST' ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-red-600 text-white shadow-sm">
                        LOST
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-600 text-white shadow-sm">
                        FOUND
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 text-slate-800 backdrop-blur-xs border border-slate-200">
                      {item.category}
                    </span>
                  </div>

                  {/* Color tag */}
                  {item.color && (
                    <div className="absolute top-3 right-3 bg-slate-900/80 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-xs">
                      Color: {item.color}
                    </div>
                  )}

                  {/* High Match Alert Banner on Card */}
                  {hasPossibleMatch && (
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg">
                      <span className="flex items-center space-x-1.5 truncate">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span className="truncate">Possible Match Found!</span>
                      </span>
                      <span className="font-mono text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-extrabold">
                        {topMatch.totalScore}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Content Section matching Section 4 */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      {item.itemName}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Metadata fields */}
                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        <strong className="text-slate-700">Location:</strong> {item.location}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        <strong className="text-slate-700">Date:</strong> {item.date}
                      </span>
                    </div>

                    {item.currentStorageLocation && (
                      <div className="text-[11px] text-emerald-700 font-medium truncate bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                        📍 <strong>Held at:</strong> {item.currentStorageLocation}
                      </div>
                    )}

                    {/* Verification Status */}
                    {item.verificationStatus === 'VERIFIED' || item.isVerifiedByAdmin ? (
                      <div className="text-[10px] text-emerald-700 font-semibold flex items-center space-x-1 pt-0.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Verified listing ({item.verifiedBy || 'IYC Faculty'})</span>
                      </div>
                    ) : item.verificationStatus === 'PENDING' ? (
                      <div className="text-[10px] text-amber-700 font-semibold flex items-center space-x-1 pt-0.5">
                        <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>Pending Staff Verification</span>
                      </div>
                    ) : null}
                  </div>

                  {/* View Details Action Button matching Section 4 */}
                  <div className="pt-2">
                    <button
                      id={`view-details-${item.id}`}
                      onClick={() => selectItem(item.id)}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-blue-600 text-white transition-all shadow-xs flex items-center justify-center space-x-1.5"
                    >
                      <span>View Details</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
