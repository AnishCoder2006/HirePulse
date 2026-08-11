import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { fetchSavedJobs, fetchSavedJobStats, updateSavedJob, unsaveJob } from '../lib/savedJobsApi';
import {
  Bookmark,
  Clock,
  DollarSign,
  Building2,
  Trash2,
  BrainCircuit,
  MessageSquare,
  ExternalLink,
  AlertCircle,
  Loader2,
  CheckCircle2,
  CalendarClock,
  StickyNote,
  TrendingUp,
  Send,
  Users,
  Award,
  ChevronDown,
  Sparkles,
  MapPin,
  Filter
} from 'lucide-react';

const STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected'];

const STATUS_META = {
  saved: { label: 'Saved', color: 'text-slate-400', bg: 'bg-slate-500/10 ring-slate-500/20', dot: 'bg-slate-400' },
  applied: { label: 'Applied', color: 'text-blue-400', bg: 'bg-blue-500/10 ring-blue-500/20', dot: 'bg-blue-400' },
  interview: { label: 'Interview', color: 'text-indigo-400', bg: 'bg-indigo-500/10 ring-indigo-500/20', dot: 'bg-indigo-400' },
  offer: { label: 'Offer', color: 'text-emerald-400', bg: 'bg-emerald-500/10 ring-emerald-500/20', dot: 'bg-emerald-400' },
  rejected: { label: 'Rejected', color: 'text-rose-400', bg: 'bg-rose-500/10 ring-rose-500/20', dot: 'bg-rose-400' }
};

function formatSalary(min, max) {
  if (!min && !max) return null;
  const fmt = (v) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v}`;
  };
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max)}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
    red: 'bg-rose-500/10 text-rose-400 ring-rose-500/20',
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl transition-all duration-200 hover:border-white/20 hover:scale-[1.01]">
      <div className="flex items-center justify-between">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${colors[color]}`}>
          <Icon className="h-5.5 w-5.5" />
        </div>
        <span className="text-2xl font-black text-white tracking-tight">{value}</span>
      </div>
      <div className="mt-4">
        <div className="text-sm font-bold text-slate-200">{label}</div>
        {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
      </div>
    </div>
  );
}

function ConversionBar({ label, value, color }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-400">{label}</span>
        <span className={`text-sm font-bold ${color}`}>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-900 overflow-hidden border border-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color.replace('text-', 'bg-')}`}
        />
      </div>
    </div>
  );
}

export default function SavedJobsPage() {
  const navigate = useNavigate();
  const [savedJobs, setSavedJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedNotes, setExpandedNotes] = useState({});
  const [notesDrafts, setNotesDrafts] = useState({});
  const [savingNotes, setSavingNotes] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const [jobs, statsData] = await Promise.all([fetchSavedJobs(), fetchSavedJobStats()]);
        setSavedJobs(jobs);
        setStats(statsData);
      } catch (err) {
        toast.error('Could not load saved jobs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const removeJob = async (job) => {
    setSavedJobs(prev => prev.filter(j => j.sourceId !== job.sourceId));
    try {
      await unsaveJob(job.sourceId);
      const statsData = await fetchSavedJobStats();
      setStats(statsData);
    } catch (err) {
      setSavedJobs(prev => [...prev, job]);
      toast.error('Could not remove saved job');
    }
  };

  const analyzeJob = (job) => {
    localStorage.setItem('jobai-selected-job', JSON.stringify(job));
    navigate('/analysis');
  };

  const prepareInterview = (job) => {
    localStorage.setItem('jobai-selected-job', JSON.stringify(job));
    navigate('/interview');
  };

  const clearAll = async () => {
    const jobs = [...savedJobs];
    setSavedJobs([]);
    try {
      await Promise.all(jobs.map(job => unsaveJob(job.sourceId)));
      const statsData = await fetchSavedJobStats();
      setStats(statsData);
    } catch (err) {
      setSavedJobs(jobs);
      toast.error('Could not clear saved jobs');
    }
  };

  const changeStatus = async (job, status) => {
    if (job.status === status) return;
    const prev = job.status;
    setSavedJobs(prevJobs => prevJobs.map(j => j._id === job._id ? { ...j, status } : j));
    try {
      const updated = await updateSavedJob(job._id, { status });
      setSavedJobs(prevJobs => prevJobs.map(j => j._id === job._id ? updated : j));
      const statsData = await fetchSavedJobStats();
      setStats(statsData);
      toast.success(`Marked as ${STATUS_META[status].label}`);
    } catch (err) {
      setSavedJobs(prevJobs => prevJobs.map(j => j._id === job._id ? { ...j, status: prev } : j));
      toast.error(err.message || 'Could not update status');
    }
  };

  const toggleNotes = (job) => {
    setExpandedNotes(prev => ({ ...prev, [job._id]: !prev[job._id] }));
    if (!expandedNotes[job._id]) {
      setNotesDrafts(prev => ({ ...prev, [job._id]: job.notes || '' }));
    }
  };

  const saveNotes = async (job) => {
    const draft = notesDrafts[job._id] || '';
    setSavingNotes(prev => ({ ...prev, [job._id]: true }));
    try {
      const updated = await updateSavedJob(job._id, { notes: draft });
      setSavedJobs(prevJobs => prevJobs.map(j => j._id === job._id ? updated : j));
      setExpandedNotes(prev => ({ ...prev, [job._id]: false }));
      toast.success('Notes saved');
    } catch (err) {
      toast.error(err.message || 'Could not save notes');
    } finally {
      setSavingNotes(prev => ({ ...prev, [job._id]: false }));
    }
  };

  const filteredJobs = statusFilter === 'all'
    ? savedJobs
    : savedJobs.filter(j => j.status === statusFilter);

  const counts = stats?.counts || {};
  const conversions = stats?.conversions || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* ───── Header Banner ───── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl"
        >
          <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/0 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 h-48 w-48 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                <Bookmark className="w-3.5 h-3.5" /> Application Pipeline
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Jobs you've saved{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-teal-300 bg-clip-text text-transparent">
                  for later
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                {savedJobs.length} {savedJobs.length === 1 ? 'role' : 'roles'} in your pipeline. Track application progress, add notes, and kick off AI tailoring or interview prep with one click.
              </p>
            </div>

            {savedJobs.length > 0 && (
              <button
                onClick={clearAll}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition duration-200 self-start md:self-auto"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>
        </motion.div>

        {/* ───── Stats & Conversion Dashboard ───── */}
        {!loading && savedJobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Bookmark} label="Saved" value={counts.saved ?? 0} sub="bookmarked roles" color="indigo" />
              <StatCard icon={Send} label="Applied" value={counts.applied ?? 0} sub="applications sent" color="blue" />
              <StatCard icon={Users} label="Interviews" value={counts.interview ?? 0} sub="in interview stage" color="amber" />
              <StatCard icon={Award} label="Offers" value={counts.offer ?? 0} sub={`${counts.rejected ?? 0} rejected`} color="emerald" />
            </div>

            {/* Conversion rates */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Pipeline Conversion Funnel
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <ConversionBar label="Saved → Applied" value={conversions.savedToApplied ?? 0} color="text-blue-400" />
                <ConversionBar label="Applied → Interview" value={conversions.appliedToInterview ?? 0} color="text-indigo-400" />
                <ConversionBar label="Interview → Offer" value={conversions.interviewToOffer ?? 0} color="text-emerald-400" />
              </div>
            </div>
          </motion.div>
        )}

        {/* ───── Status Filter Pills ───── */}
        {!loading && savedJobs.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-indigo-400'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/10 hover:border-white/20'
              }`}
            >
              All ({savedJobs.length})
            </button>
            {STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all shrink-0 ${
                  statusFilter === status
                    ? `${STATUS_META[status].bg} ${STATUS_META[status].color} ring-1`
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/10 hover:border-white/20'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`} />
                {STATUS_META[status].label} ({counts[status] ?? 0})
              </button>
            ))}
          </div>
        )}

        {/* ───── Loading State ───── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <span className="text-sm font-medium text-slate-400">Fetching saved applications...</span>
          </div>
        )}

        {/* ───── Empty State (No saved jobs at all) ───── */}
        {!loading && savedJobs.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-900/30 p-12 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 border border-white/5 mb-4 text-slate-500">
              <Bookmark className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">No saved jobs yet</h3>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Explore the <strong className="text-indigo-400 font-semibold">Find Jobs</strong> tab and click the bookmark icon on roles you like. They will show up here for status tracking and AI preparation.
            </p>
          </motion.div>
        )}

        {/* ───── Empty Filter State ───── */}
        {!loading && savedJobs.length > 0 && filteredJobs.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-900/30 p-12 text-center"
          >
            <AlertCircle className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No jobs in {STATUS_META[statusFilter].label}</h3>
            <p className="text-sm text-slate-400 max-w-md">
              Update any job's status selector to move it into this filter stage.
            </p>
          </motion.div>
        )}

        {/* ───── Saved Jobs List ───── */}
        {!loading && filteredJobs.length > 0 && (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {filteredJobs.map((job, index) => (
                <motion.div
                  key={job._id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: -20 }}
                  transition={{ delay: index * 0.03, duration: 0.25 }}
                  className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl transition-all duration-200 hover:border-white/20 hover:bg-slate-900/80"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    
                    {/* Job Details */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 text-indigo-400 border border-white/10 shadow-inner">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-white truncate">{job.title}</h3>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_META[job.status]?.bg} ${STATUS_META[job.status]?.color}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[job.status]?.dot}`} />
                            {STATUS_META[job.status]?.label}
                          </span>
                        </div>
                        
                        <p className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
                          <span>{job.company}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500"><MapPin className="w-3 h-3" /> {job.location}</span>
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-500">
                          {formatSalary(job.salaryMin, job.salaryMax) && (
                            <span className="flex items-center gap-1 font-semibold text-emerald-400">
                              <DollarSign className="h-3.5 w-3.5" />
                              {formatSalary(job.salaryMin, job.salaryMax)}
                            </span>
                          )}
                          {timeAgo(job.postedAt) && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Posted {timeAgo(job.postedAt)}
                            </span>
                          )}
                          {job.statusUpdatedAt && (
                            <span className="flex items-center gap-1">
                              <CalendarClock className="h-3.5 w-3.5" />
                              Updated {formatDate(job.statusUpdatedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* AI & Quick Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                      <button
                        onClick={() => analyzeJob(job)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:from-indigo-500 hover:to-blue-500 transition shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
                        title="Analyze with AI"
                      >
                        <BrainCircuit className="w-4 h-4" />
                        Analyze
                      </button>
                      
                      <button
                        onClick={() => prepareInterview(job)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-white/20 hover:text-white hover:bg-white/10 transition active:scale-[0.98]"
                        title="Prepare interview"
                      >
                        <MessageSquare className="w-4 h-4 text-indigo-400" />
                        Interview
                      </button>

                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/10 transition"
                          title="Open original posting"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      <button
                        onClick={() => removeJob(job)}
                        className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition"
                        title="Remove from saved"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                  {/* ───── Tracker Controls Row ───── */}
                  <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                    
                    {/* Status Pill Selector */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">Stage:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {STATUSES.map((status) => (
                          <button
                            key={status}
                            onClick={() => changeStatus(job, status)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                              job.status === status
                                ? `${STATUS_META[status].bg} ${STATUS_META[status].color} ring-1`
                                : 'bg-slate-950/60 text-slate-500 hover:text-slate-300 border border-white/5'
                            }`}
                          >
                            {job.status === status && <CheckCircle2 className="w-3 h-3" />}
                            {STATUS_META[status].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes Toggle Button */}
                    <button
                      onClick={() => toggleNotes(job)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        expandedNotes[job._id]
                          ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                          : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-white/5'
                      }`}
                    >
                      <StickyNote className="w-3.5 h-3.5 text-indigo-400" />
                      {job.notes ? 'Edit Notes' : 'Add Notes'}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedNotes[job._id] ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* ───── Notes Drawer ───── */}
                  <AnimatePresence>
                    {expandedNotes[job._id] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/80 p-4 space-y-3">
                          <textarea
                            value={notesDrafts[job._id] || ''}
                            onChange={(e) => setNotesDrafts(prev => ({ ...prev, [job._id]: e.target.value }))}
                            rows={3}
                            placeholder="Add notes about recruiter contacts, follow-up dates, application details..."
                            className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-600 resize-none shadow-inner"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setExpandedNotes(prev => ({ ...prev, [job._id]: false }))}
                              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveNotes(job)}
                              disabled={savingNotes[job._id]}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-xs font-semibold text-white hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 transition shadow-lg shadow-indigo-600/25"
                            >
                              {savingNotes[job._id] ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                              ) : (
                                <><CheckCircle2 className="w-3.5 h-3.5" /> Save Notes</>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
}