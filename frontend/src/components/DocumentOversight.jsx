import React, { useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import axios from 'axios';

const DocumentOversight = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8001';
        const response = await axios.get(`${API_URL}/api/admin/documents`);
        setDocuments(response.data.documents);
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocuments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in text-gray-800">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Document Oversight</h1>
        <p className="text-gray-500 mt-1">Browse all documents analyzed on the platform.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6">
        <h2 className="text-lg font-bold mb-4 text-slate-800">All Analyzed Documents</h2>
        
        {documents.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No documents have been uploaded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-3 pr-6 font-semibold">Document</th>
                  <th className="py-3 px-6 font-semibold">Uploaded By</th>
                  <th className="py-3 px-6 font-semibold">Date</th>
                  <th className="py-3 px-6 font-semibold">Risk Level</th>
                  <th className="py-3 px-6 font-semibold">Clauses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 pr-6 flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="font-bold text-slate-700 truncate max-w-[250px]" title={doc.name}>
                        {doc.name}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500">{doc.user || 'Unknown User'}</td>
                    <td className="py-4 px-6 text-slate-500">{doc.date}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        doc.risk === 'High' ? 'text-red-600 bg-red-50 border-red-200' :
                        doc.risk === 'Medium' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                        doc.risk === 'Low' ? 'text-green-600 bg-green-50 border-green-200' :
                        'text-slate-600 bg-slate-50 border-slate-200'
                      }`}>
                        {doc.risk || 'Pending'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-medium">{doc.clauses || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentOversight;