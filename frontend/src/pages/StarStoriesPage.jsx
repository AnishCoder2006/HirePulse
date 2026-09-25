import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { getAuthHeaders } from '../lib/auth';
import {
  fetchStarStories,
  generateStarStories,
  createStarStory,
  updateStarStory,
  deleteStarStory
} from '../lib/starStoriesApi';
import {
  Star,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  BookOpen,
  ChevronDown,
  Wand2,
  Save,
  MessageSquare
} from 'lucide-react';

import { API_BASE, safeFetchJson } from '../lib/apiConfig';

async function apiRequest(path, options = {}) {
  return safeFetchJson(`${API_BASE}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers
    }
  });
}

const EMPTY_STORY = {
  question: '',
  situation: '',
  task: '',
  action: '',
  result: '',
  resumeSource: '',
  jobTitle: '',
  company: ''
};

function StoryCard({ story, onEdit, onDelete, onToggleStar }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="job-card group relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner">
            <Star className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white leading-snug">{story.question}</h3>
            {(story.jobTitle || story.company) && (
              <p className="text-xs text-slate-400 mt-1">
                {story.jobTitle}{story.jobTitle && story.company ? ' · ' : ''}{story.company}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {story.origin === 'generated' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20 backdrop-blur-md">
                  <Wand2 className="w-2.5 h-2.5" />
                  AI generated
                </span>
              )}
              {story.origin === 'manual' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-500/20 backdrop-blur-md">
                  <Pencil className="w-2.5 h-2.5" />
                  Manual
                </span>
              )}
              {story.starred && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20 backdrop-blur-md">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  Starred
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onToggleStar(story)}
            className={`rounded-lg border p-2 transition-all ${story.starred
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-sm'
              : 'border-white/10 bg-white/5 text-slate-400 hover:text-amber-400 hover:border-amber-500/30'
              }`}
            title={story.starred ? 'Unstar' : 'Star for review'}
          >
            <Star className={`w-3.5 h-3.5 ${story.starred ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={() => onEdit(story)}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white hover:border-white/20 transition-all"
            title="Edit story"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(story)}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all"
            title="Delete story"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Collapsed preview */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 backdrop-blur-md p-3 text-left transition hover:border-white/20"
        >
          <p className="text-xs text-slate-400 line-clamp-2">
            {story.situation || 'No situation written yet — click to expand and review the full STAR story.'}
          </p>
          <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-blue-400">
            View full story <ChevronDown className="w-3 h-3" />
          </span>
        </button>
      )}

      {/* Expanded STAR sections */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              {[
                { key: 'situation', label: 'Situation', color: 'text-blue-400', border: 'border-blue-500/20' },
                { key: 'task', label: 'Task', color: 'text-indigo-400', border: 'border-indigo-500/20' },
                { key: 'action', label: 'Action', color: 'text-amber-400', border: 'border-amber-500/20' },
                { key: 'result', label: 'Result', color: 'text-emerald-400', border: 'border-emerald-500/20' }
              ].map(({ key, label, color, border }) => (
                <div key={key} className={`rounded-xl border ${border} bg-black/30 backdrop-blur-md p-3`}>
                  <div className={`text-[10px] font-bold uppercase tracking-widest ${color} mb-1`}>{label}</div>
                  <p className="text-sm text-slate-200 leading-relaxed">{story[key] || <span className="text-slate-500 italic">Not written yet.</span>}</p>
                </div>
              ))}
              {story.resumeSource && (
                <div className="rounded-xl border border-white/10 bg-black/30 backdrop-blur-md p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Resume source</div>
                  <p className="text-sm text-slate-300 leading-relaxed">{story.resumeSource}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="mt-2 text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Collapse
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StoryForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_STORY);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const canSave = form.question.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="glass p-6 sm:p-7"
    >
      <div className="flex items-center gap-2 text-sm font-bold text-white mb-5">
        <MessageSquare className="w-4 h-4 text-blue-400" />
        {initial ? 'Edit STAR story' : 'New STAR story'}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Behavioral question *</label>
          <input
            value={form.question}
            onChange={(e) => update('question', e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 backdrop-blur-md px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-500 transition-all"
            placeholder="Tell me about a time you…"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Job title (optional)</label>
            <input
              value={form.jobTitle}
              onChange={(e) => update('jobTitle', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 backdrop-blur-md px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-500 transition-all"
              placeholder="e.g. Senior Frontend Developer"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Company (optional)</label>
            <input
              value={form.company}
              onChange={(e) => update('company', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 backdrop-blur-md px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-500 transition-all"
              placeholder="e.g. Acme Corp"
            />
          </div>
        </div>

        {[
          { key: 'situation', label: 'Situation', placeholder: 'Set the context — what was happening, who was involved, when and where?' },
          { key: 'task', label: 'Task', placeholder: 'What was your responsibility or the goal you needed to achieve?' },
          { key: 'action', label: 'Action', placeholder: 'What specific steps did you take? Focus on what YOU did.' },
          { key: 'result', label: 'Result', placeholder: 'What was the outcome? Use numbers and measurable impact where possible.' }
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">{label}</label>
            <textarea
              value={form[key]}
              onChange={(e) => update(key, e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 backdrop-blur-md px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-500 resize-none transition-all"
              placeholder={placeholder}
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Resume source (optional)</label>
          <input
            value={form.resumeSource}
            onChange={(e) => update('resumeSource', e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 backdrop-blur-md px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-500 transition-all"
            placeholder="e.g. Led migration of 12 microservices (2023)"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:border-white/20 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!canSave || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20 border border-blue-400/30 cursor-pointer"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save story</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function StarStoriesPage() {
  const [stories, setStories] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState('');
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storiesData, analysesData] = await Promise.all([
          fetchStarStories(),
          apiRequest('/analysis').then(d => d.analyses || []).catch(() => [])
        ]);
        setStories(storiesData);
        setAnalyses(analysesData.filter(a => a.status === 'complete'));
        // Default to the most recent completed analysis if one exists
        const savedAnalysisId = localStorage.getItem('jobai-analysis-id');
        if (savedAnalysisId && analysesData.some(a => a._id === savedAnalysisId && a.status === 'complete')) {
          setSelectedAnalysisId(savedAnalysisId);
        } else if (analysesData.some(a => a.status === 'complete')) {
          setSelectedAnalysisId(analysesData.find(a => a.status === 'complete')._id);
        }
      } catch (err) {
        toast.error('Could not load STAR stories');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleGenerate = async () => {
    if (!selectedAnalysisId) {
      toast.error('Run a job analysis first, then generate stories from it');
      return;
    }
    setGenerating(true);
    try {
      const newStories = await generateStarStories(selectedAnalysisId);
      setStories(prev => [...newStories, ...prev]);
      toast.success(`Generated ${newStories.length} STAR stor${newStories.length === 1 ? 'y' : 'ies'}`);
    } catch (err) {
      toast.error(err.message || 'Could not generate stories');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const story = await createStarStory(form);
      setStories(prev => [story, ...prev]);
      setShowForm(false);
      toast.success('STAR story created');
    } catch (err) {
      toast.error(err.message || 'Could not create story');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (form) => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await updateStarStory(editing._id, form);
      setStories(prev => prev.map(s => s._id === updated._id ? updated : s));
      setEditing(null);
      toast.success('STAR story updated');
    } catch (err) {
      toast.error(err.message || 'Could not update story');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (story) => {
    // Optimistic removal.
    setStories(prev => prev.filter(s => s._id !== story._id));
    try {
      await deleteStarStory(story._id);
      toast.success('Story deleted');
    } catch (err) {
      // Revert on failure.
      setStories(prev => [story, ...prev]);
      toast.error(err.message || 'Could not delete story');
    }
  };

  const handleToggleStar = async (story) => {
    const next = !story.starred;
    // Optimistic update.
    setStories(prev => prev.map(s => s._id === story._id ? { ...s, starred: next } : s));
    try {
      const updated = await updateStarStory(story._id, { starred: next });
      setStories(prev => prev.map(s => s._id === updated._id ? updated : s));
    } catch (err) {
      // Revert on failure.
      setStories(prev => prev.map(s => s._id === story._id ? { ...s, starred: !next } : s));
      toast.error(err.message || 'Could not update story');
    }
  };

  const visibleStories = showStarredOnly ? stories.filter(s => s.starred) : stories;

  return (
    <div className="min-h-screen px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Hero Surface */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-surface px-6 py-8 sm:px-8 sm:py-10"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400">
              <Star className="w-4 h-4 fill-blue-400/20 text-blue-400" />
              STAR Story Bank
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl tracking-tight">
              Prepare{' '}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">behavioral answers</span>
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              {stories.length} stor{stories.length === 1 ? 'y' : 'ies'} saved — generate STAR stories from your resume and job analysis, then edit and review them before real or mock interviews.
            </p>

            {/* Generate controls */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <select
                value={selectedAnalysisId}
                onChange={(e) => setSelectedAnalysisId(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950/60 backdrop-blur-md px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all"
              >
                {analyses.length === 0 && <option value="" className="bg-slate-900">No completed analyses yet</option>}
                {analyses.map((a) => (
                  <option key={a._id} value={a._id} className="bg-slate-900">
                    {a.job?.title || 'Untitled'} · {a.job?.company || '—'}
                  </option>
                ))}
              </select>
              <button
                onClick={handleGenerate}
                disabled={generating || analyses.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20 border border-blue-400/30 cursor-pointer"
              >
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Wand2 className="w-4 h-4" /> Generate from analysis</>}
              </button>
              <button
                onClick={() => { setShowForm(true); setEditing(null); }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-white/20 hover:bg-white/10 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add manually
              </button>
            </div>
            {analyses.length === 0 && (
              <p className="mt-3 text-xs text-amber-400/90 font-medium">
                Run a job analysis first to generate stories grounded in a real role. You can still add stories manually.
              </p>
            )}
          </div>
        </motion.div>

        {/* Starred filter */}
        {!loading && stories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowStarredOnly(false)}
              className={`pill-filter cursor-pointer ${!showStarredOnly ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm' : ''}`}
            >
              All ({stories.length})
            </button>
            <button
              onClick={() => setShowStarredOnly(true)}
              className={`pill-filter cursor-pointer flex items-center gap-1.5 ${showStarredOnly ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' : ''}`}
            >
              <Star className={`w-3 h-3 ${showStarredOnly ? 'fill-current' : ''}`} />
              Starred ({stories.filter(s => s.starred).length})
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span className="text-sm font-medium">Loading STAR stories...</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && stories.length === 0 && !showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass flex flex-col items-center justify-center border-dashed px-6 py-20 text-center"
          >
            <BookOpen className="w-14 h-14 text-slate-500 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No STAR stories yet</h3>
            <p className="text-sm text-slate-400 max-w-md">
              Run a job analysis and generate stories from it, or add one manually. These are your structured behavioral answers — different from the live mock interview.
            </p>
          </motion.div>
        )}

        {/* Empty starred state */}
        {!loading && stories.length > 0 && visibleStories.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass flex flex-col items-center justify-center border-dashed px-6 py-16 text-center"
          >
            <Star className="w-12 h-12 text-slate-500 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No starred stories</h3>
            <p className="text-sm text-slate-400 max-w-md">
              Star stories you want to review right before an interview.
            </p>
          </motion.div>
        )}

        {/* Create / edit form */}
        <AnimatePresence mode="wait">
          {showForm && (
            <StoryForm
              initial={null}
              onSave={handleCreate}
              onCancel={() => setShowForm(false)}
              saving={saving}
            />
          )}
          {editing && (
            <StoryForm
              initial={editing}
              onSave={handleUpdate}
              onCancel={() => setEditing(null)}
              saving={saving}
            />
          )}
        </AnimatePresence>

        {/* Stories grid */}
        {!loading && visibleStories.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {visibleStories.map((story) => (
                <StoryCard
                  key={story._id}
                  story={story}
                  onEdit={(s) => { setEditing(s); setShowForm(false); }}
                  onDelete={handleDelete}
                  onToggleStar={handleToggleStar}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}