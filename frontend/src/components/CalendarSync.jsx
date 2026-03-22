import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  RefreshCw,
  Cloud,
  CloudOff,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react';
import axios from 'axios';
import { useUser } from '../context/UserContext';

const API = 'http://127.0.0.1:8000';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Local date → YYYY-MM-DD (no UTC shift). */
function toISODateLocal(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function monthMeta(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  return { first, lastDay, leading };
}

function buildCalendarCells(year, monthIndex) {
  const { lastDay, leading } = monthMeta(year, monthIndex);
  const cells = [];
  for (let i = 0; i < leading; i++) {
    cells.push({ kind: 'empty', key: `e-${i}` });
  }
  for (let d = 1; d <= lastDay; d++) {
    cells.push({
      kind: 'day',
      day: d,
      iso: toISODateLocal(year, monthIndex, d),
      key: `d-${d}`,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ kind: 'empty', key: `t-${cells.length}` });
  }
  return cells;
}

const CalendarSync = () => {
  const { user } = useUser();
  const userId = user?.currentUser?.id;

  const [events, setEvents] = useState([]);
  const [warning, setWarning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    if (userId == null) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API}/api/events`, { params: { user_id: userId } });
      setEvents(data.events || []);
      setWarning(data.warning || null);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.detail || e.message || 'Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const eventsByDate = useMemo(() => {
    const m = {};
    for (const ev of events) {
      const d = (ev.event_date || '').slice(0, 10);
      if (!d) continue;
      if (!m[d]) m[d] = [];
      m[d].push(ev);
    }
    return m;
  }, [events]);

  const todayIso = toISODateLocal(now.getFullYear(), now.getMonth(), now.getDate());

  const cells = useMemo(
    () => buildCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const openAddModal = (isoDate) => {
    setModal({
      event_date: isoDate,
      title: 'New deadline',
      event_time: '09:00',
    });
    setError(null);
  };

  const saveNewEvent = async () => {
    if (!modal || !userId) return;
    const title = (modal.title || '').trim();
    if (title.length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    setBusyId('new');
    setError(null);
    try {
      await axios.post(
        `${API}/api/events`,
        {
          title,
          event_date: modal.event_date,
          event_time: modal.event_time || '09:00',
        },
        { params: { user_id: userId } },
      );
      setModal(null);
      await load();
    } catch (e) {
      const d = e.response?.data?.detail;
      setError(typeof d === 'string' ? d : e.message || 'Could not save event');
    } finally {
      setBusyId(null);
    }
  };

  const sync = async (eventId) => {
    setBusyId(eventId);
    setError(null);
    try {
      await axios.post(`${API}/api/events/${eventId}/sync`, {}, { params: { user_id: userId } });
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Sync failed');
    } finally {
      setBusyId(null);
    }
  };

  const unsync = async (eventId) => {
    setBusyId(eventId);
    setError(null);
    try {
      await axios.post(`${API}/api/events/${eventId}/unsync`, {}, { params: { user_id: userId } });
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Unsync failed');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (eventId) => {
    if (!window.confirm('Delete this deadline from the list?')) return;
    setBusyId(eventId);
    setError(null);
    try {
      await axios.delete(`${API}/api/events/${eventId}`, { params: { user_id: userId } });
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  if (userId == null) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center text-gray-500">
        Sign in to view saved deadlines and sync with Google Calendar.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in text-gray-800 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar & Deadlines</h1>
          <p className="text-gray-500 mt-1">
            Click a date to add a deadline here first, then sync to Google Calendar when ready (
            <code className="text-xs bg-gray-100 px-1 rounded">token.json</code> required for sync).
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {warning && (
        <div className="flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}

      {error && !modal && (
        <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-100 rounded-lg p-4 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{typeof error === 'string' ? error : JSON.stringify(error)}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Live month calendar */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-900">{monthLabel}</h2>
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <p className="text-center text-gray-400 py-8 text-sm">Loading calendar…</p>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell) => {
                if (cell.kind === 'empty') {
                  return <div key={cell.key} className="aspect-square min-h-[2.5rem]" />;
                }
                const dayEvents = eventsByDate[cell.iso] || [];
                const isToday = cell.iso === todayIso;
                const isPast = cell.iso < todayIso;
                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => openAddModal(cell.iso)}
                    title={`Add deadline on ${cell.iso}`}
                    className={`aspect-square min-h-[2.5rem] rounded-lg border text-sm font-medium transition-colors flex flex-col items-center justify-start pt-1 px-0.5
                      ${
                        isPast
                          ? 'border-gray-100 bg-slate-50/80 text-slate-600 hover:border-blue-200 hover:bg-blue-50/40'
                          : isToday
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-100 hover:border-blue-300 hover:bg-blue-50/50 text-slate-800'
                      }`}
                  >
                    <span>{cell.day}</span>
                    {dayEvents.length > 0 && (
                      <span className="mt-0.5 flex flex-wrap gap-0.5 justify-center max-w-full">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.event_id}
                            className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"
                            title={ev.title}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] text-gray-500 leading-none">+{dayEvents.length - 3}</span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-4 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Click any date to add a deadline (past or future). Sync to Google when
            ready.
          </p>
        </div>

        {/* Event list */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[320px]">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Your deadlines</h3>
          {loading ? (
            <p className="text-center text-gray-500 py-12">Loading…</p>
          ) : events.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CalendarIcon className="w-7 h-7" />
              </div>
              <p className="text-slate-600 text-sm font-medium">No deadlines yet</p>
              <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
                Use the calendar to add dates, or run document analysis to import extracted deadlines.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">
              {events.map((ev) => (
                <li
                  key={ev.event_id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{ev.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4 shrink-0" /> {ev.event_date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4 shrink-0" /> {ev.event_time || '—'}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-gray-400">
                        {ev.status}
                        {ev.google_event_id ? ' · linked' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {ev.status === 'synced' && ev.google_event_id ? (
                      <button
                        type="button"
                        disabled={busyId === ev.event_id}
                        onClick={() => unsync(ev.event_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <CloudOff className="w-4 h-4" /> Unsync
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === ev.event_id}
                        onClick={() => sync(ev.event_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Cloud className="w-4 h-4" /> Sync to Google
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === ev.event_id}
                      onClick={() => remove(ev.event_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-red-100 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Add-event modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setModal(null)}
          role="presentation"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add deadline</h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && (
              <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {typeof error === 'string' ? error : JSON.stringify(error)}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
                <p className="text-slate-900 font-medium">{modal.event_date}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1" htmlFor="deadline-title">
                  Title
                </label>
                <input
                  id="deadline-title"
                  type="text"
                  value={modal.title}
                  onChange={(e) => setModal((m) => ({ ...m, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. Contract renewal filing"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1" htmlFor="deadline-time">
                  Time
                </label>
                <input
                  id="deadline-time"
                  type="time"
                  value={modal.event_time}
                  onChange={(e) => setModal((m) => ({ ...m, event_time: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === 'new'}
                onClick={saveNewEvent}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                {busyId === 'new' ? 'Saving…' : 'Save to list'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarSync;
