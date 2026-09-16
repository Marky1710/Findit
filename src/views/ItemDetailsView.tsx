import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { findMatches } from '../utils/matchingAlgorithm';
import { MatchingScoreBadge } from '../components/MatchingScoreBadge';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Tag, 
  User, 
  MessageSquare, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Share2, 
  Building, 
  Lock, 
  ExternalLink, 
  Clock, 
  Flag,
  ShieldAlert,
  FileCheck2,
  Maximize2,
  X,
  Printer,
  Info,
  SlidersHorizontal,
  Check,
  Trash2,
  RotateCcw
} from 'lucide-react';

export const ItemDetailsView: React.FC = () => {
  const { 
    items, 
    claims,
    selectedItemId, 
    setCurrentPage, 
    selectItem, 
    openContactModal, 
    openClaimModal,
    openReviewClaimModal,
    currentUser,
    markAsRecovered,
    verifyItem,
    openEditModal,
    flagItem,
    deleteItem,
    restoreItem
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagSuccess, setFlagSuccess] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [filterHighConfidenceOnly, setFilterHighConfidenceOnly] = useState(true);
  const [recoverySuccessNotice, setRecoverySuccessNotice] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const item = items.find(i => i.id === selectedItemId);

  // If item does not exist or is soft-deleted and current user is not admin
  if (!item || (item.deleted && currentUser.role !== 'admin')) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <Info className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Report Removed</h2>
        <p className="text-sm text-slate-500">This report has been removed and is no longer available.</p>
        <button
          onClick={() => setCurrentPage('browse')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
        >
          Back to Browse Items
        </button>
      </div>
    );
  }

  // Calculate algorithmic matches for this item (excluding soft-deleted items)
  const activeItems = items.filter(i => !i.deleted);
  const matchCandidates = findMatches(item, activeItems);
  const highConfidenceMatches = matchCandidates.filter(m => m.isPossibleMatch);
  const displayedMatches = filterHighConfidenceOnly ? highConfidenceMatches : matchCandidates;
  
  const isOwnItem = item.userId === currentUser.id;
  const itemClaims = claims.filter(c => c.itemId === item.id);
  const pendingClaimsOnThisItem = itemClaims.filter(c => c.status === 'PENDING');
  const approvedClaimOnThisItem = itemClaims.find(c => c.status === 'APPROVED');
  const myClaimOnThisItem = claims.find(c => c.itemId === item.id && c.claimantId === currentUser.id);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleMarkRecovered = (itemId: string) => {
    markAsRecovered(itemId);
    setRecoverySuccessNotice(true);
    setTimeout(() => setRecoverySuccessNotice(false), 4000);
  };

  const handleFlag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagReason.trim()) return;
    flagItem(item.id, flagReason);
    setFlagSuccess(true);
    setTimeout(() => {
      setShowFlagModal(false);
      setFlagSuccess(false);
      setFlagReason('');
    }, 1800);
  };

  const handlePrintNotice = () => {
    window.print();
  };

  const keywordsList = item.keywords 
    ? item.keywords.split(',').map(k => k.trim()).filter(Boolean)
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      
      {/* Top Nav & Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <button
          id="back-to-browse-btn"
          onClick={() => setCurrentPage('browse')}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Browse Listings</span>
        </button>

        <div className="flex items-center space-x-2">
          {/* Print Notice button */}
          <button
            onClick={handlePrintNotice}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
            title="Print printable campus lost/found notice"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Print Notice</span>
          </button>

          {/* Share Listing button */}
          <button
            id="share-listing-btn"
            onClick={handleShare}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Share Listing</span>
              </>
            )}
          </button>

          {/* Report suspicious listing button */}
          {!isOwnItem && !item.deleted && (
            <button
              onClick={() => setShowFlagModal(true)}
              className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-red-600 px-2.5 py-2 rounded-xl hover:bg-red-50/50 transition-colors border border-transparent hover:border-red-100"
              title="Report suspicious or fake post"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Report</span>
            </button>
          )}

          {/* Admin Direct Action: Soft Delete / Restore */}
          {currentUser.role === 'admin' && (
            item.deleted ? (
              <button
                onClick={async () => {
                  if (window.confirm(`Restore report "${item.itemName}" back to active listings?`)) {
                    await restoreItem(item.id);
                  }
                }}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 hover:text-white hover:bg-emerald-600 bg-emerald-50 border border-emerald-300 px-3 py-2 rounded-xl transition-all shadow-xs"
                title="Restore this report to active public view"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Report</span>
              </button>
            ) : (
              <button
                onClick={async () => {
                  if (window.confirm("Are you sure you want to delete this report?")) {
                    const ok = await deleteItem(item.id);
                    if (ok) {
                      setCurrentPage('admin');
                    }
                  }
                }}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl transition-all shadow-xs"
                title="Soft delete this report"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Report</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Admin Soft-Deleted Notification Banner */}
      {item.deleted && (
        <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-black text-rose-950 uppercase tracking-wide">
                  Report Soft-Deleted (Hidden from Public &amp; Staff)
                </h4>
                <span className="px-2 py-0.5 bg-rose-600 text-white font-mono font-extrabold text-[10px] rounded uppercase">
                  Archived
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-0.5">
                {item.deletedAt ? `Deleted on ${new Date(item.deletedAt).toLocaleString()}` : 'Marked as soft-deleted'}. This report does not appear on Home, Browse, Search, Dashboards, or Possible Matches.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (window.confirm(`Restore report "${item.itemName}" back to active listings?`)) {
                await restoreItem(item.id);
              }
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 self-start sm:self-auto shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Report</span>
          </button>
        </div>
      )}

      {/* Recovered Banner Announcement if item is resolved */}
      {item.status === 'RECOVERED' && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">
                Item Successfully Reunited &amp; Recovered!
              </h4>
              <p className="text-xs text-emerald-800">
                This case has been resolved and marked complete in the campus register.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-600 text-white font-extrabold text-xs rounded-full uppercase tracking-wider">
            Closed Case
          </span>
        </div>
      )}

      {/* Success celebration toast when marking recovered */}
      {recoverySuccessNotice && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <span className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Listing updated! Item marked as successfully Recovered.</span>
          </span>
          <button onClick={() => setRecoverySuccessNotice(false)} className="text-white font-bold px-2">
            ✕
          </button>
        </div>
      )}

      {/* Main Item Showcase Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* Photo Column */}
        <div className="lg:col-span-6 bg-slate-100 relative min-h-[360px] lg:min-h-[500px] flex items-center justify-center overflow-hidden group">
          <img
            src={item.image}
            alt={item.itemName}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            referrerPolicy="no-referrer"
          />

          {/* Lightbox Trigger Button */}
          <button
            onClick={() => setShowImageLightbox(true)}
            className="absolute bottom-4 right-4 bg-slate-900/75 hover:bg-slate-900 text-white p-2 rounded-xl backdrop-blur-xs transition-colors shadow-md opacity-80 group-hover:opacity-100 flex items-center space-x-1.5 text-xs font-semibold"
            title="Inspect full-size image"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Zoom Photo</span>
          </button>

          {/* Status Badges Overlay */}
          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
            {item.status === 'RECOVERED' ? (
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-600 text-white shadow-md flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>RECOVERED</span>
              </span>
            ) : item.type === 'LOST' ? (
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-red-600 text-white shadow-md">
                LOST ITEM
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-600 text-white shadow-md">
                FOUND ITEM
              </span>
            )}

            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 text-slate-900 backdrop-blur-xs shadow-xs border border-slate-200">
              {item.category}
            </span>
          </div>

          {/* Campus Security & Staff Verified Badge */}
          {item.verificationStatus === 'VERIFIED' || item.isVerifiedByAdmin ? (
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-xs text-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-slate-200 shadow-md">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Verified: {item.verifiedBy || 'IYC CS Faculty'}</span>
            </div>
          ) : item.verificationStatus === 'PENDING' ? (
            <div className="absolute bottom-4 left-4 bg-amber-500 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md">
              <Clock className="w-4 h-4 text-slate-950 shrink-0" />
              <span>Pending Staff Verification</span>
            </div>
          ) : null}
        </div>

        {/* Details Column */}
        <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            
            {/* Header & Title */}
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {item.type === 'LOST' ? 'Campus Lost Report' : 'Found Item Record'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ID: #{item.id.slice(-6).toUpperCase()}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {item.itemName}
              </h1>
            </div>

            {/* Description Box */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Listing Description
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                {item.description}
              </p>
            </div>

            {/* Indexed Keywords Tags (For viva demonstration of token matching) */}
            {keywordsList.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                  <Tag className="w-3 h-3 text-slate-400" />
                  <span>Indexed Keywords (Algorithm Tokens)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {keywordsList.map((kw, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-medium"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 4-Box Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-semibold mb-0.5 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{item.type === 'LOST' ? 'Lost Location' : 'Found Spot'}</span>
                </div>
                <div className="font-bold text-slate-900 text-sm line-clamp-1">{item.location}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-semibold mb-0.5 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Date Logged</span>
                </div>
                <div className="font-bold text-slate-900 text-sm">{item.date}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-semibold mb-0.5">Primary Color</div>
                <div className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-white inline-block"></span>
                  <span>{item.color || 'Not specified'}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-semibold mb-0.5">Category</div>
                <div className="font-bold text-slate-900 text-sm">{item.category}</div>
              </div>
            </div>

            {/* Found Item Custody & Handover Desk Information */}
            {item.type === 'FOUND' && (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-950 font-bold text-xs uppercase tracking-wide">
                  <Building className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Current Physical Custody &amp; Handover Location</span>
                </div>
                <div className="text-sm font-bold text-emerald-950">
                  {item.currentStorageLocation || 'College Main Office / Admin Block'}
                </div>
                <p className="text-xs text-emerald-800/90 leading-relaxed">
                  The item is securely deposited here. To claim it, click below to submit ownership proof (serial number, distinctive marks, lock screen, or secret contents).
                </p>
              </div>
            )}

            {/* Identifying Proof Note / Private details banner */}
            {item.additionalInfo && (
              <div className="text-xs text-slate-700 bg-amber-50/80 border border-amber-200 p-3 rounded-xl flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-900 font-bold">Ownership Proof Clue: </strong>
                  <span>{item.additionalInfo}</span>
                </div>
              </div>
            )}

            {/* Posted By Information Row */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                  {item.userName.charAt(0).toUpperCase()}
                </div>
                <span>
                  Reported by: <strong className="text-slate-800">{item.userName}</strong>
                </span>
              </div>
              <div className="flex items-center space-x-1 text-[11px] text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Contact via safe in-app message</span>
              </div>
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            {/* Staff / Faculty Verification Action Banner */}
            {(currentUser.role === 'staff' || currentUser.role === 'admin') && item.verificationStatus === 'PENDING' && (
              <div className="bg-blue-50 border border-blue-300 rounded-2xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-blue-900">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Faculty &amp; Staff Moderation Action</span>
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  This report is currently pending campus verification. As a verified faculty/staff member ({currentUser.name}), you can verify and publish this item listing to the campus feed.
                </p>
                <button
                  onClick={() => verifyItem(item.id, currentUser.name)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Verify and Authorize Listing</span>
                </button>
              </div>
            )}

            {isOwnItem ? (
              <div className="space-y-3">
                {/* Notice if claims are pending review */}
                {pendingClaimsOnThisItem.length > 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-amber-900">
                      <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{pendingClaimsOnThisItem.length} Ownership Claim Received!</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>{pendingClaimsOnThisItem[0].claimantName}</strong> submitted proof claiming this item. Please review their College ID and evidence before authorizing handover.
                    </p>
                    <button
                      onClick={() => openReviewClaimModal(pendingClaimsOnThisItem[0])}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Review Proof &amp; Handover Checklist</span>
                    </button>
                  </div>
                )}

                {/* Notice if a claim was approved */}
                {approvedClaimOnThisItem && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs font-bold text-emerald-950">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Handover Authorized: {approvedClaimOnThisItem.claimantName}</span>
                      </div>
                      <button
                        onClick={() => openReviewClaimModal(approvedClaimOnThisItem)}
                        className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-[11px] font-bold shadow-xs"
                      >
                        View Receipt
                      </button>
                    </div>
                    <p className="text-xs text-emerald-800">
                      Collection point: {approvedClaimOnThisItem.handoverLocation || item.currentStorageLocation || 'Main Office'}.
                    </p>
                  </div>
                )}

                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="text-xs font-semibold text-slate-600 text-center flex items-center justify-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>You are the author of this listing</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      id="edit-post-details-btn"
                      onClick={() => openEditModal(item)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-800 font-bold text-xs transition-colors shadow-xs"
                    >
                      Edit Listing
                    </button>
                    {item.status !== 'RECOVERED' && (
                      <button
                        id="mark-recovered-btn"
                        onClick={() => handleMarkRecovered(item.id)}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                      >
                        ✓ Mark Recovered
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* If viewer has already submitted a claim on this item */}
                {myClaimOnThisItem ? (
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    myClaimOnThisItem.status === 'APPROVED'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : myClaimOnThisItem.status === 'REJECTED'
                      ? 'bg-red-50 border-red-200 text-red-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                        {myClaimOnThisItem.status === 'APPROVED' ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-800">Your Claim is Approved!</span>
                          </>
                        ) : myClaimOnThisItem.status === 'REJECTED' ? (
                          <>
                            <X className="w-4 h-4 text-red-600" />
                            <span className="text-red-800">Claim Rejected</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span className="text-amber-800">Claim Pending Review</span>
                          </>
                        )}
                      </div>

                      {myClaimOnThisItem.status === 'APPROVED' && (
                        <button
                          onClick={() => openReviewClaimModal(myClaimOnThisItem)}
                          className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold shadow-xs"
                        >
                          View Handover Slip
                        </button>
                      )}
                    </div>

                    <p className="text-xs leading-relaxed">
                      {myClaimOnThisItem.status === 'APPROVED' ? (
                        <>
                          Your proof was verified by {item.userName}! Collect from{' '}
                          <strong>{myClaimOnThisItem.handoverLocation || item.currentStorageLocation || 'Campus Desk'}</strong>{' '}
                          with your Student ID.
                        </>
                      ) : myClaimOnThisItem.status === 'REJECTED' ? (
                        <>
                          Finder note: {myClaimOnThisItem.resolutionNotes || 'Proof did not match item physical details.'}
                        </>
                      ) : (
                        <>
                          Your claim proof is under review by {item.userName}. You will see pickup instructions once approved.
                        </>
                      )}
                    </p>

                    {myClaimOnThisItem.status === 'REJECTED' && item.status !== 'RECOVERED' && (
                      <button
                        onClick={() => openClaimModal(item)}
                        className="mt-1 w-full py-2 bg-white border border-red-300 hover:bg-red-50 text-red-700 text-xs font-bold rounded-xl transition-colors"
                      >
                        Submit Revised Claim Proof
                      </button>
                    )}
                  </div>
                ) : (
                  /* Found Items: Show Claim This Item button if not claimed */
                  item.type === 'FOUND' && item.status !== 'RECOVERED' && (
                    <button
                      id="claim-this-item-btn"
                      onClick={() => openClaimModal(item)}
                      className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-2"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      <span>Claim This Item (Submit Ownership Proof)</span>
                    </button>
                  )
                )}

                {item.status === 'RECOVERED' && !myClaimOnThisItem && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-center text-xs text-emerald-800 font-medium">
                    ✓ This item has been verified and returned to its rightful owner.
                  </div>
                )}

                {/* Safe In-App Contact Button */}
                <button
                  id="contact-owner-btn"
                  onClick={() => openContactModal(item)}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 ${
                    item.type === 'FOUND'
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>
                    {item.type === 'LOST' ? 'Send Safe Message to Owner' : 'Message Finder Directly'}
                  </span>
                </button>

                <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400 pt-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Personal phone numbers are kept private. Handled securely via campus messaging.</span>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Safety Instructions Banner */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-amber-950 uppercase tracking-wider">
              Campus Handover &amp; Verification Protocol
            </h4>
            <ul className="text-xs text-amber-900/90 list-disc list-inside mt-1 space-y-0.5">
              <li><strong>Never pay money or ransom</strong> to recover or claim a lost campus item.</li>
              <li>Always perform physical handovers in designated public campus zones (e.g. Central Library Front Desk, College Canteen, Main Security Gate).</li>
              <li>Always check the claimant's official College Student ID Card before handing over property.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Algorithmic Match Cross-Reference Section */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>{item.type === 'LOST' ? 'Possible Matches Found' : 'Cross-Referenced Lost Reports'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                  {highConfidenceMatches.length} Alert{highConfidenceMatches.length === 1 ? '' : 's'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Rule-Based Automated Matching Algorithm: Category (30) + Location (25) + Date (20) + Color (15) + Keywords (10)
              </p>
            </div>
          </div>

          {/* Filter Toggle: Show High Confidence (>=60%) vs All */}
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={() => setFilterHighConfidenceOnly(!filterHighConfidenceOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-1.5 ${
                filterHighConfidenceOnly
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>{filterHighConfidenceOnly ? 'Showing Possible Matches (≥60%)' : 'Showing All Candidates'}</span>
            </button>
          </div>
        </div>

        {displayedMatches.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No matching items currently meet the threshold</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              As soon as a matching item with compatible category, location, date proximity, or keywords is reported, it will appear here automatically.
            </p>
            {filterHighConfidenceOnly && matchCandidates.length > 0 && (
              <button
                onClick={() => setFilterHighConfidenceOnly(false)}
                className="mt-2 text-xs font-bold text-blue-600 hover:underline"
              >
                View all {matchCandidates.length} lower scoring candidates
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedMatches.map((candidate, idx) => {
              const matched = candidate.matchedItem;
              return (
                <div 
                  key={idx}
                  className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                    candidate.isPossibleMatch 
                      ? 'border-emerald-300 ring-2 ring-emerald-500/10' 
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
                    
                    {/* Item quick preview */}
                    <div className="flex items-center space-x-3.5">
                      <img
                        src={matched.image}
                        alt={matched.itemName}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            matched.type === 'LOST' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {matched.type}
                          </span>
                          <h3 className="font-bold text-base text-slate-900">
                            {matched.itemName}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {matched.description}
                        </p>
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span>📍 {matched.location}</span>
                          <span>📅 {matched.date}</span>
                          <span>👤 By {matched.userName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons on matched card */}
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                      <button
                        onClick={() => selectItem(matched.id)}
                        className="flex-1 lg:flex-none px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1"
                      >
                        <span>Inspect Listing</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      {/* If the matched candidate is a FOUND item, allow claiming */}
                      {matched.type === 'FOUND' && matched.status !== 'RECOVERED' && (
                        <button
                          onClick={() => openClaimModal(matched)}
                          className="flex-1 lg:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Request Claim</span>
                        </button>
                      )}

                      <button
                        onClick={() => openContactModal(matched)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message</span>
                      </button>
                    </div>

                  </div>

                  {/* Interactive Score breakdown component */}
                  <MatchingScoreBadge 
                    matchDetails={candidate} 
                    showBreakdownInitial={candidate.isPossibleMatch} 
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Image Lightbox Modal */}
      {showImageLightbox && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setShowImageLightbox(false)}
        >
          <div 
            className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 bg-slate-900/90 text-white border-b border-slate-800">
              <div className="font-bold text-sm truncate">{item.itemName}</div>
              <button
                onClick={() => setShowImageLightbox(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/40">
              <img
                src={item.image}
                alt={item.itemName}
                className="max-h-[75vh] w-auto object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Flag / Moderation Modal */}
      {showFlagModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowFlagModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Report Listing to Admin</h3>
              </div>
              <button
                onClick={() => setShowFlagModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Campus moderators inspect reported listings for spam, offensive photos, duplicates, or false ownership claims.
            </p>

            {flagSuccess ? (
              <div className="text-emerald-800 bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Report successfully submitted for campus moderation review.</span>
              </div>
            ) : (
              <form onSubmit={handleFlag} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reason for report:
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={flagReason}
                    onChange={e => setFlagReason(e.target.value)}
                    placeholder="Describe why this listing is suspicious, duplicate, or inappropriate..."
                    className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFlagModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
