import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, FileCheck2, BrainCircuit, Search, ArrowRight, Sparkles,
  Briefcase, Target, TrendingUp, Zap, BookOpen, Clock, CheckCircle2,
  AlertCircle, ChevronRight, FileText, Award, MessageSquare
} from 'lucide-react';
import { getAuthHeaders, hasValidToken } from '../lib/auth';

import { API_BASE, safeFetchJson } from '../lib/apiConfig';

async function apiRequest(path) {
  return safeFetchJson(`${API_BASE}${path}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
  });
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

function StatCard({ icon: Icon, label, value, sub, color = 'indigo', delay = 0 }) {
  const themes = {
    indigo: {
      border: 'hover:border-indigo-500/30',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-indigo-500/10',
      badge: 'text-indigo-400',
    },
    emerald: {
      border: 'hover:border-emerald-500/30',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/10',
      badge: 'text-emerald-400',
    },
    amber: {
      border: 'hover:border-amber-500/30',
      iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-amber-500/10',
      badge: 'text-amber-400',
    },
    blue: {
      border: 'hover:border-blue-500/30',
      iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-blue-500/10',
      badge: 'text-blue-400',
    },
  };

  const currentTheme = themes[color];

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={{ delay, duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 transition-all duration-300 ${currentTheme.border} hover:shadow-lg hover:shadow-black/40 group`}
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border shadow-inner transition-transform duration-300 group-hover:scale-110 ${currentTheme.iconBg}`}>
          <Icon className="h-5.5 w-5.5" />
        </div>
      </div>
      <div className="mt-4 text-3xl font-extrabold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-sm font-semibold text-slate-300">{label}</div>
      {sub && <div className="mt-1 text-xs text-slate-400 font-medium">{sub}</div>}
    </motion.div>
  );
}

function QuickAction({ icon: Icon, label, desc, to, gradient }) {
  return (
    <Link to={to} className="h-full block">
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-800/60 to-slate-900/80 backdrop-blur-md p-5 transition-all duration-300 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 h-full flex flex-col justify-between"
      >
        <div>
          <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg shadow-indigo-950/50 group-hover:scale-105 transition-transform duration-300`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors duration-200">{label}</div>
          <div className="mt-1 text-xs text-slate-400 leading-relaxed font-medium">{desc}</div>
        </div>
        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
          <span>Explore</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      </motion.div>
    </Link>
  );
}

function scoreBadge(score) {
  if (score >= 70) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10';
  if (score >= 40) return 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/10';
  return 'bg-red-500/10 text-red-400 border-red-500/30 shadow-red-500/10';
}

function statusBadge(status) {
  if (status === 'complete') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (status === 'processing') return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse';
  if (status === 'failed') return 'bg-red-500/10 text-red-400 border-red-500/20';
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
}

// Landing page shown to unauthenticated users
function LandingPage() {
  return (
    <div className="min-h-screen px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-12">
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 px-6 py-16 sm:px-12 sm:py-24 shadow-2xl"
        >
          <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/25 blur-[130px]" />
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-600/15 blur-[130px]" />
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300 shadow-inner"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              AI-Powered Job Assistant
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Land your next{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">dream role</span>
              {' '}with AI precision.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-5 text-base text-slate-300 sm:text-lg leading-relaxed"
            >
              Search live jobs, analyze your resume against real requirements, practice mock interviews with AI feedback, and tailor your applications — all in one place.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-8 flex flex-wrap justify-center gap-4"
            >
              <Link
                to="/login"
                className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-7 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:from-indigo-500 hover:to-blue-500 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        </motion.section>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Zap, title: 'AI Resume Matching', desc: 'Get an ATS score and see exactly which keywords your resume is missing.', gradient: 'from-indigo-600 to-blue-600' },
            { icon: MessageSquare, title: 'Mock Interviews', desc: 'Practice with AI-generated questions and get real-time feedback on your answers.', gradient: 'from-purple-600 to-pink-600' },
            { icon: Target, title: 'Skill Gap Analysis', desc: 'Know exactly where you stand vs. the job requirements before you apply.', gradient: 'from-emerald-600 to-teal-600' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 hover:border-white/20 transition-all duration-300"
            >
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-lg shadow-indigo-950/40`}>
                <item.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed font-medium">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Dashboard shown to authenticated users
function Dashboard() {
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const selectedJob = (() => { try { return JSON.parse(localStorage.getItem('jobai-selected-job') || 'null'); } catch { return null; } })();
  const resumeText = localStorage.getItem('jobai-resume-text') || '';

  const [analyses, setAnalyses] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest('/analysis').then(d => setAnalyses(d.analyses || [])).catch(() => { }),
      apiRequest('/saved-jobs').then(d => setSavedJobs(d.savedJobs || [])).catch(() => { }),
    ]).finally(() => setLoading(false));
  }, []);

  const completeAnalyses = analyses.filter(a => a.status === 'complete');
  const avgAts = completeAnalyses.length
    ? Math.round(completeAnalyses.reduce((s, a) => s + (a.atsScore?.atsPercentage || 0), 0) / completeAnalyses.length)
    : null;
  const bestAts = completeAnalyses.length
    ? Math.max(...completeAnalyses.map(a => a.atsScore?.atsPercentage || 0))
    : null;
  const recentAnalyses = analyses.slice(0, 5);

  const greeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* ── Welcome Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 backdrop-blur-xl px-6 py-8 sm:px-10 shadow-2xl"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-[110px]" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-blue-600/10 blur-[110px]" />

          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-[0.25em] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {greeting()}
              </div>
              <h1 className="mt-1 text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                {user.name ? `${user.name.split(' ')[0]}'s Dashboard` : 'Your Dashboard'}
              </h1>
              <p className="mt-2 text-sm text-slate-400 font-medium max-w-xl">
                {selectedJob
                  ? <>Currently targeting: <span className="text-white font-semibold">{selectedJob.title}</span> at <span className="text-indigo-300 font-semibold">{selectedJob.company}</span></>
                  : 'No job selected yet — start by finding a role to unlock tailored insights.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                to="/search"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 active:scale-95"
              >
                <Search className="h-4 w-4" /> Find Jobs
              </Link>
              {resumeText && (
                <Link
                  to="/resume"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/50 hover:bg-slate-800 px-5 py-2.5 text-sm font-bold text-slate-200 hover:border-white/20 hover:text-white transition-all duration-200 backdrop-blur-md active:scale-95"
                >
                  <FileCheck2 className="h-4 w-4 text-indigo-400" /> Analyze Resume
                </Link>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Stats Row ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={BarChart3} label="Analyses Run" value={analyses.length} sub={`${completeAnalyses.length} completed`} color="indigo" delay={0.05} />
          <StatCard icon={Target} label="Avg ATS Score" value={avgAts != null ? `${avgAts}%` : '—'} sub={bestAts != null ? `Best: ${bestAts}%` : 'Run an analysis first'} color="emerald" delay={0.1} />
          <StatCard icon={Briefcase} label="Saved Jobs" value={savedJobs.length} sub="bookmarked roles" color="amber" delay={0.15} />
          <StatCard icon={FileText} label="Resume Words" value={resumeText.trim() ? resumeText.trim().split(/\s+/).length : '—'} sub={resumeText ? 'resume loaded' : 'no resume yet'} color="blue" delay={0.2} />
        </div>

        {/* ── Quick Actions + Recent Analyses ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">

          {/* Quick Actions */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.25 }}>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-indigo-400" />
              Quick Actions
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <QuickAction icon={Search} label="Find Jobs" desc="Search thousands of live listings from top platforms" to="/search" gradient="from-indigo-600 to-blue-600" />
              <QuickAction icon={FileCheck2} label="Resume & ATS" desc="Get ATS score, tailored resume & cover letter" to="/resume" gradient="from-violet-600 to-purple-600" />
              <QuickAction icon={BarChart3} label="AI Analysis" desc="Deep skill gap & semantic match analysis" to="/analysis" gradient="from-emerald-600 to-teal-600" />
              <QuickAction icon={BrainCircuit} label="Mock Interview" desc="Practice with AI questions and get scored" to="/interview" gradient="from-amber-600 to-orange-600" />
            </div>
          </motion.div>

          {/* Recent Analyses */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.3 }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-400" />
                Recent Analyses
              </div>
              {analyses.length > 0 && (
                <Link to="/analysis" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-12 text-center backdrop-blur-md">
                <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </div>
            ) : recentAnalyses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-12 text-center backdrop-blur-md">
                <BarChart3 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">No analyses performed yet.</p>
                <p className="text-xs text-slate-500 mt-1">Select a job target and match your resume to get instant feedback.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAnalyses.map((a) => {
                  const ats = a.atsScore?.atsPercentage;
                  return (
                    <motion.div
                      key={a._id}
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-4 transition-all duration-200 hover:border-white/20 hover:bg-slate-800/60 hover:shadow-lg"
                    >
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold border ${ats != null ? scoreBadge(ats) : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        {ats != null ? `${ats}%` : '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white truncate">{a.job?.title || 'Untitled Role'}</div>
                        <div className="text-xs text-slate-400 truncate mt-0.5 font-medium">{a.job?.company || '—'} · {new Date(a.createdAt).toLocaleDateString()}</div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusBadge(a.status)}`}>
                        {a.status}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Score Progress (if analyses exist) ── */}
        {completeAnalyses.length > 1 && (
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.35 }}>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              ATS Score Trend
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6">
              <div className="flex items-end gap-3 h-28 pt-4">
                {completeAnalyses.slice(-10).map((a) => {
                  const score = a.atsScore?.atsPercentage || 0;
                  const barColor = score >= 70 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : score >= 40 ? 'bg-gradient-to-t from-amber-600 to-amber-400' : 'bg-gradient-to-t from-red-600 to-red-400';
                  return (
                    <div key={a._id} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <div className="text-xs font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200">{score}%</div>
                      <div
                        className={`w-full rounded-t-lg ${barColor} transition-all duration-300 group-hover:brightness-125 shadow-lg`}
                        style={{ height: `${Math.max(score, 6)}%` }}
                        title={`${a.job?.title} — ${score}%`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex justify-between text-xs font-semibold text-slate-500 border-t border-white/5 pt-2">
                <span>Oldest</span>
                <span>Most Recent</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Status summary ── */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.4 }}
          className="grid gap-4 sm:grid-cols-3"
        >
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                <span className="text-sm font-bold text-white">Resume Status</span>
              </div>
              <div className={`text-xs font-medium ${resumeText ? 'text-emerald-400' : 'text-slate-400'}`}>
                {resumeText ? `✓ Loaded · ${resumeText.trim().split(/\s+/).length} words` : 'Not uploaded yet'}
              </div>
            </div>
            <Link to="/resume" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
              {resumeText ? 'Update Resume →' : 'Upload Resume →'}
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <Briefcase className="h-4.5 w-4.5 text-amber-400" />
                <span className="text-sm font-bold text-white">Target Job</span>
              </div>
              <div className={`text-xs font-medium truncate ${selectedJob ? 'text-slate-200' : 'text-slate-400'}`}>
                {selectedJob ? `${selectedJob.title} · ${selectedJob.company}` : 'No job selected'}
              </div>
            </div>
            <Link to="/search" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
              {selectedJob ? 'Change Target →' : 'Find Target Job →'}
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <Award className="h-4.5 w-4.5 text-indigo-400" />
                <span className="text-sm font-bold text-white">Interview Ready?</span>
              </div>
              <div className={`text-xs font-medium ${avgAts != null && avgAts >= 60 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {avgAts != null
                  ? avgAts >= 60 ? `✓ ATS avg ${avgAts}% — looking strong!` : `ATS avg ${avgAts}% — needs work`
                  : 'Run an analysis first'}
              </div>
            </div>
            <Link to="/interview" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
              Practice Interview →
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

export default function HomePage() {
  const isLoggedIn = hasValidToken();
  if (isLoggedIn) return <Dashboard />;
  return <LandingPage />;
}