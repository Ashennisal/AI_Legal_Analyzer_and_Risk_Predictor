import React from 'react';
import { Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';

const CalendarSync = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-gray-800">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Calendar & Deadlines</h1>
        <p className="text-gray-500 mt-1">Manage important dates extracted from your documents.</p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center py-16">
        <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CalendarIcon className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">No Upcoming Deadlines</h2>
        <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm">
          Upload a document with dates or deadlines to see them automatically appear here.
        </p>
        <button className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
          Sync with Google Calendar
        </button>
      </div>
    </div>
  );
};

export default CalendarSync;