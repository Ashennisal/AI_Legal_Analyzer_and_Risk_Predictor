// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './context/UserContext.jsx';
import AdminOverview from './components/AdminOverview.jsx';
import Uploader from './components/Uploader.jsx';
import CalendarSync from './components/CalendarSync.jsx';
import UserProfile from './components/UserProfile.jsx';
import PlatformAnalytics from './components/PlatformAnalytics.jsx';
import DocumentOversight from './components/DocumentOversight.jsx';
import PlatformSettings from './components/PlatformSettings.jsx';

import Layout from './components/Layout.jsx';
import Dashboard from './components/Dashboard.jsx';
import UserManagement from './components/UserManagement.jsx';
import Auth from './components/Auth.jsx';

// You can eventually delete this Placeholder function if you aren't using it anymore!
const Placeholder = ({ title }) => (
  <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 h-full flex items-center justify-center">
    <h2 className="text-2xl text-gray-400 font-medium">{title} Page Coming Soon</h2>
  </div>
);

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          {/* 1. The Authentication Route (NO SIDEBAR) */}
          <Route path="/login" element={<Auth />} />
          
          {/* 2. All Dashboard Routes (WRAPPED IN SIDEBAR) */}
          <Route path="/*" element={
            <Layout>
              <Routes>
                {/* User Routes */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/upload" element={<Uploader />} />
                <Route path="/calendar" element={<CalendarSync />} /> 
                <Route path="/profile" element={<UserProfile />} />   
                
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminOverview />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/analytics" element={<PlatformAnalytics />} /> 
                <Route path="/admin/documents" element={<DocumentOversight />} /> 
                <Route path="/admin/settings" element={<PlatformSettings />} />   
                
                {/* Fallback for unknown routes */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;