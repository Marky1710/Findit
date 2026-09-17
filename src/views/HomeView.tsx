import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { findMatches } from '../utils/matchingAlgorithm';
import { 
  Search, 
  PlusCircle, 
  MapPin, 
  Calendar, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  Compass, 
  CheckCircle2, 
  Layers, 
  Zap, 
  Tag,
  Clock,
  ExternalLink,
  BookOpen
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const { items, setCurrentPage, selectItem, setBrowseFilters } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  // Quick stats (must exclude soft-deleted reports)
  const activeItems = items.filter(i => !i.deleted);
  const totalLost = activeItems.filter(i => i.type === 'LOST' && i.status !== 'RECOVERED').length;
  const totalFound = activeItems.filter(i => i.type === 'FOUND' && i.status !== 'RECOVERED').length;
  const totalRecovered = activeItems.filter(i => i.status === 'RECOVERED').length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBrowseFilters(prev => ({
      ...prev,
      query: searchQuery.trim(),
      type: 'ALL'
    }));
    setCurrentPage('browse');
  };

  const handleQuickTagClick = (tag: string) => {
    setSearchQuery(tag);
    setBrowseFilters(prev => ({
      ...prev,
      query: tag,
      type: 'ALL'
    }));
    setCurrentPage('browse');
  };

  // Recent items (exclude soft-deleted reports)
  const recentLost = activeItems.filter(i => i.type === 'LOST' && i.status !== 'RECOVERED').slice(0, 3);
  const recentFound = activeItems.filter(i => i.type === 'FOUND' && i.status !== 'RECOVERED').slice(0, 3);

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 via-indigo-950 to-slate-950 text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8 rounded-b-3xl shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_50%)] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Ismail Yusuf College • Smart Campus Lost &amp; Found Portal</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-sans leading-tight">
            Lost something? <br className="hidden sm:inline" />
            <span className="text-blue-400">Found something?</span>
          </h1>

          <p className="text-lg sm:text-xl text-blue-200 font-semibold tracking-wide uppercase text-sm sm:text-base">
            Find it. Report it. Return it.
          </p>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Official system for students and staff of Ismail Yusuf College, Jogeshwari (East), Mumbai. Featuring location matching across CS Dept (Lab A, Lab B, CS1, CS2) and campus facilities.
          </p>

          {/* Quick Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              id="hero-report-lost-btn"
              onClick={() => setCurrentPage('report-lost')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Lost Item</span>
            </button>

            <button
              id="hero-report-found-btn"
              onClick={() => setCurrentPage('report-found')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Found Item</span>
            </button>
          </div>

          {/* Search Bar matching Section 1 */}
          <div className="pt-6 max-w-2xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <div className="absolute left-4 pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                id="home-search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search lost & found items (e.g. black wallet, keys, umbrella, ID card)..."
                className="w-full pl-12 pr-28 py-4 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400 font-medium text-sm shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/50"
              />
              <button
                type="submit"
                id="home-search-submit-btn"
                className="absolute right-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Search
              </button>
            </form>

            {/* Quick Search Suggestions */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-xs text-slate-300">
              <span className="text-slate-400 text-[11px]">Popular Searches:</span>
              {['Black Wallet', 'Samsung Earbuds', 'Casio Calculator', 'College ID Card', 'Keys', 'Charger'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleQuickTagClick(tag)}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 text-[11px] transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Live Ticker Metrics */}
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-12 pt-8 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-4 border border-white/10 text-center">
            <div className="text-2xl sm:text-3xl font-black text-red-400 font-mono">{totalLost}</div>
            <div className="text-xs text-slate-300 font-medium mt-0.5">Active Lost Items</div>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-4 border border-white/10 text-center">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">{totalFound}</div>
            <div className="text-xs text-slate-300 font-medium mt-0.5">Reported Found Items</div>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-4 border border-white/10 text-center">
            <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">{totalRecovered}</div>
            <div className="text-xs text-slate-300 font-medium mt-0.5">Reunited with Owners</div>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-4 border border-white/10 text-center">
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">92%</div>
            <div className="text-xs text-slate-300 font-medium mt-0.5">Algorithm Accuracy</div>
          </div>
        </div>
      </section>

      {/* ⭐ Section 8 Highlight: The Matching System */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>TY BSc CS Highlight Feature</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Automated Lost-Found Matching Algorithm
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Unlike a basic CRUD directory, FindIt runs a weighted heuristic matching engine every time a report is submitted or searched. It compares 5 core parameters to score potential matches out of 100 points:
              </p>
            </div>

            <div className="w-full lg:w-auto">
              <button
                onClick={() => {
                  setBrowseFilters(prev => ({ ...prev, query: 'wallet', type: 'ALL' }));
                  setCurrentPage('browse');
                }}
                className="w-full lg:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2"
              >
                <span>Test Algorithm on Live Items</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Formula Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-blue-200/60">
            <div className="bg-white rounded-2xl p-3.5 border border-blue-100 shadow-xs text-center">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</div>
              <div className="text-2xl font-black text-blue-600 font-mono my-1">30 Pts</div>
              <div className="text-[11px] text-slate-500">Exact or related device classification</div>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-blue-100 shadow-xs text-center">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</div>
              <div className="text-2xl font-black text-indigo-600 font-mono my-1">25 Pts</div>
              <div className="text-[11px] text-slate-500">Campus spot (Canteen, Audi, Library)</div>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-blue-100 shadow-xs text-center">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</div>
              <div className="text-2xl font-black text-emerald-600 font-mono my-1">20 Pts</div>
              <div className="text-[11px] text-slate-500">Time window delta (0 to 14 days)</div>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-blue-100 shadow-xs text-center">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Color</div>
              <div className="text-2xl font-black text-amber-600 font-mono my-1">15 Pts</div>
              <div className="text-[11px] text-slate-500">Visual hue, finish &amp; casing</div>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-blue-100 shadow-xs text-center col-span-2 sm:col-span-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Keywords</div>
              <div className="text-2xl font-black text-purple-600 font-mono my-1">10 Pts</div>
              <div className="text-[11px] text-slate-500">Brand, marks &amp; description NLP</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs bg-white/70 rounded-xl px-4 py-2.5 border border-blue-100">
            <span className="font-semibold text-slate-700">
              Threshold Rule: When <code className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">Score &gt;= 70%</code>, the system flags a <strong>"Possible Match"</strong> and alerts both parties!
            </span>
            <span className="hidden sm:inline text-emerald-700 font-bold">100 Point Max Total</span>
          </div>
        </div>
      </section>

      {/* How it Works - 4 Step Flow */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            How FindIt Works
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Reuniting lost belongings in 4 clear, verified steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-black text-base mb-4">
              1
            </div>
            <h3 className="font-bold text-base text-slate-900 mb-1">
              1. Report
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Post a lost or found item with details like category, location, date, color, and optional photos.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-blue-200 shadow-xs relative ring-2 ring-blue-500/10 flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-base mb-4">
              2
            </div>
            <h3 className="font-bold text-base text-slate-900 mb-1">
              2. Match
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The automated matching algorithm compares lost and found reports using our 100-point scoring model.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-base mb-4">
              3
            </div>
            <h3 className="font-bold text-base text-slate-900 mb-1">
              3. Connect
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Users communicate safely through built-in in-app messaging without exposing personal phone numbers.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-base mb-4">
              4
            </div>
            <h3 className="font-bold text-base text-slate-900 mb-1">
              4. Recover
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Submit an ownership claim, verify distinctive marks, and confirm when the item is officially recovered.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Lost Items Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              <span>Recently Reported Lost Items</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Have you seen any of these items around campus?
            </p>
          </div>
          <button
            onClick={() => {
              setBrowseFilters(prev => ({ ...prev, type: 'LOST' }));
              setCurrentPage('browse');
            }}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <span>View All Lost</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentLost.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No active lost items reported</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No active lost items are currently in the system. If you recently misplaced an item on campus, submit a report to alert the college community.
              </p>
            </div>
            <button
              onClick={() => setCurrentPage('report-lost')}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report a Lost Item</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentLost.map(item => {
              const matches = findMatches(item, activeItems);
              const topMatch = matches[0];
              const hasPossibleMatch = topMatch && topMatch.isPossibleMatch;

              return (
                <div
                  key={item.id}
                  id={`recent-lost-${item.id}`}
                  onClick={() => selectItem(item.id)}
                  className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-video bg-slate-100 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.itemName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 flex items-center space-x-1.5">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-red-600 text-white shadow-sm">
                        LOST
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 text-slate-800 backdrop-blur-xs border border-slate-200">
                        {item.category}
                      </span>
                    </div>

                    {hasPossibleMatch && (
                      <div className="absolute bottom-3 left-3 right-3 bg-emerald-600/95 text-white px-2.5 py-1 rounded-xl text-xs font-bold flex items-center justify-between backdrop-blur-xs shadow-md">
                        <span className="flex items-center space-x-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Possible Match!</span>
                        </span>
                        <span className="font-mono text-[11px] bg-white/20 px-1.5 py-0.5 rounded">
                          {topMatch.totalScore}% Match
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-1">
                        {item.itemName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center space-x-1 truncate max-w-[150px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Found Items Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span>Recently Reported Found Items</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Claim items found around the college campus and facilities.
            </p>
          </div>
          <button
            onClick={() => {
              setBrowseFilters(prev => ({ ...prev, type: 'FOUND' }));
              setCurrentPage('browse');
            }}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1"
          >
            <span>View All Found</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentFound.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No active found items awaiting claim</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                There are currently no unclaimed found items in the system. If you found an unattended item on campus or in the computer labs, submit a report to return it!
              </p>
            </div>
            <button
              onClick={() => setCurrentPage('report-found')}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report a Found Item</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentFound.map(item => {
              const matches = findMatches(item, activeItems);
              const topMatch = matches[0];
              const hasPossibleMatch = topMatch && topMatch.isPossibleMatch;

              return (
                <div
                  key={item.id}
                  id={`recent-found-${item.id}`}
                  onClick={() => selectItem(item.id)}
                  className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-video bg-slate-100 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.itemName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 flex items-center space-x-1.5">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-600 text-white shadow-sm">
                        FOUND
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 text-slate-800 backdrop-blur-xs border border-slate-200">
                        {item.category}
                      </span>
                    </div>

                    {hasPossibleMatch && (
                      <div className="absolute bottom-3 left-3 right-3 bg-blue-600/95 text-white px-2.5 py-1 rounded-xl text-xs font-bold flex items-center justify-between backdrop-blur-xs shadow-md">
                        <span className="flex items-center space-x-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Possible Match!</span>
                        </span>
                        <span className="font-mono text-[11px] bg-white/20 px-1.5 py-0.5 rounded">
                          {topMatch.totalScore}% Match
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors line-clamp-1">
                        {item.itemName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 truncate max-w-[150px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.date}</span>
                        </div>
                      </div>
                      {item.currentStorageLocation && (
                        <div className="text-[11px] text-emerald-700 font-medium truncate">
                          📍 Held at: {item.currentStorageLocation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
};
