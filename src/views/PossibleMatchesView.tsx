import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { findMatches, getMatchStrengthDetails, isReportEligibleForMatching } from '../utils/matchingAlgorithm';
import { Item, MatchScoreDetails } from '../types';
import { 
  Sparkles, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  Check, 
  ExternalLink, 
  MessageSquare, 
  ShieldCheck, 
  Filter,
  Layers,
  ArrowUpDown,
  Search,
  RefreshCw
} from 'lucide-react';

export const PossibleMatchesView: React.FC = () => {
  const { 
    items, 
    currentUser, 
    selectItem, 
    openContactModal, 
    openClaimModal, 
    setCurrentPage,
    refreshData
  } = useApp();

  const [scope, setScope] = useState<'MY_ITEMS' | 'ALL_ITEMS'>('ALL_ITEMS');
  const [minScore, setMinScore] = useState<number>(60);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculateMessage, setRecalculateMessage] = useState<string | null>(null);

  const handleRecalculateMatches = async () => {
    setIsRecalculating(true);
    setRecalculateMessage(null);
    try {
      const res = await fetch('/api/matches');
      if (res.ok) {
        if (refreshData) {
          await refreshData();
        }
        setRecalculateMessage('Matches refreshed from persistent database.');
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsRecalculating(false);
      setTimeout(() => setRecalculateMessage(null), 3500);
    }
  };

  // Pairings calculation: For lost items, find corresponding found matches
  // Strictly excludes DELETED, REJECTED, RECOVERED, and CLOSED reports
  const matchPairings = useMemo(() => {
    const activeLost = items.filter(item => {
      if (!isReportEligibleForMatching(item) || item.type !== 'LOST') return false;
      if (scope === 'MY_ITEMS' && (!currentUser || item.userId !== currentUser.id)) return false;
      return true;
    });

    const activeFound = items.filter(item => isReportEligibleForMatching(item) && item.type === 'FOUND');

    const results: Array<{
      lostItem: Item;
      foundItem: Item;
      matchDetails: MatchScoreDetails;
    }> = [];

    activeLost.forEach(lostItem => {
      const candidates = findMatches(lostItem, activeFound);
      candidates.forEach(match => {
        if (match.totalScore >= minScore) {
          // Search query check
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchesText = 
              lostItem.itemName.toLowerCase().includes(q) ||
              match.matchedItem.itemName.toLowerCase().includes(q) ||
              lostItem.location.toLowerCase().includes(q) ||
              match.matchedItem.location.toLowerCase().includes(q);
            if (!matchesText) return;
          }

          results.push({
            lostItem,
            foundItem: match.matchedItem,
            matchDetails: match
          });
        }
      });
    });

    // Sort by highest match score descending
    return results.sort((a, b) => b.matchDetails.totalScore - a.matchDetails.totalScore);
  }, [items, currentUser?.id, scope, minScore, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Automated NLP Lost-Found Matching Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
            Possible Matches
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated semantic pairings between reported Lost and Found items evaluated against our explainable 100-point NLP scoring algorithm.
          </p>
          {recalculateMessage && (
            <p className="text-xs font-semibold text-emerald-600 mt-2 bg-emerald-50 px-3 py-1 rounded-lg inline-block border border-emerald-200">
              ✓ {recalculateMessage}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRecalculateMatches}
            disabled={isRecalculating}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors shadow-xs flex items-center space-x-1.5"
            title="Recalculate semantic match pairings from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRecalculating ? 'animate-spin' : ''}`} />
            <span>{isRecalculating ? 'Recalculating...' : 'Recalculate'}</span>
          </button>
          <button
            onClick={() => setCurrentPage('report-lost')}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors shadow-xs"
          >
            + Report Lost Item
          </button>
          <button
            onClick={() => setCurrentPage('report-found')}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
          >
            + Report Found Item
          </button>
        </div>
      </div>

      {/* Control Bar: Scope toggle, search, score threshold */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Scope Pill Toggle */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setScope('ALL_ITEMS')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              scope === 'ALL_ITEMS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Campus Matches ({matchPairings.length})
          </button>
          <button
            onClick={() => setScope('MY_ITEMS')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              scope === 'MY_ITEMS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-blue-700 hover:bg-blue-50'
            }`}
          >
            Matches for My Items
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search pairing names or locations..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Min Score Threshold */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">Minimum Score:</span>
          <select
            value={minScore}
            onChange={e => setMinScore(Number(e.target.value))}
            className="rounded-xl border border-slate-300 py-1.5 px-3 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value={90}>90%+ (Very Strong Match)</option>
            <option value={75}>75%+ (Strong Match)</option>
            <option value={60}>60%+ (Possible Match)</option>
            <option value={40}>40%+ (All Candidates)</option>
          </select>
        </div>

      </div>

      {/* Pairing Cards Grid */}
      {matchPairings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Candidate Matches Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {scope === 'MY_ITEMS'
              ? "None of your reported items have crossed the similarity threshold with current campus listings yet. As soon as a matching item is reported, you will be notified!"
              : "Try lowering the minimum score threshold or adjust search filters to explore candidate matches."}
          </p>
          <div className="flex justify-center space-x-3 pt-2">
            <button
              onClick={() => { setMinScore(40); setSearchQuery(''); }}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Reset Filters
            </button>
            <button
              onClick={() => setCurrentPage('browse')}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Browse All Items
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {matchPairings.map(({ lostItem, foundItem, matchDetails }, index) => {
            const strength = getMatchStrengthDetails(matchDetails.matchStrength);

            return (
              <div
                key={`${lostItem.id}-${foundItem.id}-${index}`}
                className={`bg-white rounded-3xl border ${strength.cardBorder} p-5 sm:p-6 shadow-xs hover:shadow-md transition-all`}
              >
                {/* Top bar with match percentage and badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${strength.badgeBg}`}>
                      {matchDetails.matchStrength}
                    </span>
                    <div className="text-xs text-slate-600">
                      Automated Score: <strong className="font-mono text-slate-900 text-sm">{matchDetails.totalScore}%</strong>
                    </div>
                  </div>

                  {/* 5-parameter checkmark indicators matching 100-point rubric */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={`px-2 py-0.5 rounded-full flex items-center space-x-1 font-medium ${
                      matchDetails.keywordsScore >= 15 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Check className="w-3 h-3" />
                      <span>Semantic NLP ({matchDetails.keywordsScore}/25)</span>
                    </span>

                    <span className={`px-2 py-0.5 rounded-full flex items-center space-x-1 font-medium ${
                      matchDetails.categoryScore >= 18 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Check className="w-3 h-3" />
                      <span>Category ({matchDetails.categoryScore}/25)</span>
                    </span>

                    <span className={`px-2 py-0.5 rounded-full flex items-center space-x-1 font-medium ${
                      matchDetails.locationScore >= 18 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Check className="w-3 h-3" />
                      <span>Location ({matchDetails.locationScore}/25)</span>
                    </span>

                    <span className={`px-2 py-0.5 rounded-full flex items-center space-x-1 font-medium ${
                      matchDetails.dateScore >= 10 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Check className="w-3 h-3" />
                      <span>Date ({matchDetails.dateScore}/15)</span>
                    </span>

                    <span className={`px-2 py-0.5 rounded-full flex items-center space-x-1 font-medium ${
                      matchDetails.colorScore >= 8 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Check className="w-3 h-3" />
                      <span>Color ({matchDetails.colorScore}/10)</span>
                    </span>
                  </div>
                </div>

                {/* Match Factors Badges */}
                {matchDetails.matchFactors && matchDetails.matchFactors.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-3 pb-1 border-b border-slate-50">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Match Factors:</span>
                    {matchDetails.matchFactors.map((factor, fIdx) => (
                      <span key={fIdx} className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        ✓ {factor}
                      </span>
                    ))}
                  </div>
                )}

                {/* Comparison Columns: Lost Item vs Found Item */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-5">
                  
                  {/* Left: Lost Item */}
                  <div className="bg-red-50/50 rounded-2xl p-4 border border-red-100 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600 text-white">
                          LOST ITEM
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Reported by: <strong>{lostItem.userName}</strong>
                        </span>
                      </div>

                      <div className="flex space-x-3">
                        <img
                          src={lostItem.image}
                          alt={lostItem.itemName}
                          className="w-16 h-16 rounded-xl object-cover border border-red-200 shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-snug">
                            {lostItem.itemName}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                            {lostItem.description}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-2 border-t border-red-100">
                        <div>📍 {lostItem.location}</div>
                        <div>📅 {lostItem.date}</div>
                        <div>🎨 Color: {lostItem.color}</div>
                        <div>🏷️ {lostItem.category}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => selectItem(lostItem.id)}
                      className="mt-3 text-xs font-bold text-red-600 hover:text-red-800 flex items-center space-x-1"
                    >
                      <span>View Lost Item Details</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Right: Found Item */}
                  <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white">
                          FOUND CANDIDATE
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Found by: <strong>{foundItem.userName}</strong>
                        </span>
                      </div>

                      <div className="flex space-x-3">
                        <img
                          src={foundItem.image}
                          alt={foundItem.itemName}
                          className="w-16 h-16 rounded-xl object-cover border border-emerald-200 shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-snug">
                            {foundItem.itemName}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                            {foundItem.description}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-2 border-t border-emerald-100">
                        <div>📍 {foundItem.location}</div>
                        <div>📅 {foundItem.date}</div>
                        <div>🎨 Color: {foundItem.color}</div>
                        <div>🏷️ {foundItem.category}</div>
                      </div>

                      {foundItem.currentStorageLocation && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-100/70 p-2 rounded-xl border border-emerald-200 font-medium">
                          📍 <strong>Deposited at:</strong> {foundItem.currentStorageLocation}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => selectItem(foundItem.id)}
                      className="mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1"
                    >
                      <span>View Found Item Details</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                </div>

                {/* Card Action Buttons: [ View Match ], [ Contact User ], [ Request Claim ] */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => selectItem(foundItem.id)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center space-x-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Match Details</span>
                  </button>

                  <button
                    onClick={() => openContactModal(foundItem)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 transition-colors flex items-center space-x-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Contact {foundItem.userName.split(' ')[0]}</span>
                  </button>

                  <button
                    onClick={() => openClaimModal(foundItem)}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 transition-all flex items-center space-x-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Request Claim</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
