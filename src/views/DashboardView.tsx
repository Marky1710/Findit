import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { findMatches } from '../utils/matchingAlgorithm';
import { MatchingScoreBadge } from '../components/MatchingScoreBadge';
import { UserAvatar } from '../components/UserAvatar';
import { 
  User, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  Sparkles, 
  MessageSquare, 
  Plus, 
  ExternalLink, 
  Calendar, 
  MapPin, 
  Layers,
  Send,
  Bell,
  Mail,
  CheckCheck,
  ShieldCheck,
  ShieldAlert,
  FileCheck2,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Building,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { 
    currentUser, 
    items, 
    messages, 
    claims,
    approveClaim,
    rejectClaim,
    openReviewClaimModal,
    deleteItem, 
    markAsRecovered, 
    selectItem, 
    openEditModal, 
    openClaimModal,
    openContactModal,
    setCurrentPage, 
    sendMessage,
    markMessageRead,
    openAuthModal 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'lost' | 'found' | 'claims' | 'matches' | 'messages'>('lost');
  const [replyText, setReplyText] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [successCelebration, setSuccessCelebration] = useState<string | null>(null);

  // Authentication Guard: Prompts user to log in if accessing dashboard unauthenticated
  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">
              Sign In to Access Your Dashboard
            </h2>
            <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
              Track your reported lost &amp; found belongings, review incoming claims, and check private in-app messages.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => openAuthModal('student-login')}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all"
            >
              Sign In as Student
            </button>
            <button
              onClick={() => openAuthModal('student-register')}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
            >
              Register New Student ID
            </button>
            <button
              onClick={() => openAuthModal('staff-login')}
              className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Staff Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active items excluding soft-deleted reports
  const activeItems = useMemo(() => items.filter(i => !i.deleted), [items]);

  // User specific items (must exclude soft-deleted reports)
  const myItems = activeItems.filter(item => item.userId === currentUser.id);
  const myLostItems = myItems.filter(i => i.type === 'LOST');
  const myFoundItems = myItems.filter(i => i.type === 'FOUND');
  
  const myLostActiveCount = myLostItems.filter(i => i.status !== 'RECOVERED').length;
  const myFoundActiveCount = myFoundItems.filter(i => i.status !== 'RECOVERED').length;
  const myRecoveredCount = myItems.filter(i => i.status === 'RECOVERED').length;

  // Claims
  const claimsReceived = claims.filter(c => c.ownerId === currentUser.id);
  const claimsSubmitted = claims.filter(c => c.claimantId === currentUser.id);
  const pendingIncomingClaims = claimsReceived.filter(c => c.status === 'PENDING').length;

  // User messages
  const myMessages = messages.filter(
    m => m.receiverId === currentUser.id || m.senderId === currentUser.id
  );
  const unreadMessagesCount = myMessages.filter(m => m.receiverId === currentUser.id && !m.read).length;

  // User algorithmic matches (must ignore deleted reports)
  const myMatchAlerts = myItems
    .map(myItem => ({
      item: myItem,
      matches: findMatches(myItem, activeItems).filter(m => m.isPossibleMatch)
    }))
    .filter(pair => pair.matches.length > 0);

  const handleMarkRecoveredWithToast = (id: string, name: string) => {
    markAsRecovered(id);
    setSuccessCelebration(`🎉 Success! "${name}" marked as Recovered and closed!`);
    setTimeout(() => setSuccessCelebration(null), 3500);
  };

  const handleApproveClaim = async (claimId: string, itemName: string, claimantName: string) => {
    const success = await approveClaim(claimId);
    if (success) {
      setSuccessCelebration(`✓ Claim Approved! Handover verified for ${claimantName} on "${itemName}".`);
      setTimeout(() => setSuccessCelebration(null), 4000);
    } else {
      alert('Failed to approve claim. Please try again.');
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    const success = await rejectClaim(claimId);
    if (success) {
      setSuccessCelebration(`Claim marked as rejected.`);
      setTimeout(() => setSuccessCelebration(null), 3000);
    } else {
      alert('Failed to reject claim. Please try again.');
    }
  };

  const handleReplySubmit = (e: React.FormEvent, parentMsg: typeof messages[0]) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const targetReceiverId = parentMsg.senderId === currentUser.id 
      ? parentMsg.receiverId 
      : parentMsg.senderId;

    sendMessage(targetReceiverId, parentMsg.itemId, replyText.trim());
    setReplyText('');
    setSelectedMessageId(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <UserAvatar
            name={currentUser.name}
            role={currentUser.role}
            size="xl"
            className="w-16 h-16 rounded-2xl border-2 border-white/20 shadow-md text-xl"
          />
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-1 border border-blue-400/20">
              <span>
                {currentUser.role === 'admin' 
                  ? 'Campus Admin' 
                  : currentUser.role === 'staff'
                    ? 'Faculty / Staff Member'
                    : `Student ID: ${currentUser.studentId || 'TYCS-042'}`}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {currentUser.name.split(' ')[0]} 👋
            </h1>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              {currentUser.role === 'student' ? (
                <span>
                  {currentUser.course || 'B.Sc. Computer Science'} • {currentUser.department} (Year {currentUser.year || 'TY'}, Div {currentUser.division || 'A'})
                </span>
              ) : (
                <span>
                  {currentUser.department} • {currentUser.email}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <button
            onClick={() => setCurrentPage('report-lost')}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all"
          >
            + Report Lost Item
          </button>
          <button
            onClick={() => setCurrentPage('report-found')}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
          >
            + Report Found Item
          </button>
        </div>
      </div>

      {/* Student Academic Credential Profile Card (Section 11) */}
      {currentUser.role === 'student' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Student Profile &amp; Academic Credentials
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Ismail Yusuf College Enrolled Student
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Full Name</span>
              <span className="font-bold text-slate-900 truncate block mt-0.5">{currentUser.name}</span>
            </div>

            <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
              <span className="block text-[10px] uppercase font-bold text-blue-600 tracking-wider">Student ID</span>
              <span className="font-mono font-bold text-blue-900 block mt-0.5">{currentUser.studentId || 'TYCS-042'}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Course</span>
              <span className="font-semibold text-slate-800 truncate block mt-0.5">{currentUser.course || 'B.Sc. Computer Science'}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Department</span>
              <span className="font-semibold text-slate-800 truncate block mt-0.5">{currentUser.department || 'Computer Science'}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Year &amp; Div</span>
              <span className="font-bold text-slate-900 block mt-0.5">{currentUser.year || 'TY'} - Div {currentUser.division || 'A'}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Contact Info</span>
              <span className="font-medium text-slate-600 block mt-0.5">{currentUser.phone || 'Optional (In-App Only)'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast / Notification */}
      {successCelebration && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2">
          <span>{successCelebration}</span>
          <button onClick={() => setSuccessCelebration(null)} className="text-emerald-900 font-bold px-2">
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Lost items card */}
        <div 
          onClick={() => setActiveTab('lost')}
          className="bg-white rounded-2xl border border-red-200 p-5 shadow-xs flex items-center space-x-4 cursor-pointer hover:border-red-400 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-black text-xl font-mono">
            {myLostActiveCount}
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">{myLostActiveCount}</div>
            <div className="text-xs font-semibold text-slate-500">Active Lost Items</div>
          </div>
        </div>

        {/* Found items card */}
        <div 
          onClick={() => setActiveTab('found')}
          className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs flex items-center space-x-4 cursor-pointer hover:border-emerald-400 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xl font-mono">
            {myFoundActiveCount}
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">{myFoundActiveCount}</div>
            <div className="text-xs font-semibold text-slate-500">Active Found Items</div>
          </div>
        </div>

        {/* Pending Claims card */}
        <div 
          onClick={() => setActiveTab('claims')}
          className="bg-white rounded-2xl border border-blue-200 p-5 shadow-xs flex items-center space-x-4 cursor-pointer hover:border-blue-400 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xl font-mono">
            {pendingIncomingClaims}
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">{pendingIncomingClaims}</div>
            <div className="text-xs font-semibold text-slate-500">Claims to Review</div>
          </div>
        </div>

        {/* Match alerts card */}
        <div 
          onClick={() => setActiveTab('matches')}
          className="bg-white rounded-2xl border border-amber-200 p-5 shadow-xs flex items-center space-x-4 cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black text-xl font-mono">
            {myMatchAlerts.length}
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">{myMatchAlerts.length}</div>
            <div className="text-xs font-semibold text-slate-500">Smart Matches (≥60%)</div>
          </div>
        </div>

      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-2">
        
        <button
          onClick={() => setActiveTab('lost')}
          className={`pb-3 text-sm font-bold transition-all relative flex items-center space-x-2 ${
            activeTab === 'lost'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>My Lost Items</span>
          <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">
            {myLostItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('found')}
          className={`pb-3 text-sm font-bold transition-all relative flex items-center space-x-2 ${
            activeTab === 'found'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>My Found Items</span>
          <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">
            {myFoundItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('claims')}
          className={`pb-3 text-sm font-bold transition-all relative flex items-center space-x-2 ${
            activeTab === 'claims'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-blue-600" />
          <span>My Claims</span>
          {(pendingIncomingClaims > 0 || claimsSubmitted.length > 0) && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              pendingIncomingClaims > 0 ? 'bg-red-600 text-white' : 'bg-blue-100 text-blue-700'
            }`}>
              {pendingIncomingClaims > 0 ? `${pendingIncomingClaims} pending` : claimsReceived.length + claimsSubmitted.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-3 text-sm font-bold transition-all relative flex items-center space-x-1.5 ${
            activeTab === 'matches'
              ? 'text-amber-700 border-b-2 border-amber-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Candidate Matches ({myMatchAlerts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`pb-3 text-sm font-bold transition-all relative flex items-center space-x-1.5 ${
            activeTab === 'messages'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
          <span>In-App Messages</span>
          {unreadMessagesCount > 0 && (
            <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {unreadMessagesCount}
            </span>
          )}
        </button>

      </div>

      {/* TAB 1: My Lost Items */}
      {activeTab === 'lost' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Your Reported Lost Items ({myLostItems.length})
            </h2>
            <button
              onClick={() => setCurrentPage('report-lost')}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              + Report Lost Item
            </button>
          </div>

          {myLostItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-base text-slate-700">No lost items reported yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                If you misplaced something on campus, report it here so the automated algorithm can pair it with found items.
              </p>
              <button
                onClick={() => setCurrentPage('report-lost')}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl"
              >
                + Report Lost Item
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Item</th>
                      <th className="py-3.5 px-4">Location Lost</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myLostItems.map(item => {
                      const candidateCount = findMatches(item, items).filter(m => m.isPossibleMatch).length;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center space-x-3">
                            <img
                              src={item.image}
                              alt={item.itemName}
                              className="w-11 h-11 rounded-lg object-cover border shrink-0"
                            />
                            <div>
                              <button
                                onClick={() => selectItem(item.id)}
                                className="font-bold text-slate-900 hover:text-blue-600 text-left line-clamp-1"
                              >
                                {item.itemName}
                              </button>
                              <span className="text-[11px] text-slate-400 font-normal">
                                {item.category} • Color: {item.color}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            {item.location}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 font-mono">
                            {item.date}
                          </td>

                          <td className="py-3.5 px-4">
                            {item.status === 'RECOVERED' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                RECOVERED ✓
                              </span>
                            ) : item.status === 'PENDING_CLAIM' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                PENDING CLAIM
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                ACTIVE LOST
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {/* View Matches Button */}
                            <button
                              onClick={() => selectItem(item.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 font-bold text-[11px] border border-amber-200 transition-colors inline-flex items-center space-x-1"
                              title="Check candidate matches"
                            >
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>View Matches ({candidateCount})</span>
                            </button>

                            {/* Mark Recovered Action */}
                            {item.status !== 'RECOVERED' && (
                              <button
                                onClick={() => handleMarkRecoveredWithToast(item.id, item.itemName)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-[11px] border border-emerald-200 transition-colors"
                              >
                                Mark Recovered
                              </button>
                            )}

                            {/* Edit Action */}
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                              title="Edit listing details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Delete Action */}
                            <button
                              onClick={() => {
                                if (confirm(`Delete your lost report for "${item.itemName}"?`)) {
                                  deleteItem(item.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete listing"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* TAB 2: My Found Items */}
      {activeTab === 'found' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Your Reported Found Items ({myFoundItems.length})
            </h2>
            <button
              onClick={() => setCurrentPage('report-found')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              + Report Found Item
            </button>
          </div>

          {myFoundItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-base text-slate-700">No found items reported yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Found keys, cards, or a gadget on campus? Report it so the rightful owner can submit a claim.
              </p>
              <button
                onClick={() => setCurrentPage('report-found')}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
              >
                + Report Found Item
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Item</th>
                      <th className="py-3.5 px-4">Location Found</th>
                      <th className="py-3.5 px-4">Handover / Storage Custody</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myFoundItems.map(item => {
                      const candidateCount = findMatches(item, items).filter(m => m.isPossibleMatch).length;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center space-x-3">
                            <img
                              src={item.image}
                              alt={item.itemName}
                              className="w-11 h-11 rounded-lg object-cover border shrink-0"
                            />
                            <div>
                              <button
                                onClick={() => selectItem(item.id)}
                                className="font-bold text-slate-900 hover:text-blue-600 text-left line-clamp-1"
                              >
                                {item.itemName}
                              </button>
                              <span className="text-[11px] text-slate-400 font-normal">
                                {item.category} • Date: {item.date}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            {item.location}
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 font-medium">
                            <span className="line-clamp-1">{item.currentStorageLocation || 'Main Office'}</span>
                          </td>

                          <td className="py-3.5 px-4">
                            {item.status === 'RECOVERED' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                RECOVERED ✓
                              </span>
                            ) : item.status === 'PENDING_CLAIM' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                PENDING CLAIM
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                ACTIVE FOUND
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => selectItem(item.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 font-bold text-[11px] border border-amber-200 transition-colors inline-flex items-center space-x-1"
                            >
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>View Matches ({candidateCount})</span>
                            </button>

                            {item.status !== 'RECOVERED' && (
                              <button
                                onClick={() => handleMarkRecoveredWithToast(item.id, item.itemName)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-[11px] border border-emerald-200 transition-colors"
                              >
                                Mark Recovered
                              </button>
                            )}

                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                              title="Edit listing details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`Delete your found listing for "${item.itemName}"?`)) {
                                  deleteItem(item.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete listing"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* TAB 3: My Claims & Handover Verification */}
      {activeTab === 'claims' && (
        <div className="space-y-8">
          
          {/* Section 1: Claims Received on items posted by this user */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>Claims Received on Your Found Listings ({claimsReceived.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Students have submitted ownership proof for items you reported. Review their evidence before authorizing pickup.
                </p>
              </div>
            </div>

            {claimsReceived.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                No claims have been submitted on your found listings yet.
              </div>
            ) : (
              <div className="space-y-3">
                {claimsReceived.map(claim => {
                  const targetItem = items.find(i => i.id === claim.itemId);
                  return (
                    <div
                      key={claim.id}
                      className={`bg-white rounded-2xl border p-5 shadow-xs space-y-4 transition-all ${
                        claim.status === 'PENDING' ? 'border-blue-300 ring-2 ring-blue-500/10' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center space-x-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            claim.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : claim.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {claim.status}
                          </span>
                          <div>
                            <span className="text-xs text-slate-500">Claimant:</span>{' '}
                            <strong className="text-xs text-slate-900">{claim.claimantName}</strong>
                            {claim.claimantEmail && (
                              <span className="text-xs text-slate-400 ml-1">({claim.claimantEmail})</span>
                            )}
                          </div>
                        </div>

                        <span className="text-[11px] text-slate-400">
                          Submitted: {new Date(claim.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Item + Proof Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        <div className="sm:col-span-4 flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {targetItem?.image && (
                            <img
                              src={targetItem.image}
                              alt={claim.itemName}
                              className="w-12 h-12 rounded-lg object-cover border shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-slate-900 truncate">
                              {claim.itemName}
                            </h5>
                            <p className="text-[11px] text-slate-500 truncate">
                              📍 {targetItem?.location || 'Campus'}
                            </p>
                          </div>
                        </div>

                        <div className="sm:col-span-8 bg-blue-50/50 border border-blue-100 p-3.5 rounded-xl space-y-1">
                          <div className="text-[11px] font-bold text-blue-900 uppercase">
                            Submitted Ownership Proof / Explanation:
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed italic">
                            "{claim.message}"
                          </p>
                        </div>
                      </div>

                      {/* Handover Location info if approved */}
                      {claim.status === 'APPROVED' && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1.5 font-medium">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center space-x-1.5 font-bold text-emerald-950">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Handover Authorized! Verified on {claim.resolvedAt || 'Recent'}</span>
                            </span>
                            <button
                              onClick={() => openReviewClaimModal(claim)}
                              className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-[11px] font-bold shadow-xs"
                            >
                              View Handover Receipt
                            </button>
                          </div>
                          <p className="text-emerald-800 text-[11px]">
                            {claim.resolutionNotes || 'Physical proof and College Student ID verified by listing owner.'}
                          </p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => openReviewClaimModal(claim)}
                          className="px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center space-x-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Review Proof &amp; Handover Checklist</span>
                        </button>

                        {claim.status === 'PENDING' && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleRejectClaim(claim.id)}
                              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center space-x-1"
                            >
                              <ThumbsDown className="w-3.5 h-3.5 text-slate-400" />
                              <span>Reject</span>
                            </button>
                            <button
                              onClick={() => handleApproveClaim(claim.id, claim.itemName, claim.claimantName)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center space-x-1"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span>Quick Approve</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Claims I Have Submitted */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <FileCheck2 className="w-5 h-5 text-indigo-600" />
              <span>Claims You Have Submitted ({claimsSubmitted.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Track the verification status of claims you submitted for found campus items.
            </p>

            {claimsSubmitted.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                You have not submitted any ownership claims. When you see a found item that belongs to you, click "Claim This Item".
              </div>
            ) : (
              <div className="space-y-3">
                {claimsSubmitted.map(claim => {
                  const targetItem = items.find(i => i.id === claim.itemId);
                  return (
                    <div
                      key={claim.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            claim.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : claim.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {claim.status}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900">
                            {claim.itemName}
                          </h4>
                          <span className="text-xs text-slate-500">
                            (Reported by {claim.ownerName})
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-400">
                          {new Date(claim.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                        <strong className="text-slate-800">Your Submitted Proof:</strong> "{claim.message}"
                      </div>

                      {claim.status === 'APPROVED' ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Claim Approved &amp; Handover Ready!</span>
                            </div>
                            <button
                              onClick={() => openReviewClaimModal(claim)}
                              className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-[11px] font-bold shadow-xs"
                            >
                              View Handover Slip
                            </button>
                          </div>
                          <p className="text-xs text-emerald-800 leading-relaxed">
                            <strong>Pickup Desk:</strong> {claim.handoverLocation || targetItem?.currentStorageLocation || 'Campus Security Cabin (Main Gate)'}.
                            <br />
                            <strong>Required:</strong> Please present your College Student ID card to collect this item.
                          </p>
                          {claim.resolutionNotes && (
                            <p className="text-[11px] text-emerald-700 italic">
                              Note from finder: "{claim.resolutionNotes}"
                            </p>
                          )}
                        </div>
                      ) : claim.status === 'REJECTED' ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 space-y-1">
                          <div className="font-bold flex items-center space-x-1">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            <span>Claim Not Approved</span>
                          </div>
                          <p>
                            Reason: {claim.resolutionNotes || 'Submitted proof did not match physical item inspection.'}
                          </p>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-xl flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Status: <strong>Under Verification</strong> — Awaiting review by the finder ({claim.ownerName}).</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end space-x-3 pt-1">
                        <button
                          onClick={() => {
                            openContactModal(targetItem || {
                              id: claim.itemId,
                              itemName: claim.itemName,
                              userId: claim.ownerId,
                              userName: claim.ownerName,
                              type: claim.itemType,
                              category: 'Other',
                              description: '',
                              location: 'Campus',
                              date: '',
                              image: '',
                              color: '',
                              status: 'CLAIMED',
                              createdAt: '',
                              userContactPref: 'in-app'
                            });
                          }}
                          className="text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center space-x-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                          <span>Message Finder</span>
                        </button>
                        <button
                          onClick={() => selectItem(claim.itemId)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1"
                        >
                          <span>View Item Listing</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 4: Candidate Match Alerts */}
      {activeTab === 'matches' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Automated Smart Match Pairings for Your Items</span>
              </h2>
              <p className="text-xs text-slate-500">
                Items from the opposite directory meeting the ≥60% similarity threshold
              </p>
            </div>
            <button
              onClick={() => setCurrentPage('matches')}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-xs self-start sm:self-auto"
            >
              Open Campus Match Feed →
            </button>
          </div>

          {myMatchAlerts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-base text-slate-700">No Match Alerts Right Now</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                As soon as someone logs an item with matching category, location, date, color, and keywords, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {myMatchAlerts.map((pair, pIdx) => (
                <div key={pIdx} className="bg-slate-50/70 rounded-3xl border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-200">
                    <img
                      src={pair.item.image}
                      alt={pair.item.itemName}
                      className="w-12 h-12 rounded-xl object-cover border shrink-0"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          pair.item.type === 'LOST' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          Your {pair.item.type} Item
                        </span>
                        <h3 className="font-bold text-sm text-slate-900">{pair.item.itemName}</h3>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {pair.item.location} • {pair.item.date} • Color: {pair.item.color}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {pair.matches.map((match, mIdx) => (
                      <div key={mIdx} className="bg-white rounded-2xl border border-blue-200 p-4 shadow-xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <img
                              src={match.matchedItem.image}
                              alt={match.matchedItem.itemName}
                              className="w-12 h-12 rounded-xl object-cover border shrink-0"
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs text-slate-900">
                                  {match.matchedItem.itemName}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {match.matchedItem.type}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                📍 {match.matchedItem.location} • 📅 {match.matchedItem.date}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => selectItem(match.matchedItem.id)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors"
                            >
                              View Details
                            </button>
                            {match.matchedItem.type === 'FOUND' && (
                              <button
                                onClick={() => openClaimModal(match.matchedItem)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Claim</span>
                              </button>
                            )}
                            <button
                              onClick={() => openContactModal(match.matchedItem)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                            >
                              Message
                            </button>
                          </div>
                        </div>

                        <MatchingScoreBadge matchDetails={match} showBreakdownInitial={true} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: In-App Messages Inbox */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Safe In-App Message Conversations
            </h2>
            <span className="text-xs text-slate-500">
              Direct inquiries &amp; verification questions regarding items
            </span>
          </div>

          {myMessages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Mail className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-base text-slate-700">No Messages Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When someone contacts you about a lost or found item, discussions will appear here securely without exposing phone numbers.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myMessages.map(msg => {
                const isIncoming = msg.receiverId === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    className={`bg-white rounded-2xl border p-4 shadow-xs transition-all ${
                      !msg.read && isIncoming
                        ? 'border-blue-300 bg-blue-50/20 ring-1 ring-blue-500/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isIncoming ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isIncoming ? 'Received Inquiry' : 'Sent by You'}
                        </span>
                        <span className="font-bold text-xs text-slate-900">
                          {isIncoming ? msg.senderName : `To: ${msg.receiverName || 'User'}`}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-600 font-medium">
                          Regarding: <strong className="text-blue-600">{msg.itemName}</strong>
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-slate-400">
                        {new Date(msg.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl">
                      {msg.text}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2">
                      <button
                        onClick={() => selectItem(msg.itemId)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1"
                      >
                        <span>Inspect Listing</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>

                      {isIncoming && (
                        <div className="flex items-center space-x-2">
                          {!msg.read && (
                            <button
                              onClick={() => markMessageRead(msg.id)}
                              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                            >
                              Mark as Read
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                          >
                            {selectedMessageId === msg.id ? 'Cancel Reply' : 'Reply'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline reply box */}
                    {selectedMessageId === msg.id && (
                      <form onSubmit={e => handleReplySubmit(e, msg)} className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                        <input
                          type="text"
                          required
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder={`Reply to ${msg.senderName}...`}
                          className="flex-1 border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send</span>
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
