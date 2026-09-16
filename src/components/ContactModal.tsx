import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Item } from '../types';
import { X, Send, ShieldCheck, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  item: Item;
  onClose: () => void;
}

export const ContactModal: React.FC<Props> = ({ item, onClose }) => {
  const { currentUser, sendMessage, openAuthModal } = useApp();
  const [messageText, setMessageText] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  // If not logged in, prompt to log in
  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div 
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center space-y-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Sign In Required</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              To send messages to <strong className="text-slate-800">{item.userName}</strong> regarding <em>{item.itemName}</em>, please sign in with your student ID or staff credentials.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                onClose();
                openAuthModal('student-login');
              }}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
            >
              Sign In
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is trying to contact themselves
  const isOwnItem = item.userId === currentUser.id;

  const quickTemplates = item.type === 'FOUND' ? [
    `Hi! I believe this ${item.itemName} belongs to me. I can provide unique identifying proof!`,
    `Hello, is this item still available at ${item.currentStorageLocation || item.location}?`,
    `Hi, where can I meet you or which office counter can I visit to collect this?`
  ] : [
    `Hi! I think I found your ${item.itemName}. Let's coordinate a verification and handover.`,
    `Hello, is your item still lost? Please verify if it matches the one I found at ${item.location}.`,
    `Hi, please contact the campus security desk where an item matching this description was submitted.`
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    sendMessage(item.userId, item.id, messageText);
    setSentSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Safe Contact Channel
              </h3>
              <p className="text-xs text-slate-300">
                Contacting {item.userName} regarding: <span className="text-blue-300 font-semibold">{item.itemName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border-b border-blue-100 p-3.5 flex items-start space-x-2.5 text-xs text-blue-900">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Privacy Protected: </span>
            Personal phone numbers and private emails are kept confidential. All messages are securely routed through the FindIt student messaging inbox.
          </div>
        </div>

        {sentSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-lg text-slate-900">Message Delivered!</h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Your message was sent to {item.userName}. You can track replies in your <strong>Dashboard Messages</strong> tab.
            </p>
          </div>
        ) : isOwnItem ? (
          <div className="p-6 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h4 className="font-bold text-base text-slate-900">This is your own listing</h4>
            <p className="text-xs text-slate-500">
              You posted this item. You cannot send a message to yourself. Go to your Dashboard to manage or mark it as recovered.
            </p>
            <button
              onClick={onClose}
              className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Quick Message Templates
              </label>
              <div className="space-y-1.5">
                {quickTemplates.map((template, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setMessageText(template)}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 text-xs text-slate-700 transition-colors"
                  >
                    "{template}"
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Your Message
              </label>
              <textarea
                required
                rows={4}
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Provide helpful details such as identifying marks, time lost/found, or verify details safely without sharing passwords or sensitive pins..."
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="send-message-submit-btn"
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Send className="w-4 h-4" />
                <span>Send Safe Message</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
