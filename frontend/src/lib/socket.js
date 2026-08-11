import { io } from 'socket.io-client';
import { getStoredToken } from './auth';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

let socket = null;
let listeners = [];

function getSocket() {
  if (!socket) {
    const token = getStoredToken();
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }
  return socket;
}

// Subscribe to a specific analysis-update event for a given analysisId.
// Returns an unsubscribe function.
export function subscribeToAnalysisUpdates(analysisId, callback) {
  const s = getSocket();
  const handler = (payload) => {
    if (payload.analysisId === analysisId) {
      callback(payload);
    }
  };
  s.on('analysis-update', handler);
  listeners.push({ socket: s, event: 'analysis-update', handler });

  return () => {
    s.off('analysis-update', handler);
    listeners = listeners.filter((l) => l !== handler);
  };
}

// Call this on app unmount / route change if you want to tear down the socket.
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  listeners = [];
}