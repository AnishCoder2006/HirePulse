import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthState } from '../lib/auth';
import toast from 'react-hot-toast';

const rawApiUrl = import.meta.env.VITE_API_URL;
const API_BASE = rawApiUrl
    ? `${rawApiUrl.replace(/\/+$|\/api$/, '')}/api`
    : '/api';

export default function AuthPage() {
    const navigate = useNavigate();

    // Login Form State
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const [loginLoading, setLoginLoading] = useState(false);
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // Signup Form State
    const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', dob: '', gender: '' });
    const [signupLoading, setSignupLoading] = useState(false);
    const [showSignupPassword, setShowSignupPassword] = useState(false);

    // Handle Login
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginForm)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to sign in');

            clearAuthState();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            toast.success('Welcome back!');
            navigate('/');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoginLoading(false);
        }
    };

    // Handle Signup
    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        setSignupLoading(true);
        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signupForm)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create account');

            clearAuthState();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            toast.success('Account created successfully!');
            navigate('/');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSignupLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://api.fontshare.com/v2/css?f[]=clash-grotesk@400,500,600,700&display=swap');
                .font-display {
                  font-family: 'Clash Grotesk', sans-serif;
                }
                .bg-obsidian-deep {
                  background-color: #05080e;
                  background-image: 
                    radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.12) 0%, transparent 60%),
                    radial-gradient(circle at 85% 90%, rgba(217, 119, 6, 0.08) 0%, transparent 50%);
                }
                /* Main Glass Container */
                .glass-card-hero {
                  background: rgba(12, 17, 29, 0.45);
                  backdrop-filter: blur(32px) saturate(180%);
                  -webkit-backdrop-filter: blur(32px) saturate(180%);
                  border: 1px solid rgba(255, 255, 255, 0.12);
                  box-shadow: 
                    0 30px 80px -20px rgba(0, 0, 0, 0.9),
                    inset 0 1px 1px 0 rgba(255, 255, 255, 0.2),
                    0 0 40px rgba(245, 158, 11, 0.08);
                }
                /* Translucent Left Glass Section */
                .glass-section-left {
                  background: rgba(255, 255, 255, 0.02);
                  backdrop-filter: blur(16px);
                  -webkit-backdrop-filter: blur(16px);
                }
                /* Frosted Accent Glass Right Section */
                .glass-section-right {
                  background: linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(20, 26, 40, 0.6) 100%);
                  backdrop-filter: blur(20px);
                  -webkit-backdrop-filter: blur(20px);
                  border-left: 1px solid rgba(255, 255, 255, 0.08);
                  box-shadow: inset 1px 1px 0 0 rgba(255, 255, 255, 0.1);
                }
                /* Glass Input Styling */
                .glass-input {
                  background: rgba(0, 0, 0, 0.35);
                  backdrop-filter: blur(10px);
                  -webkit-backdrop-filter: blur(10px);
                  border: 1px solid rgba(255, 255, 255, 0.08);
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
                }
                .glass-input:focus-within, .glass-input:focus {
                  border-color: rgba(245, 158, 11, 0.6);
                  background: rgba(0, 0, 0, 0.55);
                  box-shadow: 
                    0 0 20px rgba(245, 158, 11, 0.2),
                    inset 0 1px 1px rgba(255, 255, 255, 0.1);
                }
                /* Buttons */
                .gold-button {
                  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                  color: #05080e;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  box-shadow: 0 8px 25px -5px rgba(245, 158, 11, 0.4);
                }
                .gold-button:hover {
                  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                  box-shadow: 0 0 30px rgba(245, 158, 11, 0.6);
                  transform: translateY(-1px);
                }
                .gold-outline-button {
                  border: 1px solid rgba(245, 158, 11, 0.5);
                  color: #fef3c7;
                  background: rgba(245, 158, 11, 0.05);
                  backdrop-filter: blur(8px);
                  transition: all 0.3s ease;
                }
                .gold-outline-button:hover {
                  border-color: rgba(245, 158, 11, 0.9);
                  background: rgba(245, 158, 11, 0.18);
                  box-shadow: 0 0 25px rgba(245, 158, 11, 0.25);
                  transform: translateY(-1px);
                }
                ::-webkit-calendar-picker-indicator {
                  filter: invert(1);
                  cursor: pointer;
                }
            `}</style>

            <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 lg:p-10 bg-obsidian-deep">
                
                {/* VIBRANT GLOW ORBS BEHIND THE GLASS (Crucial for Glassmorphism depth) */}
                <div className="absolute top-[12%] left-[15%] w-80 h-80 bg-amber-500/25 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
                <div className="absolute bottom-[10%] right-[15%] w-96 h-96 bg-amber-600/20 rounded-full blur-[140px] pointer-events-none"></div>
                <div className="absolute top-[40%] right-[35%] w-64 h-64 bg-orange-500/15 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="w-full max-w-[1280px] glass-card-hero rounded-[36px] overflow-hidden relative z-10 flex flex-col">
                    
                    {/* Header Banner */}
                    <div className="px-8 lg:px-12 pt-7 pb-4 border-b border-white/10 flex items-center justify-between bg-black/20 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-300/30">
                                <iconify-icon icon="lucide:brain-circuit" class="text-slate-950 text-2xl font-bold"></iconify-icon>
                            </div>
                            <span className="text-amber-100 font-display font-semibold text-xl tracking-tight">HirePulse</span>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">© 2026 HirePulse Inc.</span>
                    </div>

                    {/* Equal 50/50 Grid Container */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 relative">
                        
                        {/* Glowing Glass Divider for Desktop */}
                        <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 z-20 flex-col items-center justify-center pointer-events-none">
                            <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-amber-400/30 to-transparent"></div>
                            <div className="my-auto py-2 px-3 rounded-full bg-[#0a0e17]/80 backdrop-blur-xl border border-amber-400/40 text-[10px] font-bold tracking-widest uppercase text-amber-400 shadow-2xl shadow-amber-500/20">
                                OR
                            </div>
                            <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-amber-400/30 to-transparent"></div>
                        </div>

                        {/* LEFT SIDE: SIGN IN */}
                        <div className="p-8 lg:p-12 flex flex-col justify-between glass-section-left">
                            <div>
                                <div className="mb-6">
                                    <span className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1 block">Returning User</span>
                                    <h2 className="text-3xl font-display font-bold text-white tracking-tight">Sign In</h2>
                                    <p className="text-slate-400 text-sm mt-1">Access your saved jobs and AI dashboard</p>
                                </div>

                                <form onSubmit={handleLoginSubmit} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-300 ml-1">Email Address</label>
                                        <div className="relative flex items-center group">
                                            <span className="absolute left-4 text-slate-400 group-focus-within:text-amber-400 transition-colors">
                                                <iconify-icon icon="lucide:mail" class="text-lg"></iconify-icon>
                                            </span>
                                            <input 
                                                type="email" 
                                                value={loginForm.email}
                                                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                                                placeholder="name@company.com" 
                                                className="w-full glass-input rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-slate-500 text-sm outline-none" 
                                                required 
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-300 ml-1">Password</label>
                                        <div className="relative flex items-center group">
                                            <span className="absolute left-4 text-slate-400 group-focus-within:text-amber-400 transition-colors">
                                                <iconify-icon icon="lucide:lock" class="text-lg"></iconify-icon>
                                            </span>
                                            <input 
                                                type={showLoginPassword ? "text" : "password"} 
                                                value={loginForm.password}
                                                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                                                placeholder="••••••••" 
                                                className="w-full glass-input rounded-xl py-3.5 pl-11 pr-11 text-white placeholder-slate-500 text-sm outline-none" 
                                                required 
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => setShowLoginPassword(!showLoginPassword)} 
                                                className="absolute right-4 text-slate-400 hover:text-amber-300 transition-colors"
                                            >
                                                <iconify-icon icon={showLoginPassword ? "lucide:eye-off" : "lucide:eye"} class="text-lg"></iconify-icon>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between px-1 pt-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-black/40 text-amber-500 focus:ring-0 cursor-pointer" />
                                            <span className="text-xs text-slate-400">Remember me</span>
                                        </label>
                                        <a href="#" className="text-xs text-amber-400 hover:underline">Forgot password?</a>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={loginLoading} 
                                        className="w-full gold-outline-button font-bold py-3.5 rounded-xl transition-all text-sm mt-3 disabled:opacity-50 cursor-pointer"
                                    >
                                        {loginLoading ? 'Signing In...' : 'Sign In'}
                                    </button>
                                </form>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/10">
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Need help signing in? Contact our <a href="#" className="text-amber-400 hover:underline">support team</a> for assistance.
                                </p>
                            </div>
                        </div>

                        {/* RIGHT SIDE: CREATE ACCOUNT */}
                        <div className="p-8 lg:p-12 flex flex-col justify-between glass-section-right border-t lg:border-t-0 relative">
                            <div className="relative z-10">
                                <div className="mb-6">
                                    <span className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1 block">New Member</span>
                                    <h2 className="text-3xl font-display font-bold text-white tracking-tight">Create Account</h2>
                                    <p className="text-slate-300 text-sm mt-1">Join 2,000+ candidates landing dream jobs with AI</p>
                                </div>

                                <form onSubmit={handleSignupSubmit} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-200 ml-1">Full Name</label>
                                        <div className="relative flex items-center group">
                                            <span className="absolute left-4 text-slate-400 group-focus-within:text-amber-400 transition-colors">
                                                <iconify-icon icon="lucide:user" class="text-lg"></iconify-icon>
                                            </span>
                                            <input 
                                                type="text" 
                                                value={signupForm.name}
                                                onChange={(e) => setSignupForm({...signupForm, name: e.target.value})}
                                                placeholder="Jane Doe" 
                                                className="w-full glass-input rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 text-sm outline-none" 
                                                required 
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-200 ml-1">Email Address</label>
                                        <div className="relative flex items-center group">
                                            <span className="absolute left-4 text-slate-400 group-focus-within:text-amber-400 transition-colors">
                                                <iconify-icon icon="lucide:mail" class="text-lg"></iconify-icon>
                                            </span>
                                            <input 
                                                type="email" 
                                                value={signupForm.email}
                                                onChange={(e) => setSignupForm({...signupForm, email: e.target.value})}
                                                placeholder="jane@example.com" 
                                                className="w-full glass-input rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 text-sm outline-none" 
                                                required 
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-200 ml-1">Date of Birth</label>
                                            <div className="relative flex items-center group">
                                                <input 
                                                    type="date" 
                                                    value={signupForm.dob}
                                                    onChange={(e) => setSignupForm({...signupForm, dob: e.target.value})}
                                                    className="w-full glass-input rounded-xl py-3 px-3 text-white text-xs outline-none [color-scheme:dark]" 
                                                    required 
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-200 ml-1">Gender</label>
                                            <div className="relative flex items-center">
                                                <select 
                                                    value={signupForm.gender}
                                                    onChange={(e) => setSignupForm({...signupForm, gender: e.target.value})}
                                                    className="w-full glass-input rounded-xl py-3 px-3 text-white text-xs outline-none appearance-none cursor-pointer" 
                                                    required
                                                >
                                                    <option value="" disabled className="bg-slate-900 text-white">Select</option>
                                                    <option value="male" className="bg-slate-900 text-white">Male</option>
                                                    <option value="female" className="bg-slate-900 text-white">Female</option>
                                                    <option value="other" className="bg-slate-900 text-white">Other</option>
                                                    <option value="prefer-not-to-say" className="bg-slate-900 text-white">Prefer not to say</option>
                                                </select>
                                                <span className="absolute right-3 text-slate-400 pointer-events-none">
                                                    <iconify-icon icon="lucide:chevron-down" class="text-sm"></iconify-icon>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-200 ml-1">Password</label>
                                        <div className="relative flex items-center group">
                                            <span className="absolute left-4 text-slate-400 group-focus-within:text-amber-400 transition-colors">
                                                <iconify-icon icon="lucide:lock" class="text-lg"></iconify-icon>
                                            </span>
                                            <input 
                                                type={showSignupPassword ? "text" : "password"}
                                                value={signupForm.password}
                                                onChange={(e) => setSignupForm({...signupForm, password: e.target.value})}
                                                placeholder="••••••••" 
                                                className="w-full glass-input rounded-xl py-3 pl-11 pr-11 text-white placeholder-slate-500 text-sm outline-none" 
                                                required 
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => setShowSignupPassword(!showSignupPassword)} 
                                                className="absolute right-4 text-slate-400 hover:text-amber-300 transition-colors"
                                            >
                                                <iconify-icon icon={showSignupPassword ? "lucide:eye-off" : "lucide:eye"} class="text-lg"></iconify-icon>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2.5 pt-1 px-1">
                                        <input type="checkbox" id="terms" className="mt-0.5 w-4 h-4 rounded border-white/20 bg-black/40 text-amber-500 focus:ring-0 cursor-pointer" required />
                                        <label htmlFor="terms" className="text-xs text-slate-300 leading-tight cursor-pointer">
                                            I agree to the <a href="#" className="text-amber-400 hover:underline">Terms of Service</a> and <a href="#" className="text-amber-400 hover:underline">Privacy Policy</a>
                                        </label>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={signupLoading} 
                                        className="w-full gold-button font-bold py-3.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
                                    >
                                        {signupLoading ? 'Creating Account...' : 'Get Started Now'} <iconify-icon icon="lucide:arrow-right"></iconify-icon>
                                    </button>
                                </form>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}