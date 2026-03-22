import React from 'react';
import { Shield, LayoutDashboard, UploadCloud, Calendar, User as UserIcon, LogOut, Bell, Users, BarChart2, FileText, Settings, MessageSquare } from 'lucide-react';
import { useLocation, Link, useNavigate, Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext.jsx';
const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const { currentUser } = user;

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Only real admin roles from login — do not use .includes('Admin') or phrases like
  // "System Admin / Tester" would incorrectly open the admin portal.
  const isAdmin =
    currentUser.role === 'Admin' ||
    currentUser.role === 'Super Admin';

  // Navigation for Normal Users
  const userNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Upload Document', path: '/upload', icon: UploadCloud },
    { name: 'Calendar Sync', path: '/calendar', icon: Calendar },
    { name: 'AI Assistant', path: '/assistant', icon: MessageSquare },
    { name: 'User Profile', path: '/profile', icon: UserIcon },
  ];

  // Navigation for Admins
  const adminNavItems = [
    { name: 'Overview', path: '/admin', icon: LayoutDashboard },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart2 },
    { name: 'Documents', path: '/admin/documents', icon: FileText },
    { name: 'AI Assistant', path: '/assistant', icon: MessageSquare },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  const handleLogout = () => {
    setUser({ currentUser: null, stats: {}, recentActivity: [] });
    navigate('/login');
  };

  const isAssistantPage = location.pathname === '/assistant';

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 relative">
      
      {/* Sidebar */}
      <div className="w-64 text-white flex flex-col justify-between bg-[#0f172a] z-20">
        <div>
          <div className="flex items-center gap-3 p-6">
            <Shield className={`w-8 h-8 ${isAdmin ? 'text-red-500' : 'text-blue-500'}`} />
            <div>
              <h1 className="text-xl font-bold tracking-wide">{isAdmin ? 'Admin Portal' : 'AI Legal Analyzer'}</h1>
              {isAdmin && <p className="text-xs text-slate-400">AI Legal Analyzer</p>}
            </div>
          </div>
          <nav className="mt-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.name} 
                  to={item.path}
                  className={`flex items-center gap-3 px-6 py-3 mx-4 rounded-lg transition-colors ${
                    isActive 
                      ? (isAdmin ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-blue-600 text-white') 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-6">
          <button onClick={handleLogout} className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors w-full">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden z-10">
        
        {/* Top Navigation */}
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-8">
          <div className="text-sm font-semibold text-gray-500 uppercase">{isAdmin ? 'Admin Portal' : 'User Dashboard'}</div>
          <div className="flex items-center gap-6">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 border-l pl-6">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${isAdmin ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                {currentUser.initials}
              </div>
              <div className="text-sm">
                <p className="font-bold text-gray-800 leading-tight">{currentUser.name}</p>
                <p className="text-gray-500 text-xs">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </header>

        <main
          className={
            isAssistantPage
              ? 'flex-1 flex flex-col min-h-0 overflow-hidden p-0'
              : 'flex-1 overflow-y-auto p-8'
          }
        >
          {children}
        </main>
      </div>

    </div>
  );
};

export default Layout;