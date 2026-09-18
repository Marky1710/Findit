import React, { useState } from 'react';
import { MatchScoreDetails } from '../types';
import { Sparkles, Check, ChevronDown, ChevronUp, AlertCircle, Info, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { getMatchStrengthDetails } from '../utils/matchingAlgorithm';

interface Props {
  matchDetails: MatchScoreDetails;
  showBreakdownInitial?: boolean;
}

export const MatchingScoreBadge: React.FC<Props> = ({ 
  matchDetails, 
  showBreakdownInitial = false 
}) => {
  const [expanded, setExpanded] = useState(showBreakdownInitial);
  const { 
    totalScore, 
    categoryScore, 
    locationScore, 
    dateScore, 
    colorScore, 
    keywordsScore, 
    matchStrength,
    isPossibleMatch 
  } = matchDetails;

  const strengthDetails = getMatchStrengthDetails(matchStrength);

  return (
    <div className={`rounded-2xl border transition-all bg-white p-4 shadow-xs ${strengthDetails.cardBorder}`}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          {/* Circular percentage progress indicator */}
          <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={
                  totalScore >= 90
                    ? 'text-emerald-500'
                    : totalScore >= 75
                    ? 'text-teal-500'
                    : totalScore >= 60
                    ? 'text-blue-500'
                    : 'text-slate-400'
                }
                strokeDasharray={`${totalScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-black text-slate-800 font-mono">
              {totalScore}%
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase ${strengthDetails.badgeBg}`}>
                {matchStrength}
              </span>
              <span className="text-xs font-mono font-bold text-slate-700">
                {totalScore} / 100 Pts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated multi-parameter similarity score
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="self-start sm:self-center text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center space-x-1.5 transition-colors"
        >
          <span>{expanded ? 'Hide Score Breakdown' : 'View Point Math'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded 100-Point Scoring Breakdown */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3.5 text-xs">
          
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
            <span>Algorithm 100-Point Criteria:</span>
            <span className="text-slate-400 font-normal">Weights: Semantic NLP(25) + Category(25) + Location(25) + Date(15) + Color(10)</span>
          </div>

          {/* Point Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            
            {/* Category: 25 pts */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center space-x-2">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  categoryScore >= 18 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {categoryScore >= 18 ? <Check className="w-3 h-3 stroke-[3]" /> : '–'}
                </span>
                <span className="font-medium text-slate-700">Category Match</span>
              </div>
              <span className="font-mono font-bold text-slate-900">
                +{categoryScore} / 25 pts
              </span>
            </div>

            {/* Location: 25 pts */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center space-x-2">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  locationScore >= 18 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {locationScore >= 18 ? <Check className="w-3 h-3 stroke-[3]" /> : '–'}
                </span>
                <span className="font-medium text-slate-700">Location Similarity</span>
              </div>
              <span className="font-mono font-bold text-slate-900">
                +{locationScore} / 25 pts
              </span>
            </div>

            {/* Date: 15 pts */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center space-x-2">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  dateScore >= 10 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {dateScore >= 10 ? <Check className="w-3 h-3 stroke-[3]" /> : '–'}
                </span>
                <span className="font-medium text-slate-700">Date Window</span>
              </div>
              <span className="font-mono font-bold text-slate-900">
                +{dateScore} / 15 pts
              </span>
            </div>

            {/* Color: 10 pts */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center space-x-2">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  colorScore >= 8 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {colorScore >= 8 ? <Check className="w-3 h-3 stroke-[3]" /> : '–'}
                </span>
                <span className="font-medium text-slate-700">Color Match</span>
              </div>
              <span className="font-mono font-bold text-slate-900">
                +{colorScore} / 10 pts
              </span>
            </div>

            {/* Keywords / NLP: 25 pts */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-2">
              <div className="flex items-center space-x-2">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  keywordsScore >= 15 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {keywordsScore >= 15 ? <Check className="w-3 h-3 stroke-[3]" /> : '–'}
                </span>
                <span className="font-medium text-slate-700">Semantic NLP &amp; Description</span>
              </div>
              <span className="font-mono font-bold text-slate-900">
                +{keywordsScore} / 25 pts
              </span>
            </div>

          </div>

          {/* Key Match Factors */}
          {matchDetails.matchFactors && matchDetails.matchFactors.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-700">Key Match Factors:</span>
              <div className="flex flex-wrap gap-1.5">
                {matchDetails.matchFactors.map((factor, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    ✓ {factor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {matchDetails.explanation && (
            <p className="text-[11px] text-slate-500 italic">
              {matchDetails.explanation}
            </p>
          )}

          {/* Disclaimer required by Section 2 */}
          <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Academic Disclaimer:</strong> The Smart Matching Algorithm evaluates heuristic similarity based on user-submitted attributes; it does not guarantee two items are physically identical. Ownership must be verified via the Claim Workflow before handover.
            </span>
          </div>

        </div>
      )}
    </div>
  );
};
