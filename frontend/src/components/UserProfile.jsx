import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { User as UserIcon, Mail, Shield, FileText, AlertTriangle, AlertCircle, CheckCircle, HelpCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext.jsx';
import DocumentAnalysisModal from './DocumentAnalysisModal.jsx';

const API = 'http://127.0.0.1:8000';

const RISK_ORDER = ['High', 'Medium', 'Low', 'Uncategorized'];

function groupDocumentsByRisk(documents) {
  const groups = Object.fromEntries(RISK_ORDER.map((k) => [k, []]));
  for (const d of documents) {
    const rl = d.risk_level;
    const key = rl === 'High' || rl === 'Medium' || rl === 'Low' ? rl : 'Uncategorized';
    groups[key].push(d);
  }
  return groups;
}

const CATEGORY_META = {
  High: {
    label: 'High risk',
    hint: 'Review these first.',
    Icon: AlertTriangle,
    chip: 'text-red-700 bg-red-50 border-red-100',
    bar: 'bg-red-500',
  },
  Medium: {
    label: 'Medium risk',
    hint: 'Worth a careful read.',
    Icon: AlertCircle,
    chip: 'text-amber-800 bg-amber-50 border-amber-100',
    bar: 'bg-orange-400',
  },
  Low: {
    label: 'Low risk',
    hint: 'Lower relative exposure in this scan.',
    Icon: CheckCircle,
    chip: 'text-green-700 bg-green-50 border-green-100',
    bar: 'bg-green-500',
  },
  Uncategorized: {
    label: 'Other',
    hint: 'Risk tier not set or legacy row.',
    Icon: HelpCircle,
    chip: 'text-slate-600 bg-slate-100 border-slate-200',
    bar: 'bg-slate-400',
  },
};

const UserProfile = () => {
  const { user } = useUser();
  const { currentUser } = user;
  const userId = currentUser?.id ?? 1;

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/documents/my`, {
        params: { user_id: userId },
      });
      setDocuments(data.documents || []);
    } catch (e) {
      console.error('Failed to load documents', e);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const grouped = useMemo(() => groupDocumentsByRisk(documents), [documents]);

  const openDoc = (doc) => {
    const uploadedAt = doc.uploaded_at
      ? new Date(doc.uploaded_at).toLocaleString()
      : '';
    setSelected({
      name: doc.filename,
      date: uploadedAt,
      result: doc.result ?? doc.snapshot,
      snapshot: doc.snapshot ?? doc.result,
    });
  };

  if (!currentUser) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in text-gray-800 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account and browse everything you have analyzed.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-32 bg-slate-900" />

        <div className="px-8 pb-8 relative">
          <div className="absolute -top-16 left-8 w-24 h-24 bg-white rounded-full p-1 shadow-md">
            <div className="w-full h-full bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-black">
              {currentUser.initials}
            </div>
          </div>

          <div className="pt-12">
            <h2 className="text-2xl font-bold text-slate-900">{currentUser.name}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4" /> {currentUser.email || 'user@example.com'}
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full font-medium">
                <Shield className="w-4 h-4 text-blue-500" /> {currentUser.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">My analyzed documents</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Grouped by overall risk. Open any file for the full overview and highlighted document view.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadDocuments()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="p-6 space-y-8">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Loading your documents…</p>
          ) : documents.length === 0 ? (
            <div className="text-center py-10 px-4 text-gray-500">
              <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="font-medium text-slate-700">No analyses yet</p>
              <p className="text-sm mt-1 mb-4">Upload a contract or PDF to see it listed here by risk category.</p>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 text-blue-600 font-semibold text-sm hover:underline"
              >
                Go to upload
              </Link>
            </div>
          ) : (
            RISK_ORDER.map((key) => {
              const list = grouped[key];
              if (!list.length) return null;
              const meta = CATEGORY_META[key];
              const { Icon, label, hint, chip, bar } = meta;

              return (
                <div key={key} className="rounded-xl border border-gray-100 bg-slate-50/80 overflow-hidden">
                  <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100/80 bg-white`}>
                    <span className={`w-1 self-stretch min-h-[2.5rem] rounded-full ${bar}`} aria-hidden />
                    <Icon className="w-5 h-5 text-slate-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">{label}</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${chip}`}>
                          {list.length} {list.length === 1 ? 'document' : 'documents'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
                    </div>
                  </div>
                  <ul className="divide-y divide-gray-100 bg-white">
                    {list.map((doc) => {
                      const snap = doc.result ?? doc.snapshot;
                      const score = snap?.analysis?.risk_score;
                      const clauses = snap?.analysis?.clauses_detected ?? doc.clauses_detected;
                      const uploaded = doc.uploaded_at
                        ? new Date(doc.uploaded_at).toLocaleString()
                        : '';

                      return (
                        <li key={doc.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-4 hover:bg-slate-50/80 transition-colors">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="p-2 rounded-lg bg-gray-100 text-gray-500 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{doc.filename}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{uploaded}</p>
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600">
                                {typeof score === 'number' && (
                                  <span>
                                    Score: <strong className="text-slate-800">{score}</strong> / 100
                                  </span>
                                )}
                                {typeof clauses === 'number' && (
                                  <span>
                                    Clauses flagged: <strong className="text-slate-800">{clauses}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => openDoc(doc)}
                            className="shrink-0 px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                          >
                            Overview & highlights
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </section>

      <DocumentAnalysisModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        subtitle={selected?.date}
        result={selected?.result}
        snapshot={selected?.snapshot}
      />
    </div>
  );
};

export default UserProfile;
