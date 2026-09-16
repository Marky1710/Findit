import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Category, Item } from '../types';
import { calculateMatchScore, findMatches, getMatchStrengthDetails } from '../utils/matchingAlgorithm';
import { MatchingScoreBadge } from '../components/MatchingScoreBadge';
import { 
  Upload, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Tag, 
  CheckCircle2, 
  ArrowRight, 
  Info, 
  Eye, 
  Camera,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

const CATEGORIES: Category[] = [
  'ID Cards',
  'Electronics',
  'Documents',
  'Wallet',
  'Keys',
  'Bags',
  'Clothing',
  'Books & Stationery',
  'Other'
];

const COMMON_LOCATIONS = [
  'College Canteen',
  'Central Library',
  'Computer Science Lab 2',
  'Main Auditorium',
  'Sports Ground',
  'Chemistry Lab 1',
  'Hostel Block B',
  'Parking Lot A'
];

const SAMPLE_IMAGES = [
  { label: 'Earbuds / Tech', url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80' },
  { label: 'Leather Wallet', url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80' },
  { label: 'College ID', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80' },
  { label: 'Calculator', url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600&auto=format&fit=crop&q=80' },
  { label: 'Keys', url: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=600&auto=format&fit=crop&q=80' }
];

export const ReportLostView: React.FC = () => {
  const { items, addItem, selectItem, setCurrentPage, openContactModal, openClaimModal, currentUser, openAuthModal } = useApp();

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<Category>('Electronics');
  const [description, setDescription] = useState('');
  const [dateLost, setDateLost] = useState('2026-09-12');
  const [area, setArea] = useState('Computer Science Department');
  const [subLocation, setSubLocation] = useState('Lab A');
  const [specificLocation, setSpecificLocation] = useState('');
  const [location, setLocation] = useState('Computer Science Department - Lab A');
  const [color, setColor] = useState('Black');
  const [keywords, setKeywords] = useState('');
  const [imageUrl, setImageUrl] = useState(SAMPLE_IMAGES[0].url);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [contactPreference, setContactPreference] = useState<'in-app' | 'email' | 'phone'>('in-app');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const CS_SUB_LOCATIONS = ['Lab A', 'Lab B', 'CS1', 'CS2'];
  const OTHER_SUB_LOCATIONS = [
    'College Canteen',
    'Central Library',
    'Main Auditorium',
    'Sports Ground',
    'Parking Lot',
    'Gymkhana',
    'Administrative Office'
  ];

  const handleAreaChange = (newArea: string) => {
    setArea(newArea);
    const newSub = newArea === 'Computer Science Department' ? 'Lab A' : 'College Canteen';
    setSubLocation(newSub);
    setLocation(`${newArea} - ${newSub}`);
  };

  const handleSubLocationChange = (newSub: string) => {
    setSubLocation(newSub);
    setLocation(`${area} - ${newSub}`);
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Real-time Candidate Match Detection
  const potentialMatches = useMemo(() => {
    if (!itemName || itemName.length < 3) return [];

    const draftItem: Item = {
      id: 'draft-lost',
      userId: 'temp',
      userName: 'Draft',
      userContactPref: 'in-app',
      type: 'LOST',
      itemName: itemName.trim(),
      category: category,
      description: description.trim(),
      location: location.trim(),
      area,
      subLocation,
      specificLocation,
      date: dateLost,
      image: imageUrl,
      color: color.trim(),
      keywords: keywords.trim(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    return items
      .filter(item => item.type === 'FOUND' && item.status !== 'RECOVERED')
      .map(foundItem => calculateMatchScore(draftItem, foundItem))
      .filter(match => match.totalScore >= 50)
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [itemName, category, description, location, area, subLocation, specificLocation, dateLost, color, keywords, imageUrl, items]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !location.trim()) return;

    if (!currentUser) {
      openAuthModal('student-login');
      return;
    }

    const newId = addItem({
      type: 'LOST',
      itemName: itemName.trim(),
      category,
      description: description.trim(),
      location: location.trim(),
      area,
      subLocation,
      specificLocation: specificLocation.trim(),
      date: dateLost,
      image: imageUrl,
      color: color.trim(),
      keywords: keywords.trim(),
      additionalInfo: additionalInfo.trim(),
      userContactPref: contactPreference
    });

    setSubmittedId(newId);
  };

  // Quick autofill for demonstration
  const handleFillExample = () => {
    setItemName('Black Samsung Earbuds');
    setCategory('Electronics');
    setArea('Computer Science Department');
    setSubLocation('Lab A');
    setLocation('Computer Science Department - Lab A');
    setSpecificLocation('Bench near Lab A instructor desk');
    setDateLost('2026-09-10');
    setColor('Black');
    setKeywords('Samsung, earbuds, buds, bluetooth, black');
    setDescription('Black Samsung Galaxy Earbuds in black charging case. Left on lab desk during practicals.');
    setAdditionalInfo('Small scratch on the back of the charging case.');
    setImageUrl('https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80');
  };

  // Computed matches for the submitted item
  const postSubmissionMatches = useMemo(() => {
    if (!submittedId) return [];
    const createdItem = items.find(i => i.id === submittedId);
    if (!createdItem) return [];
    const activeFound = items.filter(i => !i.deleted && i.type === 'FOUND' && i.status !== 'RECOVERED');
    return findMatches(createdItem, activeFound);
  }, [submittedId, items]);

  if (submittedId) {
    const createdItem = items.find(i => i.id === submittedId);

    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        {/* Success Banner */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Lost Item Report Published!
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Your report for <strong>{createdItem?.itemName || itemName}</strong> has been logged to FindIt.
            Our automated 100-point matching engine ran immediately against all campus found listings.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setCurrentPage('matches')}
              className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-sm flex items-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-900" />
              <span>View All Possible Matches</span>
            </button>
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
            >
              Go to My Dashboard
            </button>
            <button
              onClick={() => {
                setSubmittedId(null);
                setItemName('');
                setDescription('');
                setLocation('');
                setKeywords('');
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              Report Another Item
            </button>
          </div>
        </div>

        {/* Post-Submission Match Results */}
        {postSubmissionMatches.length > 0 ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-blue-900 font-bold text-sm">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>
                  We found {postSubmissionMatches.length} potential {postSubmissionMatches.length === 1 ? 'match' : 'matches'} for your item!
                </span>
              </div>
              <span className="text-xs text-blue-700 font-medium">
                Similarity Threshold ≥ 60%
              </span>
            </div>

            <div className="space-y-4">
              {postSubmissionMatches.map((match, idx) => {
                const strength = getMatchStrengthDetails(match.matchStrength);
                return (
                  <div
                    key={idx}
                    className={`bg-white rounded-2xl border ${strength.cardBorder} p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}
                  >
                    <div className="flex items-start space-x-4">
                      <img
                        src={match.matchedItem.image}
                        alt={match.matchedItem.itemName}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${strength.badgeBg}`}>
                            {match.matchStrength}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-700">
                            Score: {match.totalScore}%
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900">
                          {match.matchedItem.itemName}
                        </h4>
                        <div className="text-xs text-slate-500 flex flex-wrap gap-2">
                          <span>📍 {match.matchedItem.location}</span>
                          <span>📅 {match.matchedItem.date}</span>
                          <span>🎨 {match.matchedItem.color}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => selectItem(match.matchedItem.id)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => openClaimModal(match.matchedItem)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center space-x-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Request Claim</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500">
            No active found listings immediately reached the 60% similarity threshold. You will receive an in-app notification the moment a matching item is reported.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-8">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-red-100 text-red-800 text-xs font-bold mb-1">
            <span>LOST ITEM REPORT</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Report a Lost Item
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Provide details about the item you lost so the campus matching algorithm can cross-reference it.
          </p>
        </div>

        <button
          type="button"
          onClick={handleFillExample}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition-colors self-start sm:self-auto"
        >
          ⚡ Autofill Demo Example (Earbuds)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            
            {/* Item Name */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                id="lost-item-name"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                placeholder="e.g. Samsung Galaxy Earbuds, Wildhorn Leather Wallet, Casio FX-991CW"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Category & Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as Category)}
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Primary Color
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  placeholder="e.g. Black, Silver, Blue, Red"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Structured IYC Campus Location & Date */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Campus Location Lost</span>
                  <span className="text-red-500">*</span>
                </span>
                <span className="text-[11px] text-blue-700 font-semibold bg-blue-100/70 px-2 py-0.5 rounded">
                  Ismail Yusuf College
                </span>
              </div>

              {/* Area Radio / Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleAreaChange('Computer Science Department')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    area === 'Computer Science Department'
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Computer Science Dept</span>
                    {area === 'Computer Science Department' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Lab A, Lab B, CS1, CS2</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleAreaChange('Campus Grounds & Other Locations')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    area === 'Campus Grounds & Other Locations'
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Campus Grounds &amp; Facilities</span>
                    {area === 'Campus Grounds & Other Locations' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Canteen, Library, Ground, Admin</div>
                </button>
              </div>

              {/* Specific Sub-location & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Specific Room / Facility <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={subLocation}
                    onChange={e => handleSubLocationChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {(area === 'Computer Science Department' ? CS_SUB_LOCATIONS : OTHER_SUB_LOCATIONS).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date Lost <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dateLost}
                    onChange={e => setDateLost(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Optional Specific Spot / Detail */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Optional Spot Detail <span className="text-[11px] text-slate-400 font-normal">(e.g. Desk near window, Row 3, Bench near podium)</span>
                </label>
                <input
                  type="text"
                  value={specificLocation}
                  onChange={e => setSpecificLocation(e.target.value)}
                  placeholder="e.g. Near projector screen, Corner table"
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Selected Location Confirmation Tag */}
              <div className="text-[11px] text-slate-600 flex items-center space-x-1.5 pt-1">
                <span className="font-semibold text-slate-500">Selected Location:</span>
                <span className="font-bold text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded-lg shadow-2xs">
                  {location} {specificLocation ? `(${specificLocation})` : ''}
                </span>
              </div>
            </div>

            {/* Keywords / Tags for Algorithm matching */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Keywords / Tags (Used for NLP Matching)</span>
                <span className="text-[11px] text-slate-400 font-normal">Comma-separated</span>
              </label>
              <input
                type="text"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                placeholder="e.g. Dell, black bag, lanyard, buds2, leather, titanium"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Our algorithm tokenizes these keywords to award up to 10 additional similarity points.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                id="lost-item-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Provide physical characteristics (brand, stickers, condition, scratches, distinct marks)..."
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Additional Information / Private Hints */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Identifying Proof / Distinctive Marks (For Verification)
              </label>
              <input
                type="text"
                value={additionalInfo}
                onChange={e => setAdditionalInfo(e.target.value)}
                placeholder="e.g. Lock screen wallpaper hint, internal student ID, engraving on bottom"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Image Selection / Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Upload Image or Choose Sample Photo (Optional)
              </label>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <img
                  src={imageUrl}
                  alt="Item Preview"
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200 shadow-xs"
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 flex items-center space-x-1.5 transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Choose File / Take Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Or select a sample campus preset:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_IMAGES.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImageUrl(sample.url)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          imageUrl === sample.url
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Preference */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Contact Preference
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'in-app', label: 'In-App Safe Chat (Recommended)' },
                  { id: 'email', label: 'College Email' },
                  { id: 'phone', label: 'Phone Call' }
                ].map(pref => (
                  <button
                    key={pref.id}
                    type="button"
                    onClick={() => setContactPreference(pref.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                      contactPreference === pref.id
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pref.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="submit"
                id="submit-lost-report-btn"
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-2"
              >
                <span>Submit Lost Report</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Real-time Match Detector Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl border border-blue-200 p-5 shadow-xs sticky top-24">
            
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 leading-tight">
                  Real-Time Match Scanner
                </h3>
                <p className="text-[11px] text-slate-500">
                  Calculates similarity against registered Found items as you type
                </p>
              </div>
            </div>

            {potentialMatches.length > 0 ? (
              <div className="space-y-3">
                <div className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-lg flex items-center justify-between">
                  <span>⚡ Found {potentialMatches.length} Potential Match candidate(s)!</span>
                  <span className="font-mono">Score &gt;= 50%</span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {potentialMatches.map((match, idx) => (
                    <div 
                      key={idx}
                      className="bg-white rounded-xl border border-blue-200/80 p-3.5 shadow-xs space-y-2.5 hover:border-blue-400 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <img
                          src={match.matchedItem.image}
                          alt={match.matchedItem.itemName}
                          className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-xs text-slate-900 truncate">
                              {match.matchedItem.itemName}
                            </h4>
                            <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              {match.totalScore}%
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {match.matchedItem.description}
                          </p>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-2">
                            <span>📍 {match.matchedItem.location}</span>
                            <span>📅 {match.matchedItem.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-blue-600 uppercase">
                          {match.matchStrength}
                        </span>
                        <button
                          type="button"
                          onClick={() => selectItem(match.matchedItem.id)}
                          className="text-[11px] font-bold text-slate-700 hover:text-blue-600 flex items-center space-x-1"
                        >
                          <span>Preview Found Item</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-200/70 text-slate-400 flex items-center justify-center mx-auto">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  {itemName.length >= 3 ? 'No candidate matches above 50% yet' : 'Enter item name to activate scanner'}
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  As you enter attributes, the 100-point algorithm compares category, location, date, color, and keywords.
                </p>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
