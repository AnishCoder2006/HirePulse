import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { hasValidToken, clearAuthState } from '../lib/auth';
import { 
  Zap, 
  LogOut, 
  LogIn, 
  User as UserIcon, 
  Menu, 
  X 
} from 'lucide-react';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/search', label: 'Find jobs' },
  { to: '/resume', label: 'Resume' },
  { to: '/analysis', label: 'Analysis' },
  { to: '/interview', label: 'Interview' },
  { to: '/saved-jobs', label: 'Tracker' },
  { to: '/star-stories', label: 'Stories' }
];

export default function Navbar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLoggedIn = hasValidToken();
  
  const user = (() => {
    try { 
      return JSON.parse(localStorage.getItem('user') || '{}'); 
    } catch { 
      return {}; 
    }
  })();

  function logout() {
    clearAuthState();
    setMobileMenuOpen(false);
    navigate('/login');
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <NavLink 
          to="/" 
          onClick={() => setMobileMenuOpen(false)} 
          className="flex items-center gap-2.5 mr-4 group shrink-0"
        >
          <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200 border border-white/20">
            <Zap className="w-5 h-5 text-white fill-white/20" />
          </div>
          <span className="text-white font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            HirePulse
          </span>
        </NavLink>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-1.5">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `relative rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <span className="flex items-center gap-1.5">
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />}
                  {link.label}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* User Profile / Auth Area (Desktop) */}
        <div className="hidden sm:flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-2.5">
              <NavLink 
                to="/profile" 
                className="flex items-center gap-2 rounded-xl bg-slate-900/80 border border-white/10 px-3.5 py-1.5 text-sm font-semibold text-slate-200 hover:border-blue-500/40 hover:bg-slate-900 transition-all shadow-sm"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xs font-bold">
                  {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-3 h-3" />}
                </div>
                <span>{user.name || 'Profile'}</span>
              </NavLink>
              
              <button 
                onClick={logout} 
                className="rounded-xl border border-white/10 bg-white/5 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 px-3.5 py-1.5 text-sm font-semibold text-slate-400 transition-all flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          ) : (
            <NavLink 
              to="/login" 
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:brightness-110 active:scale-[0.98] transition-all border border-blue-400/30"
            >
              <LogIn className="w-4 h-4" />
              <span>Log in</span>
            </NavLink>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex lg:hidden items-center gap-2">
          {isLoggedIn && (
            <NavLink 
              to="/profile" 
              className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold"
            >
              {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
            </NavLink>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl px-4 py-4 space-y-2 shadow-2xl">
          <div className="grid gap-1">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`
                }
              >
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            {isLoggedIn ? (
              <>
                <NavLink 
                  to="/profile" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl bg-slate-900 border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200"
                >
                  <UserIcon className="w-4 h-4 text-indigo-400" />
                  <span>{user.name || 'Profile'}</span>
                </NavLink>

                <button 
                  onClick={logout} 
                  className="w-full rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 transition flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </>
            ) : (
              <NavLink 
                to="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20"
              >
                <LogIn className="w-4 h-4" />
                <span>Log in</span>
              </NavLink>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}