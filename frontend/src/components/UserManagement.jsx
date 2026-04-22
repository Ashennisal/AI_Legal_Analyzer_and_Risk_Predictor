import React, { useState, useEffect } from 'react';
import { Search, MoreHorizontal } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8001';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch real user data from MySQL when the component loads
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/admin/users`);
        setUsers(response.data.users);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching users:", error);
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in text-gray-800">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-gray-500 mt-1">View and manage all registered users on the platform.</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 py-2">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Search users..."
          />
        </div>
        <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
          {users.length} users
        </div>
      </div>

      {/* Table Component */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Documents</th>
                <th className="px-6 py-4">Last Active</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">Loading user data...</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${user.role.includes('Admin') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {user.initials}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{user.docs}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{user.last_active}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        user.status === 'Active' 
                          ? 'text-green-600 bg-green-50 border-green-200' 
                          : 'text-gray-500 bg-gray-50 border-gray-200'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;