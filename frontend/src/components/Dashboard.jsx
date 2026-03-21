// frontend/src/components/Dashboard.jsx
import React from 'react';
import { FileText, AlertTriangle, TrendingUp, Calendar, UploadCloud, User } from 'lucide-react';
import { useUser } from '../context/UserContext'; // Import hook
import { Link } from 'react-router-dom';

const Dashboard = () => {
  // Grab user data from context
  const { user } = useUser();
  const { stats, recentActivity } = user;

  // Dynamic stats array based on context data
  const dynamicStats = [
    { title: 'DOCUMENTS ANALYZED', value: stats.docsAnalyzed, icon: FileText, iconColor: 'text-blue-500', bgColor: 'bg-blue-50' },
    { title: 'AVG RISK SCORE', value: stats.avgRiskScore, icon: AlertTriangle, iconColor: 'text-yellow-500', bgColor: 'bg-yellow-50' },
    { title: 'CLAUSES DETECTED', value: stats.clausesDetected, icon: TrendingUp, iconColor: 'text-green-500', bgColor: 'bg-green-50' },
    { title: 'UPCOMING DEADLINES', value: stats.upcomingDeadlines, icon: Calendar, iconColor: 'text-blue-500', bgColor: 'bg-blue-50' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in text-gray-800">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Document Analysis Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your document analysis activity and quick actions.</p>
      </div>

      {/* Stats Grid - NOW DYNAMIC */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {dynamicStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 tracking-wider mb-2">{stat.title}</p>
                <p className="text-3xl font-black text-slate-800">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions - Added Links */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold mb-4 text-slate-800">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/upload" className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors group">
            <UploadCloud className="w-6 h-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Upload & Scan</span>
          </Link>
          <Link to="/calendar" className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors group">
            <Calendar className="w-6 h-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
            <span className="font-medium">View Deadlines</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors group">
            <User className="w-6 h-6 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
            <span className="font-medium">My Profile</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity - NOW DYNAMIC WITH EMPTY STATE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Recent Activity</h2>
          {recentActivity.length > 0 && (
             <button className="text-blue-600 text-sm font-medium hover:text-blue-800 flex items-center gap-1">
               View All &rarr;
             </button>
          )}
        </div>
        <div className="divide-y divide-gray-100">
          {/* Conditional rendering: Show activity if it exists, otherwise show empty state message */}
          {recentActivity.length > 0 ? (
            recentActivity.map((doc, index) => (
            <div key={index} className="p-4 px-6 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{doc.name}</p>
                  <p className="text-sm text-gray-500">{doc.date}</p>
                </div>
              </div>
              <span className={`px-3 py-1 text-xs font-bold border rounded-full ${doc.riskColor}`}>
                {doc.risk}
              </span>
            </div>
          ))
          ) : (
            // Empty state message
            <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                <FileText className="w-10 h-10 text-gray-300"/>
                <p>No documents analyzed yet.</p>
                <Link to="/upload" className="text-blue-500 text-sm hover:underline">Upload your first document</Link>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;