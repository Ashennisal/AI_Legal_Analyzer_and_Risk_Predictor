import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, X, AlertCircle, CheckCircle, Loader2, Calendar, ShieldAlert } from 'lucide-react';
import axios from 'axios';

const Uploader = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success' or 'error'
  
  // NEW: State to hold the results from the AI
  const [analysisData, setAnalysisData] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);

  const fileInputRef = useRef(null);

  // Drag and Drop Event Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (validTypes.includes(selectedFile.type)) {
      setFile(selectedFile);
      setUploadStatus(null);
      setAnalysisData(null); // Reset previous results
      setCalendarEvents([]);
    } else {
      alert("Invalid file type. Please upload a PDF or DOCX file.");
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadStatus(null);
    setAnalysisData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- THE REAL API CONNECTION ---
  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadStatus(null);

    // Package the file to send to FastAPI
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', 1); // Mock user ID for now

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/documents/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Success! Save the data to display it
      setAnalysisData(response.data.analysis);
      setCalendarEvents(response.data.calendar_events);
      setUploadStatus('success');

    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in text-gray-800">
      
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Document</h1>
        <p className="text-gray-500 mt-1">Upload legal contracts, NDAs, or agreements for AI risk analysis.</p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        
        {/* Only show the upload box if we haven't successfully analyzed a file yet */}
        {uploadStatus !== 'success' ? (
          <div 
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ease-in-out ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : file ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.docx"
              className="hidden" 
            />

            {!file ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-blue-100 rounded-full text-blue-600">
                  <UploadCloud className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">Drag & drop your document here</p>
                  <p className="text-sm text-gray-500 mt-1">or click to browse your files</p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-gray-50 transition-colors shadow-sm mt-4"
                >
                  Browse Files
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="flex items-center gap-4 bg-white p-4 pr-6 rounded-lg border border-gray-200 shadow-sm w-full max-w-md relative">
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div className="text-left flex-1 overflow-hidden">
                    <p className="font-bold text-slate-800 truncate">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                  {!isUploading && (
                     <button onClick={removeFile} className="absolute -top-3 -right-3 p-1.5 bg-white border border-gray-200 rounded-full text-gray-400 hover:text-red-500 transition-colors">
                       <X className="w-4 h-4" />
                     </button>
                  )}
                </div>

                {uploadStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg font-medium text-sm">
                    <AlertCircle className="w-5 h-5" /> Analysis failed. Is your Python server running?
                  </div>
                )}

                <div className="flex gap-4">
                  <button onClick={removeFile} disabled={isUploading} className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-gray-50 disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={handleUpload} disabled={isUploading} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
                    {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Document...</> : 'Analyze Document'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          
          /* --- ANALYSIS RESULTS VIEW --- */
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-600 rounded-full"><CheckCircle className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Analysis Complete</h3>
                  <p className="text-sm text-gray-500">{file.name}</p>
                </div>
              </div>
              <button onClick={removeFile} className="text-sm font-bold text-blue-600 hover:text-blue-700">Upload Another</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Risk Results */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
                  <ShieldAlert className="w-5 h-5 text-red-500" /> Risk Assessment
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Risk Level</p>
                    <p className={`text-xl font-black ${
                      analysisData?.risk_level === 'High' ? 'text-red-600' : 
                      analysisData?.risk_level === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {analysisData?.risk_level || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Risk Score</p>
                    <p className="text-lg font-bold text-slate-800">{analysisData?.risk_score || 0} / 100</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Risky Clauses Detected</p>
                    <p className="text-lg font-bold text-slate-800">{analysisData?.clauses_detected || 0}</p>
                  </div>
                </div>
              </div>

              {/* Calendar Results */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
                  <Calendar className="w-5 h-5 text-purple-500" /> Extracted Deadlines
                </div>
                
                {calendarEvents && calendarEvents.length > 0 ? (
                  <ul className="space-y-3">
                    {calendarEvents.map((event, idx) => (
                      <li key={idx} className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col">
                        <span className="font-bold text-sm text-slate-800">{event.title}</span>
                        <span className="text-xs text-slate-500 mt-1">{event.date} at {event.time}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic">No dates or deadlines detected in this document.</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Uploader;