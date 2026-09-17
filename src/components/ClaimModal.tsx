import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, X, AlertCircle, CheckCircle2, Lock, FileText, Send } from 'lucide-react';

export const ClaimModal: React.FC = () => {
  const { activeClaimItem, closeClaimModal, submitClaim, currentUser, openAuthModal } = useApp();
  const [proofMessage, setProofMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!activeClaimItem) return null;

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div 
          className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Sign In Required to File Claim</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              To safeguard found valuables and prevent unauthorized claims on campus, please sign in with your student ID or staff account.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                closeClaimModal();
                openAuthModal('student-login');
              }}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
            >
              Sign In
            </button>
            <button
              onClick={closeClaimModal}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (proofMessage.trim().length < 15) {
      setError('Please provide at least 15 characters explaining your proof of ownership (e.g., unique marks, identifiers, passwords, or contents).');
      return;
    }

    const success = await submitClaim(activeClaimItem.id, proofMessage);
    if (success) {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setProofMessage('');
        closeClaimModal();
      }, 2000);
    } else {
      setError('Failed to submit claim. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                Request Item Claim
              </h3>
              <p className="text-xs text-slate-500">
                Submit ownership proof to {activeClaimItem.userName}
              </p>
            </div>
          </div>

          <button
            id="close-claim-modal-btn"
            onClick={closeClaimModal}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Claim Submitted Successfully!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your proof of ownership has been sent to <strong>{activeClaimItem.userName}</strong>. You can track this claim and view responses in your Dashboard.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            
            {/* Target Item summary banner */}
            <div className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <img
                src={activeClaimItem.image}
                alt={activeClaimItem.itemName}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                    activeClaimItem.type === 'LOST' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {activeClaimItem.type}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 truncate">
                    {activeClaimItem.category} • {activeClaimItem.location}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 truncate">
                  {activeClaimItem.itemName}
                </h4>
              </div>
            </div>

            {/* Proof Question */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Why do you believe this item belongs to you? *</span>
                <span className="text-[11px] text-slate-400 font-normal">Min 15 characters</span>
              </label>
              <textarea
                id="claim-proof-input"
                rows={4}
                value={proofMessage}
                onChange={e => {
                  setProofMessage(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Describe details only the true owner would know. E.g.:
• Scratch, sticker, or cosmetic marks
• Internal contents (cards, cash notes, files, wallpaper)
• Device serial hint, color nuances, or lock screen details"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 placeholder:text-slate-400 leading-relaxed resize-none"
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Privacy note */}
            <div className="flex items-start space-x-2 text-[11px] text-slate-500 bg-blue-50/70 p-3 rounded-xl border border-blue-100">
              <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                FindIt protects user privacy. Your claim and contact information are shared securely with the poster. Once they verify your proof, the item will be formally marked as <strong>Recovered</strong>.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={closeClaimModal}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-claim-btn"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Ownership Claim</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
