import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Brain, 
    Search, 
    CheckCircle2, 
    Target, 
    Sparkles, 
    TrendingUp, 
    FileText, 
    Lightbulb, 
    Loader2, 
    BadgeCheck, 
    XCircle, 
    FileDown, 
    Zap, 
    Briefcase, 
    MapPin, 
    AlertTriangle,
    ChevronRight,
    Award
} from 'lucide-react';
import { getAuthHeaders } from '../lib/auth';
import { exportAnalysisPDF } from '../lib/pdfExport';

const rawApiUrl = import.meta.env.VITE_API_URL;
const normalizedApiUrl = rawApiUrl?.replace(/\/+$/, '');
const API_BASE = rawApiUrl
    ? `${normalizedApiUrl.replace(/\/api$/, '')}/api`
    : import.meta.env.DEV
        ? 'http://localhost:4000/api'
        : '/api';

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        cache: 'no-store',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...options.headers
        }
    });
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Request to ${path} failed`);
    }
    return response.json();
}

function toViewModel(record) {
    const ats = record.atsScore || {};
    const match = record.matchScore || {};
    const stuffed = ats.stuffing || {};

    const smartSuggestions = [];

    if (ats.suggestions?.length) {
        smartSuggestions.push(...ats.suggestions);
    }

    if (match.semanticScore != null && match.keywordScore != null) {
        const gap = match.keywordScore - match.semanticScore;
        if (gap > 15) {
            smartSuggestions.push(
                'Your keyword match is strong, but the semantic score lags significantly — your resume uses the right words but doesn\'t fully align with the role\'s context. Rewrite bullet points to mirror the job description\'s phrasing.'
            );
        } else if (match.semanticScore < 40) {
            smartSuggestions.push(
                'The low semantic score suggests your resume lacks contextual alignment with this role. Try rephrasing experience bullet points using language from the job description.'
            );
        }
    }

    if (ats.exactPhraseMatches?.length === 0 && ats.keywordsMissing?.length > 0) {
        smartSuggestions.push(
            'No multi-word phrases from the job description appear verbatim in your resume. ATS parsers give more weight to exact phrase matches — add phrases like the ones listed in missing keywords.'
        );
    }

    if (ats.jobTitleMatch) {
        if (ats.jobTitleMatch.score === 0) {
            smartSuggestions.push(`The job title "${record.job?.title || ''}" doesn't appear in your resume at all. Add it in your summary or recent experience section.`);
        } else if (ats.jobTitleMatch.score === 40) {
            smartSuggestions.push(`The job title "${record.job?.title || ''}" only appears as scattered words. Add the full title in your professional summary.`);
        }
    }

    if (stuffed.isStuffed && stuffed.flaggedTerms?.length) {
        smartSuggestions.push(
            `Your resume repeats these terms unusually often: ${stuffed.flaggedTerms.map(t => t.term).join(', ')}. Consider reducing repetition to avoid appearing as keyword stuffing.`
        );
    }

    const combined = match.combinedScore;
    if (combined != null && combined >= 80) {
        smartSuggestions.push('Your resume is a strong match for this role. Focus on interview preparation to maximize your chances.');
    } else if (combined != null && combined < 40) {
        smartSuggestions.push('Significant changes needed. Consider using the "Generate tailored resume" feature on the Resume page to create a version optimized for this job.');
    }

    return {
        status: record.status,
        error: record.error,
        score: ats.atsPercentage ?? 0,
        keywordMatchScore: ats.atsPercentage,
        semanticScore: match.semanticScore,
        combinedScore: match.combinedScore,
        found: ats.keywordsFound ?? [],
        missing: ats.keywordsMissing ?? [],
        exactPhraseMatches: ats.exactPhraseMatches ?? [],
        suggestions: ats.suggestions ?? [],
        enhancerSuggestions: record.enhancerSuggestions ?? [],
        jobTitleMatch: ats.jobTitleMatch || { score: 0, location: 'not_found' },
        stuffing: stuffed,
        smartSuggestions
    };
}

export default function AnalysisPage() {
    const [job, setJob] = useState(null);
    const [resumeText, setResumeText] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const pollRef = useRef(null);

    useEffect(() => {
        try {
            setJob(JSON.parse(localStorage.getItem('jobai-selected-job') || 'null'));
        } catch {
            setJob(null);
        }
        setResumeText(localStorage.getItem('jobai-resume-text') || '');

        const savedAnalysisId = localStorage.getItem('jobai-analysis-id');
        if (savedAnalysisId) {
            (async () => {
                try {
                    setLoading(true);
                    const { analysis: record } = await apiRequest(`/analysis/${savedAnalysisId}`);
                    if (record) {
                        setAnalysis(toViewModel(record));
                        if (record.status === 'complete') {
                            setLoading(false);
                        } else if (record.status === 'queued' || record.status === 'processing') {
                            pollAnalysis(record._id);
                        } else {
                            setLoading(false);
                        }
                    }
                } catch (err) {
                    setLoading(false);
                }
            })();
        }

        return () => clearInterval(pollRef.current);
    }, []);

    async function pollAnalysis(id) {
        const maxPolls = 12;
        let pollCount = 0;
        const intervalMs = 10000;

        if (pollRef.current) {
            clearInterval(pollRef.current);
        }

        const pollOnce = async () => {
            if (pollCount >= maxPolls) return;
            pollCount += 1;

            try {
                const { analysis: record } = await apiRequest(`/analysis/${id}`);
                if (record.status === 'failed') {
                    clearInterval(pollRef.current);
                    setLoading(false);
                    setError(record.error || 'Analysis failed');
                    return;
                }
                if (record.status === 'complete') {
                    clearInterval(pollRef.current);
                    setLoading(false);
                    localStorage.setItem('jobai-analysis-id', record._id);
                    setAnalysis(toViewModel(record));
                    return;
                }

                setAnalysis(toViewModel(record));

                if (pollCount >= maxPolls) {
                    clearInterval(pollRef.current);
                    setLoading(false);
                    setError('Analysis is still processing. If it does not finish soon, please refresh or try again later.');
                }
            } catch (err) {
                const message = err.message || 'Unable to check analysis status';
                if (message.includes('429') || message.includes('Too many')) {
                    clearInterval(pollRef.current);
                    setLoading(false);
                    setError('The analysis service is busy right now. Please wait a moment and try again.');
                    return;
                }
                clearInterval(pollRef.current);
                setLoading(false);
                setError(message);
            }
        };

        const interval = setInterval(() => {
            pollOnce();
        }, intervalMs);
        pollRef.current = interval;
        pollOnce();
    }

    async function runAnalysis() {
        if (!job || !resumeText.trim()) return;
        setLoading(true);
        setError('');
        setAnalysis(null);
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
                        sourceId: job.sourceId,
                        title: job.title,
                        company: job.company,
                        location: job.location,
                        url: job.url,
                        description: job.description
                    }
                })
            });
            localStorage.setItem('jobai-analysis-id', record._id);
            setAnalysis(toViewModel(record));
            pollAnalysis(record._id);
        } catch (err) {
            setLoading(false);
            setError(err.message);
        }
    }

    if (!job) {
        return (
            <div className="min-h-screen px-4 py-16 sm:px-6 lg:px-8 bg-slate-950 text-slate-100 flex items-center justify-center">
                <div className="max-w-xl w-full mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-8 sm:p-12 text-center shadow-2xl"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
                            <Target className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">No Target Job Selected</h2>
                        <p className="mt-3 text-slate-400 leading-relaxed text-sm sm:text-base">
                            Select a job posting from the search dashboard to run a deep AI match and keyword analysis.
                        </p>
                        <a 
                            href="/search" 
                            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Search className="w-4 h-4" /> Go to job search <ChevronRight className="w-4 h-4 text-indigo-200" />
                        </a>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl"
                >
                    <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/0 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-1/3 -mb-12 h-48 w-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-3 max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                                <Brain className="w-3.5 h-3.5 animate-pulse" /> AI ATS Intelligence
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                                Resume match for{' '}
                                <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-teal-300 bg-clip-text text-transparent">
                                    {job.title}
                                </span>
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 font-medium">
                                <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-slate-500" /> {job.company}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-500" /> {job.location}</span>
                            </div>

                            {!resumeText.trim() && (
                                <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 w-fit">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>Upload a resume before running the analysis.</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                            <button
                                onClick={runAnalysis}
                                disabled={loading || !resumeText.trim()}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:transform-none"
                            >
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin text-indigo-200" /> Analyzing match...</>
                                ) : (
                                    <><Zap className="w-4 h-4 text-amber-300 fill-amber-300" /> Run AI Analysis</>
                                )}
                            </button>

                            {analysis && analysis.status === 'complete' && (
                                <button
                                    onClick={() => exportAnalysisPDF({ analysis, jobTitle: job.title, company: job.company })}
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-3.5 text-sm font-semibold text-slate-200 hover:text-white transition-all shadow-sm"
                                >
                                    <FileDown className="w-4 h-4 text-indigo-400" /> Export Report
                                </button>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                            <button
                                onClick={runAnalysis}
                                disabled={loading || !resumeText.trim()}
                                className="shrink-0 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-500/30 rounded-lg shadow-sm transition"
                            >
                                Retry Analysis
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* Analysis Dashboard */}
                {analysis && analysis.status !== 'failed' && (
                    <div className="space-y-6">
                        
                        {/* Core Score Cards */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                        >
                            <ScoreCard 
                                icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                title="ATS Score"
                                score={analysis.score}
                                color="emerald"
                                subtitle="Overall parser match"
                            />
                            <ScoreCard 
                                icon={<FileText className="w-4 h-4 text-indigo-400" />}
                                title="Keyword Score"
                                score={analysis.keywordMatchScore ?? analysis.score}
                                color="indigo"
                                subtitle="Matched job keywords"
                            />
                            <ScoreCard 
                                icon={<TrendingUp className="w-4 h-4 text-blue-400" />}
                                title="Semantic Score"
                                score={analysis.semanticScore}
                                color="blue"
                                subtitle="Contextual relevance"
                            />
                            <ScoreCard 
                                icon={<Award className="w-4 h-4 text-amber-400" />}
                                title="Combined Total"
                                score={analysis.combinedScore}
                                color="amber"
                                subtitle="Weighted overall rating"
                            />
                        </motion.div>

                        {/* Keyword Comparison Split */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="grid gap-6 md:grid-cols-2"
                        >
                            {/* Keywords Found */}
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-lg p-6 shadow-xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                                            <BadgeCheck className="w-5 h-5 text-emerald-400" />
                                            Keywords Found
                                        </div>
                                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                                            {analysis.found.length}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.found.map((k) => (
                                            <span 
                                                key={k} 
                                                className="inline-flex items-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                                            >
                                                ✓ {k}
                                            </span>
                                        ))}
                                        {analysis.found.length === 0 && (
                                            <p className="text-xs text-slate-500 italic py-2">No matching keywords detected yet.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Keywords Missing */}
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-lg p-6 shadow-xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                                            <XCircle className="w-5 h-5 text-rose-400" />
                                            Keywords Missing
                                        </div>
                                        <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-400">
                                            {analysis.missing.length}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.missing.map((k) => (
                                            <span 
                                                key={k} 
                                                className="inline-flex items-center rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
                                            >
                                                + {k}
                                            </span>
                                        ))}
                                        {analysis.missing.length === 0 && (
                                            <p className="text-xs text-emerald-400 italic py-2">No missing keywords found — excellent match!</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Exact Phrase Matches */}
                        {analysis.exactPhraseMatches?.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                                className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-lg p-6 shadow-xl"
                            >
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                                        <Sparkles className="w-4 h-4 text-indigo-400" />
                                        Exact Multi-Word Phrase Matches
                                    </div>
                                    <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-400">
                                        {analysis.exactPhraseMatches.length}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {analysis.exactPhraseMatches.map((p) => (
                                        <span key={p} className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-300">
                                            "{p}"
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Exact phrase matches significantly boost your parsed ranking score in automated ATS screening tools.
                                </p>
                            </motion.div>
                        )}

                        {/* Smart Suggestions AI Card */}
                        {analysis.smartSuggestions?.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-950/20 p-6 sm:p-8 shadow-xl"
                            >
                                <div className="flex items-center gap-3 text-amber-400 mb-6">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                                        <Lightbulb className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Smart Strategic Suggestions</h3>
                                        <p className="text-xs text-amber-300/80">{analysis.smartSuggestions.length} tailored recommendations</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {analysis.smartSuggestions.map((s, idx) => (
                                        <div key={idx} className="flex items-start gap-4 rounded-xl border border-white/5 bg-slate-950/80 p-4 transition hover:border-white/10">
                                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400">
                                                {idx + 1}
                                            </span>
                                            <p className="text-sm text-slate-300 leading-relaxed">{s}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Job Title Match Grid Section */}
                        {analysis.jobTitleMatch && (
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35 }}
                                className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-lg p-6 shadow-xl"
                            >
                                <div className="flex items-center gap-2 text-sm font-bold text-white mb-4">
                                    <Target className="w-4 h-4 text-indigo-400" />
                                    Job Title Verification
                                </div>
                                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/60 border border-white/5">
                                    <div className="space-y-1">
                                        <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Detected Title Location</p>
                                        <p className="text-sm font-semibold text-slate-200">
                                            {analysis.jobTitleMatch.location === 'header' ? 'Resume Header Section' :
                                             analysis.jobTitleMatch.location === 'body' ? 'Resume Body Content' :
                                             analysis.jobTitleMatch.location === 'scattered_words' ? 'Scattered Word Matches' :
                                             'Not Found in Resume'}
                                        </p>
                                    </div>
                                    <div className={`text-2xl font-black ${
                                        analysis.jobTitleMatch.score >= 80 ? 'text-emerald-400' :
                                        analysis.jobTitleMatch.score >= 40 ? 'text-amber-400' :
                                        'text-rose-400'
                                    }`}>
                                        {analysis.jobTitleMatch.score}%
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ATS Enhancers */}
                        {analysis.enhancerSuggestions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-lg p-6 shadow-xl"
                            >
                                <div className="flex items-center gap-2 text-sm font-bold text-white mb-4">
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                    ATS Enhancer Contextual Fixes
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {analysis.enhancerSuggestions.map((item) => (
                                        <div key={item.keyword} className="rounded-xl border border-white/5 bg-slate-950/60 p-4 flex flex-col justify-between">
                                            <div>
                                                <span className="inline-flex items-center rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-400 mb-2">
                                                    {item.keyword}
                                                </span>
                                                <p className="text-xs text-slate-300 leading-relaxed">{item.suggestion}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}

function ScoreCard({ icon, title, score, color, subtitle }) {
    const isVal = score != null;
    const scoreVal = isVal ? score : 0;

    const colorStyles = {
        emerald: {
            text: 'text-emerald-400',
            bg: 'bg-emerald-500',
            border: 'border-emerald-500/20',
            glow: 'from-emerald-500/10'
        },
        indigo: {
            text: 'text-indigo-400',
            bg: 'bg-indigo-500',
            border: 'border-indigo-500/20',
            glow: 'from-indigo-500/10'
        },
        blue: {
            text: 'text-blue-400',
            bg: 'bg-blue-500',
            border: 'border-blue-500/20',
            glow: 'from-blue-500/10'
        },
        amber: {
            text: 'text-amber-400',
            bg: 'bg-amber-500',
            border: 'border-amber-500/20',
            glow: 'from-amber-500/10'
        }
    }[color] || {
        text: 'text-indigo-400',
        bg: 'bg-indigo-500',
        border: 'border-indigo-500/20',
        glow: 'from-indigo-500/10'
    };

    return (
        <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-lg p-5 shadow-xl flex flex-col justify-between`}>
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorStyles.glow} to-transparent`} />
            <div>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        {icon}
                        {title}
                    </span>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white tracking-tight">
                        {isVal ? `${scoreVal}%` : 'N/A'}
                    </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 font-medium">{subtitle}</p>
            </div>

            {/* Progress Bar Accent */}
            <div className="mt-4 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                    className={`h-full ${colorStyles.bg} transition-all duration-500 ease-out`} 
                    style={{ width: `${isVal ? Math.min(100, Math.max(0, scoreVal)) : 0}%` }}
                />
            </div>
        </div>
    );
}