import React, { useState } from 'react';
import { Calendar, ShieldAlert, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Same layout as the post-upload success view: risk grid + deadlines (+ optional AI summaries).
 * `analysis` / `calendarEvents` match `response.data` from POST /api/documents/analyze.
 */
export default function AnalysisResultView({
  analysis,
  calendarEvents = [],
  filename,
  summaries = null,
  showDashboardLink = false,
}) {
  const [summaryTab, setSummaryTab] = useState('technical');

  const hasSummaries =
    summaries &&
    typeof summaries === 'object' &&
    ['technical', 'layman', 'actionable'].some((k) =>
      String(summaries[k] ?? '').trim(),
    );

  return (
    <div className="space-y-6 animate-fade-in">
      {showDashboardLink && filename && (
        <p className="text-sm text-blue-600">
          <Link to="/" className="font-semibold hover:underline">
            Open Dashboard
          </Link>
          <span className="text-gray-500 font-normal"> to see this analysis anytime.</span>
        </p>
      )}

      {hasSummaries && (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
            <BookOpen className="w-5 h-5 text-blue-600" />
            AI summaries
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {['technical', 'layman', 'actionable'].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSummaryTab(id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  summaryTab === id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap max-h-[28rem] overflow-y-auto leading-relaxed">
            {summaries[summaryTab] || '—'}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
            <ShieldAlert className="w-5 h-5 text-red-500" /> Risk Assessment
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 font-medium">Risk Level</p>
              <p
                className={`text-xl font-black ${
                  analysis?.risk_level === 'High'
                    ? 'text-red-600'
                    : analysis?.risk_level === 'Medium'
                      ? 'text-yellow-600'
                      : 'text-green-600'
                }`}
              >
                {analysis?.risk_level || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Risk Score</p>
              <p className="text-lg font-bold text-slate-800">{analysis?.risk_score ?? 0} / 100</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Risky Clauses Detected</p>
              <p className="text-lg font-bold text-slate-800">{analysis?.clauses_detected ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
            <Calendar className="w-5 h-5 text-purple-500" /> Extracted Deadlines
          </div>
          {calendarEvents && calendarEvents.length > 0 ? (
            <ul className="space-y-3">
              {calendarEvents.map((event, idx) => (
                <li
                  key={idx}
                  className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col"
                >
                  <span className="font-bold text-sm text-slate-800">{event.title}</span>
                  <span className="text-xs text-slate-500 mt-1">
                    {event.date} at {event.time}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500 italic">
              No dates or deadlines detected in this document.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
