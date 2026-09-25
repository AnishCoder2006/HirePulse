import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getAuthHeaders } from '../lib/auth';
import { exportResumePDF } from '../lib/pdfExport';
import {
  FileText,
  Copy,
  Download,
  FileDown,
  Loader2,
  ShieldCheck,
  Upload,
  Trash2,
  Briefcase,
  FileCheck2,
  ScrollText,
  Zap,
  Sparkles,
  BadgeCheck,
  XCircle,
  Building2,
  BarChart2,
  CheckCircle2,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

import { API_BASE, safeFetchJson } from '../lib/apiConfig';

async function apiRequest(path, options = {}) {
  return safeFetchJson(`${API_BASE}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...getAuthHeaders(),
      ...options.headers
    }
  });
}

function pollAnalysis(id, { onComplete, onFailed }) {
  const maxPolls = 12;
  const intervalMs = 10000;
  let pollCount = 0;
  let interval = null;

  async function checkStatus() {
    pollCount += 1;
    try {
      const { analysis: record } = await apiRequest(`/analysis/${id}`);
      if (record.status === 'complete') {
        clearInterval(interval);
        onComplete(record);
        return;
      }
      if (record.status === 'failed') {
        clearInterval(interval);
        onFailed(record.error || 'Analysis failed');
        return;
      }
      if (pollCount >= maxPolls) {
        clearInterval(interval);
        onFailed('Analysis is still processing. Please refresh or try again later.');
      }
    } catch (err) {
      clearInterval(interval);
      onFailed(err.message);
    }
  }

  interval = setInterval(checkStatus, intervalMs);
  checkStatus();
  return interval;
}

function mapAnalysisRecord(record) {
  return {
    score: record.atsScore?.atsPercentage ?? 0,
    keywordMatchScore: record.atsScore?.atsPercentage,
    semanticScore: record.matchScore?.semanticScore,
    found: record.atsScore?.keywordsFound ?? [],
    missing: record.atsScore?.keywordsMissing ?? [],
    enhancerSuggestions: record.enhancerSuggestions ?? []
  };
}

function downloadText(text, fileName) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ResumePage() {
  const [resumeText, setResumeText] = useState(() => localStorage.getItem('jobai-resume-text') || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedJob] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jobai-selected-job') || 'null');
    } catch {
      return null;
    }
  });
  const [analysis, setAnalysis] = useState(null);
  const [generatedDocs, setGeneratedDocs] = useState(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('jobai-resume-text', resumeText);
  }, [resumeText]);

  function applyCompletedAnalysis(record, { toastMessage } = {}) {
    setAnalysis(mapAnalysisRecord(record));
    setGeneratedDocs({ resume: record.tailoredResume, coverLetter: record.coverLetter });
    setIsAnalyzing(false);
    setIsGenerating(false);
    if (toastMessage) toast.success(toastMessage);
  }

  function handleAnalysisFailure(message) {
    setIsAnalyzing(false);
    setIsGenerating(false);
    toast.error(message);
  }

  useEffect(() => {
    const savedAnalysisId = localStorage.getItem('jobai-analysis-id');
    if (!savedAnalysisId) return undefined;
    let isSubscribed = true;

    (async function restoreAnalysis() {
      try {
        const { analysis: record } = await apiRequest(`/analysis/${savedAnalysisId}`);
        if (!isSubscribed || !record) return;

        if (record.status === 'complete') {
          applyCompletedAnalysis(record);
        } else if (record.status === 'queued' || record.status === 'processing') {
          setIsAnalyzing(true);
          pollIntervalRef.current = pollAnalysis(record._id, {
            onComplete: (completed) => {
              if (isSubscribed) applyCompletedAnalysis(completed, { toastMessage: 'Analysis complete.' });
            },
            onFailed: (message) => {
              if (isSubscribed) handleAnalysisFailure(message);
            }
          });
        }
      } catch (err) {
        console.error('Failed to restore saved analysis:', err);
      }
    })();

    return () => {
      isSubscribed = false;
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    };
  }, []);

  const stats = useMemo(
    () => [
      { label: 'Words', value: resumeText.trim() ? resumeText.trim().split(/\s+/).length : 0 },
      { label: 'Characters', value: resumeText.length }
    ],
    [resumeText]
  );

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const { resume } = await apiRequest('/resume', { method: 'POST', body: formData });
        setResumeText(resume.rawText);
        toast.success('PDF parsed successfully.');
      } catch (err) {
        toast.error(err.message || 'Could not parse that PDF.');
      }
      return;
    }

    const text = await file.text();
    setResumeText(text);
  };

  async function runFullAnalysis({ forGeneration }) {
    if (!resumeText.trim()) {
      toast.error('Paste or upload your resume text first.');
      return;
    }
    if (!selectedJob) {
      toast.error('Choose a job from the Find Jobs page first.');
      return;
    }

    clearInterval(pollIntervalRef.current);
    forGeneration ? setIsGenerating(true) : setIsAnalyzing(true);

    try {
      const { resume } = await apiRequest('/resume', {
        method: 'POST',
        body: JSON.stringify({ text: resumeText })
      });

      const { analysis: record } = await apiRequest('/analysis', {
        method: 'POST',
        body: JSON.stringify({
          resumeId: resume._id,
          job: {
            sourceId: selectedJob.sourceId,
            title: selectedJob.title,
            company: selectedJob.company,
            location: selectedJob.location,
            url: selectedJob.url,
            description: selectedJob.description
          }
        })
      });

      localStorage.setItem('jobai-analysis-id', record._id);

      pollIntervalRef.current = pollAnalysis(record._id, {
        onComplete: (completed) => applyCompletedAnalysis(completed, {
          toastMessage: forGeneration ? 'Tailored resume and cover letter generated.' : 'ATS analysis complete.'
        }),
        onFailed: handleAnalysisFailure
      });
    } catch (err) {
      setIsAnalyzing(false);
      setIsGenerating(false);
      toast.error(err.message || 'Unable to run analysis right now.');
    }
  }

  const copyText = async (text) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard.');
  };

  const clearAll = () => {
    setResumeText('');
    setAnalysis(null);
    setGeneratedDocs(null);
    setIsAnalyzing(false);
    setIsGenerating(false);
    clearInterval(pollIntervalRef.current);
    localStorage.removeItem('jobai-analysis-id');
    localStorage.removeItem('jobai-resume-text');
  };

  const busy = isAnalyzing || isGenerating;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* ───── Header Banner ───── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl"
        >
          <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/0 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 h-48 w-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              <FileText className="h-3.5 w-3.5" /> Resume & ATS Optimization
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Optimize your{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-teal-300 bg-clip-text text-transparent">
                resume & documents
              </span>
              {' '}for every application
            </h1>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              Paste your current resume, align it with a target role, and let AI score your match while generating a customized resume and cover letter tailored to the job description.
            </p>
          </div>
        </motion.div>

        {/* ───── Resume Editor + Job Panel ───── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 sm:p-8 shadow-xl"
        >
          <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
            
            {/* Left Column — Editor */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <ScrollText className="h-4 w-4 text-indigo-400" />
                  Resume Raw Content
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span>{stats[0].value} words</span>
                  <span>•</span>
                  <span>{stats[1].value} chars</span>
                </div>
              </div>

              <div className="relative group">
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your plain text resume content here or upload a document below..."
                  className="h-80 w-full rounded-2xl border border-white/10 bg-slate-950/80 p-5 font-mono text-sm text-slate-200 outline-none transition-all duration-200 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-600 resize-none shadow-inner"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]">
                  <Upload className="h-4 w-4" />
                  Upload PDF / TXT
                  <input type="file" accept=".txt,.md,.pdf" className="hidden" onChange={handleUpload} />
                </label>

                {resumeText && (
                  <button
                    onClick={clearAll}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear Editor
                  </button>
                )}
              </div>
            </div>

            {/* Right Column — Job info & Actions */}
            <div className="flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                {/* Job Card */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 shadow-inner">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">Target Position</span>
                  {selectedJob ? (
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-white truncate">{selectedJob.title}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" /> {selectedJob.company}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-amber-400 text-xs font-semibold bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>No target job selected. Pick a position from Find Jobs to unlock tailoring.</span>
                    </div>
                  )}
                </div>

                {/* Stats Panel */}
                <div className="grid grid-cols-2 gap-3">
                  {stats.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                      <p className="text-xs font-medium text-slate-500">{item.label}</p>
                      <p className="mt-1 text-xl font-bold text-white">{item.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Primary Actions */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => runFullAnalysis({ forGeneration: false })}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isAnalyzing ? (
                    <><Loader2 className="h-4 w-4 animate-spin text-indigo-200" /> Analyzing ATS Match...</>
                  ) : (
                    <><ShieldCheck className="h-4 w-4" /> Run ATS Analysis</>
                  )}
                </button>

                <button
                  onClick={() => runFullAnalysis({ forGeneration: true })}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-3.5 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isGenerating ? (
                    <><Loader2 className="h-4 w-4 animate-spin text-indigo-300" /> Generating Tailored Docs...</>
                  ) : (
                    <><Zap className="h-4 w-4 text-amber-300 fill-amber-300" /> Generate Tailored Resume + Cover Letter</>
                  )}
                </button>
              </div>

            </div>
          </div>
        </motion.div>

        {/* ───── Analysis Quick Scores ───── */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 sm:p-8 shadow-xl space-y-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">ATS Analysis Overview</h3>
                  <p className="text-xs text-slate-400">Compatibility and missing keywords summary</p>
                </div>
              </div>
              <span className="text-2xl font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-xl">
                {analysis.score}%
              </span>
            </div>

            {/* Score Grid */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-400 mb-1">
                  <BarChart2 className="w-3.5 h-3.5 text-indigo-400" /> Keyword Score
                </div>
                <p className="text-2xl font-black text-white">{analysis.keywordMatchScore ?? analysis.score}%</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-400 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> Semantic Score
                </div>
                <p className="text-2xl font-black text-white">
                  {analysis.semanticScore != null ? `${analysis.semanticScore}%` : <span className="text-sm font-normal text-slate-500">N/A</span>}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Enhancer Tweaks
                </div>
                <p className="text-2xl font-black text-white">{analysis.enhancerSuggestions?.length || 0}</p>
              </div>
            </div>

            {/* Keyword Split */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                  <BadgeCheck className="w-4 h-4" /> Keywords Found ({analysis.found.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.found.map((kw) => (
                    <span key={kw} className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
                      ✓ {kw}
                    </span>
                  ))}
                  {analysis.found.length === 0 && <p className="text-xs text-slate-500 italic">No matches yet.</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-rose-400">
                  <XCircle className="w-4 h-4" /> Missing Keywords ({analysis.missing.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.missing.map((kw) => (
                    <span key={kw} className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-xs font-medium text-rose-300">
                      + {kw}
                    </span>
                  ))}
                  {analysis.missing.length === 0 && <p className="text-xs text-emerald-400 italic">All key terms covered!</p>}
                </div>
              </div>
            </div>

            {/* Enhancer suggestions list */}
            {analysis.enhancerSuggestions?.length > 0 && (
              <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Sparkles className="w-4 h-4 text-amber-400" /> ATS Contextual Enhancements
                </div>
                <div className="space-y-2.5">
                  {analysis.enhancerSuggestions.map((item) => (
                    <div key={item.keyword} className="rounded-xl border border-white/5 bg-slate-900/80 p-3.5 text-xs text-slate-300 leading-relaxed">
                      <span className="font-bold text-indigo-400">{item.keyword}:</span> {item.suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ───── Generated Documents Panels ───── */}
        {generatedDocs?.resume && (
          <div className="grid gap-6 lg:grid-cols-2">
            
            {/* Tailored Resume Container */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <FileCheck2 className="h-4 w-4 text-indigo-400" />
                    Tailored Resume
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => copyText(generatedDocs.resume)}
                      className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:border-white/20 hover:text-white transition"
                      title="Copy to Clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => downloadText(generatedDocs.resume, 'tailored_resume.txt')}
                      className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:border-white/20 hover:text-white transition"
                      title="Download TXT"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => exportResumePDF({ resumeText: generatedDocs.resume, coverLetterText: generatedDocs.coverLetter, jobTitle: selectedJob?.title || 'Role', company: selectedJob?.company || 'Company' })}
                      className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-2 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition"
                      title="Export PDF"
                    >
                      <FileDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <pre className="whitespace-pre-wrap rounded-2xl border border-white/5 bg-slate-950/80 p-5 font-mono text-xs text-slate-300 leading-relaxed max-h-96 overflow-y-auto shadow-inner">
                  {generatedDocs.resume}
                </pre>
              </div>
            </motion.div>

            {/* Cover Letter Container */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <ScrollText className="h-4 w-4 text-indigo-400" />
                    Generated Cover Letter
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => copyText(generatedDocs.coverLetter)}
                      className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:border-white/20 hover:text-white transition"
                      title="Copy to Clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => downloadText(generatedDocs.coverLetter, 'cover_letter.txt')}
                      className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:border-white/20 hover:text-white transition"
                      title="Download TXT"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <pre className="whitespace-pre-wrap rounded-2xl border border-white/5 bg-slate-950/80 p-5 font-mono text-xs text-slate-300 leading-relaxed max-h-96 overflow-y-auto shadow-inner">
                  {generatedDocs.coverLetter}
                </pre>
              </div>
            </motion.div>

          </div>
        )}

        {/* ───── Initial Empty State ───── */}
        {!selectedJob && !analysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-900/30 p-12 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 border border-white/5 mb-4 text-slate-500">
              <Briefcase className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">No target job selected</h3>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Navigate to the <strong className="text-indigo-400 font-semibold">Find Jobs</strong> tab, select a target position, and return here to run analysis and generate tailored application materials.
            </p>
          </motion.div>
        )}

      </div>
    </div>
  );
}