import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  AlertTriangle, 
  User, 
  FileText, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  Printer, 
  ThumbsUp, 
  ThumbsDown, 
  Lock, 
  Building, 
  Clock,
  ExternalLink,
  Info
} from 'lucide-react';
import { Claim } from '../types';

interface ClaimReviewModalProps {
  claim: Claim | null;
  onClose: () => void;
}

export const ClaimReviewModal: React.FC<ClaimReviewModalProps> = ({ claim, onClose }) => {
  const { items, allUsers, currentUser, approveClaim, rejectClaim, sendMessage, selectItem } = useApp();
  
  const [handoverNotes, setHandoverNotes] = useState('');
  const [handoverLocation, setHandoverLocation] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Checkbox steps for physical verification in college viva
  const [idVerified, setIdVerified] = useState(false);
  const [proofVerified, setProofVerified] = useState(false);
  const [custodyVerified, setCustodyVerified] = useState(false);

  if (!claim) return null;

  const targetItem = items.find(i => i.id === claim.itemId);
  const claimantUser = allUsers.find(u => u.id === claim.claimantId);
  const isAuthorizedReviewer = currentUser.role === 'admin' || currentUser.id === claim.ownerId;

  // Initialize handover location with item's current storage if empty
  const defaultLocation = targetItem?.currentStorageLocation || 'Campus Security Cabin (Main Gate)';

  const handleApprove = () => {
    approveClaim(
      claim.id, 
      handoverNotes.trim() || 'Physical proof and College Student ID verified by listing owner.',
      handoverLocation.trim() || defaultLocation
    );
    setIsProcessed(true);
    setToastMessage('🎉 Handover authorized! The item has been marked as Recovered.');
    setTimeout(() => {
      onClose();
    }, 2200);
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Please enter a brief reason for rejecting the claim so the student understands.');
      return;
    }
    rejectClaim(claim.id, rejectionReason.trim());
    setIsProcessed(true);
    setToastMessage('Claim rejected and student notified.');
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const handleOpenChat = () => {
    sendMessage(
      claim.claimantId,
      claim.itemId,
      `Hello ${claim.claimantName}, regarding your claim on "${claim.itemName}": I am reviewing your proof details. Could you clarify...`
    );
    onClose();
    alert(`Started message thread with ${claim.claimantName}. Check your My Dashboard > Messages tab.`);
  };

  const handlePrintHandoverSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative my-8 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  Ownership Verification &amp; Handover
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  claim.status === 'PENDING'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : claim.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {claim.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Claim ID: <span className="font-mono text-slate-700">{claim.id}</span> • Submitted: {new Date(claim.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <button
            id="close-claim-review-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Processed Success Toast */}
        {toastMessage && (
          <div className="my-4 bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="space-y-5 pt-4">

          {/* Section A: Target Item Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              {targetItem?.image ? (
                <img
                  src={targetItem.image}
                  alt={claim.itemName}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 font-bold">
                  IMG
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                    claim.itemType === 'LOST' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {claim.itemType}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {targetItem?.category} • Found at: {targetItem?.location}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 truncate">
                  {claim.itemName}
                </h4>
                {targetItem?.currentStorageLocation && (
                  <p className="text-[11px] text-emerald-700 font-medium truncate flex items-center space-x-1 mt-0.5">
                    <Building className="w-3 h-3 text-emerald-600" />
                    <span>Held at: {targetItem.currentStorageLocation}</span>
                  </p>
                )}
              </div>
            </div>

            {targetItem && (
              <button
                onClick={() => {
                  selectItem(targetItem.id);
                  onClose();
                }}
                className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 rounded-xl flex items-center space-x-1 shrink-0"
              >
                <span>View Full Listing</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Section B: Side-by-side Proof Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            
            {/* Left: Private item clue known to finder */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
              <div className="text-[11px] font-bold text-amber-900 uppercase flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                <span>Private Listing Hint / Secret Clue:</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed italic bg-white/70 p-2.5 rounded-xl border border-amber-100">
                {targetItem?.additionalInfo || 'No secret markings were noted when listing was created.'}
              </p>
              <p className="text-[10px] text-amber-700">
                Compare this with the claimant's explanation below.
              </p>
            </div>

            {/* Right: Claimant Identity & Student Credentials */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Claimant Information (Student):</span>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <strong className="text-slate-900">{claim.claimantName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">College ID:</span>
                  <strong className="text-slate-900 font-mono">
                    {claim.claimantStudentId || claimantUser?.studentId || 'TYCS-042'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="text-slate-700">
                    {claim.claimantDepartment || claimantUser?.department || 'BSc Computer Science'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-700 truncate max-w-[150px]">
                    {claim.claimantEmail || claimantUser?.email}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Section C: Claimant's Submitted Proof Message */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Claimant's Submitted Proof of Ownership:</span>
              </span>
              <span className="text-[11px] text-blue-600 font-medium">Submitted by {claim.claimantName}</span>
            </div>
            <div className="text-xs text-slate-800 bg-white p-3.5 rounded-xl border border-blue-100 font-normal leading-relaxed">
              "{claim.message}"
            </div>
          </div>

          {/* Section D: Physical Verification Checklist (For College Viva Examination) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Campus Physical Handover Protocol (Viva Checklist)</span>
              </h5>
              <span className="text-[11px] text-slate-400">Standard Operating Procedure</span>
            </div>

            <div className="space-y-2 text-xs text-slate-700 pt-1">
              <label className="flex items-start space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={idVerified}
                  onChange={e => setIdVerified(e.target.checked)}
                  disabled={claim.status === 'APPROVED'}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span>
                  <strong>Step 1 (Identity Check):</strong> Verify student's physical College Identity Card matches <strong>{claim.claimantName}</strong> ({claim.claimantStudentId || claimantUser?.studentId || 'Student ID'}).
                </span>
              </label>

              <label className="flex items-start space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={proofVerified}
                  onChange={e => setProofVerified(e.target.checked)}
                  disabled={claim.status === 'APPROVED'}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span>
                  <strong>Step 2 (Item Check):</strong> Confirm unique marks, lockscreen passcode, or internal contents match the submitted proof.
                </span>
              </label>

              <label className="flex items-start space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={custodyVerified}
                  onChange={e => setCustodyVerified(e.target.checked)}
                  disabled={claim.status === 'APPROVED'}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span>
                  <strong>Step 3 (Handover Desk):</strong> Physical exchange conducted at designated campus desk (no fee/ransom required).
                </span>
              </label>
            </div>
          </div>

          {/* Section E: Already Approved Notice or Action Controls */}
          {claim.status === 'APPROVED' ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Handover Verified and Approved on {claim.resolvedAt || 'Recent Date'}</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                <strong>Verification Notes:</strong> {claim.resolutionNotes || 'Identity verified and custody handed over to student.'}
              </p>
              {claim.handoverLocation && (
                <p className="text-xs text-emerald-800">
                  <strong>Handover Location:</strong> {claim.handoverLocation}
                </p>
              )}
              <div className="pt-1 flex items-center justify-end">
                <button
                  onClick={handlePrintHandoverSlip}
                  className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold text-xs flex items-center space-x-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Handover Receipt (Slip)</span>
                </button>
              </div>
            </div>
          ) : claim.status === 'REJECTED' ? (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Claim Rejected</span>
              </div>
              <p>
                <strong>Reason:</strong> {claim.resolutionNotes || 'Submitted proof did not match physical item inspection.'}
              </p>
            </div>
          ) : showRejectForm ? (
            /* Rejection Input Form */
            <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-red-900">
                  Provide Rejection Reason to Claimant
                </h5>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
              <textarea
                rows={2}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="E.g. Discrepancy in device color/model, or proof details did not match internal contents."
                className="w-full p-2.5 text-xs bg-white rounded-xl border border-red-300 text-slate-800 focus:ring-2 focus:ring-red-500"
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          ) : (
            /* Active Pending Review Controls */
            <div className="space-y-4 pt-2 border-t border-slate-100">
              
              {/* Optional verification notes & location overrides */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Handover Location / Collection Desk:
                  </label>
                  <input
                    type="text"
                    value={handoverLocation}
                    onChange={e => setHandoverLocation(e.target.value)}
                    placeholder={defaultLocation}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Auditor / Handover Notes (Optional):
                  </label>
                  <input
                    type="text"
                    value={handoverNotes}
                    onChange={e => setHandoverNotes(e.target.value)}
                    placeholder="e.g., Verified College ID & serial number"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleOpenChat}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center space-x-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Message Claimant</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    className="px-3.5 py-2.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs transition-colors flex items-center space-x-1.5"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    <span>Reject Claim</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    id="approve-handover-btn"
                    onClick={handleApprove}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-1.5"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Approve Claim &amp; Authorize Handover</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
