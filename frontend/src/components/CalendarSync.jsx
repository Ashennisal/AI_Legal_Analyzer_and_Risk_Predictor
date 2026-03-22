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

  const todayIso = toISODateLocal(now.getFullYear(), now.getMonth(), now.getDate());

  const load = useCallback(async () => {
    if (userId == null) return;
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const { data } = await axios.get(`${API}/api/events`, { params: { user_id: userId } });
      setEvents(data.events || []);
      if (data.warning) setWarning(data.warning);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of events) {
      const d = ev.event_date;
      if (!d) continue;
      if (!map[d]) map[d] = [];
      map[d].push(ev);
    }
    return map;
  }, [events]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const shiftMonth = (delta) => {
    if (delta < 0 && viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else if (delta > 0 && viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + delta);
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
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-fade-in text-gray-800">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-8 h-8 text-blue-600" />
            Calendar &amp; Deadlines
          </h1>
          <p className="text-gray-500 mt-1">
            Deadlines from analysis and ones you add here. Sync to Google Calendar when ready.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {warning && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm p-4">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold text-slate-800">{monthLabel}</span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {buildCalendarCells(viewYear, viewMonth).map((cell) => {
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
                    <span className="text-[10px] leading-tight text-blue-600 font-semibold mt-0.5">
                      {dayEvents.length} due
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-4 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Click any date to add a deadline (past or future). Sync to Google when
            ready.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 min-h-[320px]">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Your deadlines</h2>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : events.length === 0 ? (
            <p className="text-gray-500 text-sm">No deadlines yet. Add one from the calendar or analyze a document.</p>
          ) : (
            <ul className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {events.map((ev) => (
                <li
                  key={ev.event_id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 border border-gray-100 rounded-lg p-3 bg-slate-50/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{ev.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                      <span>
                        {ev.event_date} {ev.event_time && <><Clock className="w-3 h-3 inline" /> {ev.event_time}</>}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          ev.status === 'synced'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {ev.status || 'draft'}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {ev.status === 'synced' ? (
                      <button
                        type="button"
                        disabled={busyId === ev.event_id}
                        onClick={() => unsync(ev.event_id)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium bg-white border border-gray-200 hover:bg-gray-50"
                      >
                        <CloudOff className="w-3.5 h-3.5" />
                        Unsync
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === ev.event_id}
                        onClick={() => sync(ev.event_id)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        Sync
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === ev.event_id}
                      onClick={() => remove(ev.event_id)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-slate-900">New deadline</h3>
              <button type="button" onClick={() => setModal(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block text-sm">
              <span className="text-gray-600">Title</span>
              <input
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={modal.title}
                onChange={(e) => setModal({ ...modal, title: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Date</span>
              <input
                type="date"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={modal.event_date}
                onChange={(e) => setModal({ ...modal, event_date: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Time (24h)</span>
              <input
                type="time"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={modal.event_time}
                onChange={(e) => setModal({ ...modal, event_time: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === 'new'}
                onClick={saveNewEvent}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarSync;
