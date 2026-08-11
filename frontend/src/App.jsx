import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import RequireAuth from './components/RequireAuth';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SearchPage from './pages/SearchPage';
import ResumePage from './pages/ResumePage';
import AnalysisPage from './pages/AnalysisPage';
import InterviewPage from './pages/InterviewPage';
import SavedJobsPage from './pages/SavedJobsPage';
import StarStoriesPage from './pages/StarStoriesPage';
import ProfilePage from './pages/ProfilePage';

function AppContent() {
  const location = useLocation();

  // Hide Navbar when on the /login page
  const hideNavbar = location.pathname === '/login';

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/search" element={<RequireAuth><SearchPage /></RequireAuth>} />
        <Route path="/resume" element={<RequireAuth><ResumePage /></RequireAuth>} />
        <Route path="/analysis" element={<RequireAuth><AnalysisPage /></RequireAuth>} />
        <Route path="/interview" element={<RequireAuth><InterviewPage /></RequireAuth>} />
        <Route path="/saved-jobs" element={<RequireAuth><SavedJobsPage /></RequireAuth>} />
        <Route path="/star-stories" element={<RequireAuth><StarStoriesPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster position="top-right" />
      <AppContent />
    </BrowserRouter>
  );
}