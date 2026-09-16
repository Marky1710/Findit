import React from 'react';
import { useApp } from '../context/AppContext';
import { Compass, ShieldCheck, Heart, RotateCcw, ExternalLink, Award } from 'lucide-react';

export const Footer: React.FC = () => {
  const { setCurrentPage, resetToDefaultData } = useApp();

  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Brand & Project Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-2 text-white font-bold text-lg">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Compass className="w-4 h-4 text-white" />
              </div>
              <span>Find<span className="text-blue-400">It</span></span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              A Smart Lost &amp; Found Management System with Automated Lost-Found Item Matching Algorithm for college campuses and universities.
            </p>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-blue-300 font-semibold text-[11px]">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>TY BSc Computer Science Mini-Project</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm tracking-wide uppercase">Website Navigation</h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => setCurrentPage('home')} className="hover:text-white transition-colors">
                  Home Overview
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentPage('browse')} className="hover:text-white transition-colors">
                  Browse All Items
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentPage('report-lost')} className="text-red-400 hover:text-red-300 transition-colors">
                  + Report Lost Item
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentPage('report-found')} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                  + Report Found Item
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentPage('dashboard')} className="hover:text-white transition-colors">
                  User Dashboard &amp; Posts
                </button>
              </li>
            </ul>
          </div>

          {/* Technical Algorithm */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm tracking-wide uppercase">Matching Algorithm</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li className="flex justify-between">
                <span>Category Match:</span>
                <span className="text-slate-200 font-mono font-bold">30 Pts</span>
              </li>
              <li className="flex justify-between">
                <span>Location Match:</span>
                <span className="text-slate-200 font-mono font-bold">25 Pts</span>
              </li>
              <li className="flex justify-between">
                <span>Date Proximity:</span>
                <span className="text-slate-200 font-mono font-bold">20 Pts</span>
              </li>
              <li className="flex justify-between">
                <span>Color Similarity:</span>
                <span className="text-slate-200 font-mono font-bold">15 Pts</span>
              </li>
              <li className="flex justify-between">
                <span>Keyword / NLP Overlap:</span>
                <span className="text-slate-200 font-mono font-bold">10 Pts</span>
              </li>
              <li className="pt-2 border-t border-slate-800 flex justify-between font-bold text-emerald-400">
                <span>Threshold for Match:</span>
                <span>&gt;= 70%</span>
              </li>
            </ul>
          </div>

          {/* Campus Support & Reset */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm tracking-wide uppercase">Campus Desk</h4>
            <p className="text-slate-400">
              Central Campus Lost &amp; Found Office<br />
              Ground Floor, Admin Building<br />
              Mon - Sat: 9:00 AM - 5:00 PM
            </p>
            <div className="pt-2">
              <button
                id="reset-demo-data-btn"
                onClick={() => {
                  if (confirm('Reset sample records to default initial database?')) {
                    resetToDefaultData();
                  }
                }}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-amber-400 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-colors"
                title="Restores original sample items including Samsung Earbuds, Black Wallet, and IDs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Sample Data</span>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500">
            &copy; 2026 FindIt Platform. Built for University Mini-Project evaluation.
          </p>
          <div className="flex items-center space-x-4 text-slate-400">
            <span className="flex items-center space-x-1 text-slate-400">
              <span>Crafted for TY BSc CS</span>
            </span>
            <button
              onClick={() => setCurrentPage('admin')}
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Admin System Panel
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
