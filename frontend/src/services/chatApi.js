import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

export async function sendMessage(message, sessionId, file, userId) {
  const formData = new FormData();
  formData.append('message', message);
  if (sessionId) formData.append('session_id', String(sessionId));
  if (file) formData.append('file', file);

  const { data } = await axios.post(`${API_BASE}/api/chat`, formData, {
    params: { user_id: userId },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getSessions(userId) {
  const { data } = await axios.get(`${API_BASE}/api/sessions`, { params: { user_id: userId } });
  return data;
}

export async function renameSession(sessionId, title, userId) {
  const { data } = await axios.put(
    `${API_BASE}/api/sessions/${sessionId}`,
    { title },
    { params: { user_id: userId } },
  );
  return data;
}

export async function getHistory(sessionId, userId) {
  const { data } = await axios.get(`${API_BASE}/api/history/${sessionId}`, {
    params: { user_id: userId },
  });
  return data;
}

export async function deleteSession(sessionId, userId) {
  const { data } = await axios.delete(`${API_BASE}/api/sessions/${sessionId}`, {
    params: { user_id: userId },
  });
  return data;
}

export async function clearAllHistory(userId) {
  const { data } = await axios.delete(`${API_BASE}/api/history`, { params: { user_id: userId } });
  return data;
}
