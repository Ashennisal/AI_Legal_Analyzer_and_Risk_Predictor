import React from 'react';
import { User as UserIcon, Mail, Shield } from 'lucide-react';
import { useUser } from '../context/UserContext.jsx';

const UserProfile = () => {
  const { user } = useUser();
  const { currentUser } = user;

  if (!currentUser) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-gray-800">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Profile Header Block */}
        <div className="h-32 bg-slate-900"></div>
        
        {/* Profile Info Section */}
        <div className="px-8 pb-8 relative">
          
          {/* Avatar - ADJUSTED POSITIONING HERE */}
          <div className="absolute -top-16 left-8 w-24 h-24 bg-white rounded-full p-1 shadow-md">
            <div className="w-full h-full bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-black">
              {currentUser.initials}
            </div>
          </div>
          
          {/* User Details - Added pt-12 to push text down slightly */}
          <div className="pt-12">
            <h2 className="text-2xl font-bold text-slate-900">{currentUser.name}</h2>
            <div className="flex items-center gap-4 mt-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {currentUser.email || "user@example.com"}</span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full font-medium"><Shield className="w-4 h-4 text-blue-500" /> {currentUser.role}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;