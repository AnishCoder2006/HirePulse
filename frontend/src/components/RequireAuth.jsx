import React from 'react';
import { Navigate } from 'react-router-dom';
import { hasValidToken } from '../lib/auth';

// Job search, resume upload, analysis, and interview all call endpoints
// protected by the backend's requireAuth middleware - sending a request
// with no token gets a 401 no matter what the UI does, so it's better to
// redirect to login before that request ever fires.
export default function RequireAuth({ children }) {
  const isLoggedIn = hasValidToken();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}