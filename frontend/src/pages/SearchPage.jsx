import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { getAuthHeaders } from '../lib/auth';
import { fetchSavedJobs, saveJob, unsaveJob, importJobFromUrl } from '../lib/savedJobsApi';
import {
  Bookmark,
  Briefcase,
  MapPin,
  Search,
  Clock,
  DollarSign,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Building2,
  Share2,
  Filter,
  X,
  Loader2,
  AlertCircle,
  BrainCircuit,
  Link2,
  CheckCircle2
} from 'lucide-react';

import { API_BASE, safeFetchJson } from '../lib/apiConfig';

async function apiGet(path) {
  return safeFetchJson(`${API_BASE}${path}`, {
    cache: 'no-store',
    headers: getAuthHeaders()
  });
}

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

function getMatchScore(job, resumeText) {
  if (!resumeText) return null;
  const text = resumeText.toLowerCase();
  const keywords = (job.title + ' ' + (job.description || '')).toLowerCase();
  const skills = ['react', 'node', 'python', 'javascript', 'typescript', 'java', 'sql', 'aws', 'docker', 'kubernetes', 'mongodb', 'postgresql', 'git', 'rest', 'api', 'css', 'html', 'angular', 'vue', 'express', 'django', 'flask', 'graphql', 'redis', 'ci/cd', 'agile', 'scrum'];
  const matched = skills.filter(s => keywords.includes(s) && text.includes(s));
  const total = skills.filter(s => keywords.includes(s)).length;
  if (total === 0) return null;
  return Math.round((matched.length / total) * 100);
}

function getJobType(description) {
  if (!description) return null;
  const d = description.toLowerCase();
  if (d.includes('remote') || d.includes('work from home') || d.includes('wfh')) return 'Remote';
  if (d.includes('hybrid')) return 'Hybrid';
  if (d.includes('intern')) return 'Internship';
  if (d.includes('contract') || d.includes('freelance')) return 'Contract';
  return null;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/5 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-slate-800" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-slate-800" />
          <div className="h-3 w-1/2 rounded bg-slate-800" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full bg-slate-800" />
        <div className="h-6 w-20 rounded-full bg-slate-800" />
      </div>
    </div>
  );
}

const FILTER_OPTIONS = [
  { key: 'remote', label: 'Remote', icon: '🏠' },
  { key: 'hybrid', label: 'Hybrid', icon: '🔄' },
  { key: 'internship', label: 'Internship', icon: '🎓' },
  { key: 'contract', label: 'Contract', icon: '📄' },
];

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('React Developer');
  const [location, setLocation] = useState('Bangalore');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [searched, setSearched] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [jobUrl, setJobUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importedJob, setImportedJob] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  // Load the user's saved jobs from the server once on mount.
  useEffect(() => {
    (async () => {
      try {
        setSavedJobs(await fetchSavedJobs());
      } catch (err) {
        toast.error('Could not load saved jobs');
      }
    })();
  }, []);

  // Wrap search function in useCallback to avoid stale closures
  const runSearch = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    setActiveFilters([]);
    setImportedJob(null);
    try {
      const { jobs } = await apiGet(`/jobs/search?keyword=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`);
      setResults(jobs || []);
      setSelectedJob((jobs && jobs[0]) || null);
    } catch (err) {
      setError(err.message || 'Could not load jobs right now.');
      setResults([]);
      setSelectedJob(null);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [query, location, loading]);

  // Debounce search inputs for auto-complete/live filtering
  useEffect(() => {
    if (!isTyping) return;
    if (!query && !location) return;
    
    const timer = setTimeout(() => {
      runSearch();
      setIsTyping(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [query, location, isTyping, runSearch]);

  const resumeText = localStorage.getItem('jobai-resume-text') || '';

  const filteredResults = useMemo(() => {
    if (activeFilters.length === 0) return results;
    return results.filter(job => {
      const type = getJobType(job.description);
      return activeFilters.some(f => {
        if (f === 'remote') return type === 'Remote';
        if (f === 'hybrid') return type === 'Hybrid';
        if (f === 'internship') return type === 'Internship';
        if (f === 'contract') return type === 'Contract';
        return false;
      });
    });
  }, [results, activeFilters]);

  const toggleFilter = (key) => {
    setActiveFilters(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  const toggleSaveJob = async (job) => {
    const exists = savedJobs.some(j => j.sourceId === job.sourceId);
    setSavedJobs(prev =>
      exists ? prev.filter(j => j.sourceId !== job.sourceId) : [...prev, job]
    );
    try {
      if (exists) {
        await unsaveJob(job.sourceId);
      } else {
        await saveJob(job);
      }
    } catch (err) {
      setSavedJobs(prev =>
        exists ? [...prev, job] : prev.filter(j => j.sourceId !== job.sourceId)
      );
      toast.error(exists ? 'Could not remove saved job' : 'Could not save job');
    }
  };

  const isSaved = (job) => savedJobs.some(j => j.sourceId === job.sourceId);

  const handleApplyNow = () => {
    if (!selectedJob) return;
    localStorage.setItem('jobai-selected-job', JSON.stringify(selectedJob));
    if (selectedJob.url) window.open(selectedJob.url, '_blank', 'noopener,noreferrer');
    navigate('/analysis');
  };

  const handleImportUrl = async () => {
    if (importing) return;
    const url = jobUrl.trim();
    if (!url) {
      toast.error('Paste a job URL first');
      return;
    }
    
    try {
      new URL(url);
    } catch {
      toast.error('Please enter a valid URL (e.g., https://...)');
      return;
    }

    setImporting(true);
    setError('');
    try {
      const job = await importJobFromUrl(url);
      setImportedJob(job);
      setSelectedJob(job);
      setResults((prev) => {
        const without = prev.filter((j) => j.sourceId !== job.sourceId);
        return [job, ...without];
      });
      setSearched(true);
      toast.success('Job extracted from URL');
    } catch (err) {
      setError(err.message || 'Could not import that URL');
      toast.error(err.message || 'Could not import that URL');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Hero Search Section */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 px-6 py-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-indigo-400">
              <Search className="h-4 w-4" />
              Find your next role
            </div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Discover jobs that <span className="text-indigo-400">match your skills</span>
            </h1>
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3 backdrop-blur-sm">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <div className="flex items-center gap-3 rounded-xl bg-slate-900/70 px-4 py-3 ring-1 ring-white/10 transition focus-within:ring-indigo-500/50">
                  <Search className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setIsTyping(true);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
                    placeholder="Job title, skill, or keyword"
                  />
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-slate-900/70 px-4 py-3 ring-1 ring-white/10 transition focus-within:ring-indigo-500/50">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setIsTyping(true);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
                    placeholder="City or location"
                  />
                </div>
                <button
                  onClick={runSearch}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 shadow-lg shadow-indigo-600/25"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Searching…</>
                  ) : (
                    <><Search className="h-4 w-4" /> Search</>
                  )}
                </button>
              </div>
            </div>

            {/* Paste job URL */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <Link2 className="h-3.5 w-3.5 text-indigo-400" />
                Or paste any job URL
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="flex items-center gap-3 rounded-xl bg-slate-900/70 px-4 py-3 ring-1 ring-white/10 transition focus-within:ring-indigo-500/50">
                  <Link2 className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleImportUrl()}
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
                    placeholder="LinkedIn, Naukri, company careers page…"
                  />
                </div>
                <button
                  onClick={handleImportUrl}
                  disabled={importing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-6 py-3 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/20 hover:text-indigo-200 disabled:opacity-50"
                >
                  {importing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Extracting…</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Import job</>
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Works with LinkedIn, Naukri, Indeed, and most company career pages. We'll extract the description and run your full analysis flow on it.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Imported job banner */}
        <AnimatePresence>
          {importedJob && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-300 truncate">
                    Imported: {importedJob.title}
                    {importedJob.company ? ` · ${importedJob.company}` : ''}
                  </p>
                  <p className="text-xs text-emerald-400/70 truncate">{importedJob.url}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    localStorage.setItem('jobai-selected-job', JSON.stringify(importedJob));
                    navigate('/analysis');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:from-indigo-500 hover:to-blue-500 transition shadow-lg shadow-indigo-600/25"
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  Analyze
                </button>
                <button
                  onClick={async () => {
                    try {
                      await saveJob(importedJob);
                      setSavedJobs((prev) =>
                        prev.some((j) => j.sourceId === importedJob.sourceId)
                          ? prev
                          : [...prev, importedJob]
                      );
                      toast.success('Saved to tracker');
                    } catch (err) {
                      toast.error(err.message || 'Could not save job');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-white/20 hover:text-white transition"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty / initial states */}
        {!searched && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/30 px-6 py-16 text-center"
          >
            <Search className="h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Ready to find your next opportunity?</h3>
            <p className="text-sm text-slate-500 max-w-md">
              Enter a job title and location above to search thousands of live listings. Results will appear here with skill match insights.
            </p>
          </motion.div>
        )}

        {searched && results.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/30 px-6 py-16 text-center"
          >
            <AlertCircle className="h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No results found</h3>
            <p className="text-sm text-slate-500 max-w-md">
              Try a different keyword or location. You can also broaden your search terms for more results.
            </p>
          </motion.div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <>
            {/* Filter chips + result count */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-slate-400">
                <Filter className="h-4 w-4" />
                <span>Filters:</span>
              </div>
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => toggleFilter(opt.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${activeFilters.includes(opt.key)
                    ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-300 ring-1 ring-white/5'
                    }`}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                  {activeFilters.includes(opt.key) && (
                    <X className="h-3 w-3 ml-0.5" />
                  )}
                </button>
              ))}
              <div className="ml-auto text-xs text-slate-500">
                {filteredResults.length} of {results.length} jobs
              </div>
            </div>

            {/* Job list + detail panel */}
            <section className="grid gap-6 lg:grid-cols-12">
              {/* Job list */}
              <div className="space-y-3 lg:col-span-5">
                <AnimatePresence mode="popLayout">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
                  ) : (
                    filteredResults.map((job, index) => {
                      const matchScore = getMatchScore(job, resumeText);
                      const salary = formatSalary(job.salaryMin, job.salaryMax);
                      const posted = timeAgo(job.postedAt);
                      const jobType = getJobType(job.description);
                      const isActive = selectedJob?.sourceId === job.sourceId;

                      return (
                        <motion.button
                          key={job.sourceId}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.03, duration: 0.3 }}
                          onClick={() => setSelectedJob(job)}
                          className={`group relative w-full text-left rounded-2xl border p-5 transition-all duration-200 ${isActive
                            ? 'border-indigo-500/50 bg-indigo-500/10 shadow-lg shadow-indigo-500/5'
                            : 'border-white/5 bg-slate-900/60 hover:border-white/10 hover:bg-slate-900/80'
                            }`}
                        >
                          {/* Top row: icon + title + match */}
                          <div className="flex items-start gap-3">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                              }`}>
                              <Building2 className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h3 className="text-base font-bold text-white truncate">{job.title}</h3>
                                  <p className="text-sm text-slate-400 mt-0.5">{job.company}</p>
                                </div>
                                {matchScore !== null && (
                                  <div className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${matchScore >= 70 ? 'bg-emerald-500/15 text-emerald-400' :
                                    matchScore >= 40 ? 'bg-amber-500/15 text-amber-400' :
                                      'bg-red-500/15 text-red-400'
                                    }`}>
                                    <Sparkles className="h-3 w-3" />
                                    {matchScore}%
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {job.location}
                                </span>
                                {salary && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {salary}
                                  </span>
                                )}
                                {posted && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {posted}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Bottom tags + actions */}
                          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {jobType && (
                                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300 ring-1 ring-white/5">
                                  {jobType}
                                </span>
                              )}
                              {matchScore !== null && matchScore >= 70 && (
                                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-400">
                                  Great match
                                </span>
                              )}
                              {isSaved(job) && (
                                <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs text-indigo-400">
                                  Saved
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  localStorage.setItem('jobai-selected-job', JSON.stringify(job));
                                  navigate('/analysis');
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/5 px-2 py-1.5 text-xs text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition"
                                title="Analyze with AI"
                              >
                                <BrainCircuit className="h-3 w-3" />
                                Analyze
                              </button>
                              <button
                                onClick={() => toggleSaveJob(job)}
                                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs transition ${isSaved(job)
                                  ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10'
                                  : 'border-white/5 text-slate-500 hover:text-white hover:border-white/20'
                                  }`}
                                title={isSaved(job) ? 'Remove from saved' : 'Save for later'}
                              >
                                <Bookmark className={`h-3 w-3 ${isSaved(job) ? 'fill-current' : ''}`} />
                                {isSaved(job) ? 'Saved' : 'Later'}
                              </button>
                            </div>
                          </div>

                          {/* Active indicator */}
                          {isActive && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:block">
                              <ChevronRight className="h-5 w-5 text-indigo-400" />
                            </div>
                          )}
                        </motion.button>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>

              {/* Detail panel */}
              <div className="lg:col-span-7">
                <AnimatePresence mode="wait">
                  {selectedJob ? (
                    <motion.div
                      key={selectedJob.sourceId}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="sticky top-24 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-900/80 p-6 backdrop-blur-sm"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 text-indigo-400 ring-1 ring-white/10">
                            <Building2 className="h-7 w-7" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-white">{selectedJob.title}</h2>
                            <p className="text-base text-slate-400 mt-1">{selectedJob.company}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {selectedJob.location}
                              </span>
                              {formatSalary(selectedJob.salaryMin, selectedJob.salaryMax) && (
                                <span className="flex items-center gap-1.5">
                                  <DollarSign className="h-4 w-4" />
                                  {formatSalary(selectedJob.salaryMin, selectedJob.salaryMax)}
                                </span>
                              )}
                              {timeAgo(selectedJob.postedAt) && (
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-4 w-4" />
                                  {timeAgo(selectedJob.postedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => toggleSaveJob(selectedJob)}
                            className={`rounded-xl border p-2.5 transition ${isSaved(selectedJob)
                              ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'
                              : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                              }`}
                            title={isSaved(selectedJob) ? 'Unsave' : 'Save job'}
                          >
                            <Bookmark className={`h-4 w-4 ${isSaved(selectedJob) ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({ title: selectedJob.title, url: selectedJob.url });
                              } else {
                                navigator.clipboard.writeText(selectedJob.url || window.location.href);
                              }
                            }}
                            className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:text-white hover:border-white/20 transition"
                            title="Share"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Skill match section */}
                      {(() => {
                        const matchScore = getMatchScore(selectedJob, resumeText);
                        if (matchScore !== null) {
                          return (
                            <div className="mt-6 rounded-xl border border-white/5 bg-slate-950/60 p-5">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-indigo-400" />
                                  Skill match
                                </h4>
                                <span className={`text-lg font-bold ${matchScore >= 70 ? 'text-emerald-400' :
                                  matchScore >= 40 ? 'text-amber-400' :
                                    'text-red-400'
                                  }`}>
                                  {matchScore}%
                                </span>
                              </div>
                              {/* Progress bar */}
                              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${matchScore}%` }}
                                  transition={{ duration: 1, ease: 'easeOut' }}
                                  className={`h-full rounded-full ${matchScore >= 70 ? 'bg-emerald-500' :
                                    matchScore >= 40 ? 'bg-amber-500' :
                                      'bg-red-500'
                                    }`}
                                />
                              </div>
                              <p className="text-xs text-slate-500 mt-2">
                                Your resume matches {matchScore}% of the skills mentioned in this job description.
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Description */}
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-slate-300 mb-3">Job description</h4>
                        <div className="prose prose-invert prose-sm max-w-none text-slate-400 leading-relaxed">
                          {selectedJob.description ? (
                            selectedJob.description.split('\n').map((para, i) => (
                              para.trim() ? <p key={i}>{para}</p> : <br key={i} />
                            ))
                          ) : (
                            <p className="text-slate-500 italic">No description available.</p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-8 flex flex-wrap gap-3">
                        <button
                          onClick={handleApplyNow}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/25"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Apply now
                        </button>
                        <button
                          onClick={() => {
                            localStorage.setItem('jobai-selected-job', JSON.stringify(selectedJob));
                            navigate('/analysis');
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
                        >
                          <Sparkles className="h-4 w-4" />
                          Analyze with AI
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/30 px-6 py-20 text-center"
                    >
                      <Briefcase className="h-12 w-12 text-slate-600 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-300 mb-2">Select a job to view details</h3>
                      <p className="text-sm text-slate-500 max-w-sm">
                        Click on any job listing to see the full description, skill match analysis, and apply options.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}