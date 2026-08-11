import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getAuthHeaders } from '../lib/auth';
import {
    User,
    Github,
    Linkedin,
    ExternalLink,
    Code,
    Globe,
    Save,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Briefcase,
    FileText
} from 'lucide-react';

const rawApiUrl = import.meta.env.VITE_API_URL;
const API_BASE = rawApiUrl
    ? `${rawApiUrl.replace(/\/+$|\/api$/, '')}/api`
    : '/api';

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...options.headers
        }
    });
    if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        let errorMsg = `HTTP ${response.status}`;
        if (contentType.includes('application/json')) {
            try {
                const payload = await response.json();
                errorMsg = payload.error || payload.message || errorMsg;
            } catch {
                // keep status code as message
            }
        } else {
            const text = await response.text().catch(() => '');
            if (text) errorMsg = text;
        }
        const err = new Error(errorMsg);
        err.status = response.status;
        throw err;
    }
    return response.json();
}

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        name: '', email: '', title: '', phone: '', location: '',
        githubUrl: '', linkedinUrl: '', leetcodeUrl: '', portfolioUrl: '',
        skills: [], summary: '', dob: '', gender: ''
    });
    const [skillInput, setSkillInput] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const { profile: data } = await apiRequest('/profile');
                setProfile({
                    name: data.name || '',
                    email: data.email || '',
                    title: data.title || '',
                    phone: data.phone || '',
                    location: data.location || '',
                    githubUrl: data.githubUrl || '',
                    linkedinUrl: data.linkedinUrl || '',
                    leetcodeUrl: data.leetcodeUrl || '',
                    portfolioUrl: data.portfolioUrl || '',
                    skills: data.skills || [],
                    summary: data.summary || '',
                    dob: data.dob || '',
                    gender: data.gender || ''
                });
            } catch (err) {
                toast.error('Could not load profile');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const updateField = (field, value) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    const addSkill = () => {
        const s = skillInput.trim();
        if (s && !profile.skills.includes(s)) {
            updateField('skills', [...profile.skills, s]);
        }
        setSkillInput('');
    };

    const removeSkill = (skill) => {
        updateField('skills', profile.skills.filter(s => s !== skill));
    };

    const handleSkillKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
    };

    const saveProfile = async () => {
        setSaving(true);
        try {
            const { email, ...updates } = profile;
            console.log('Saving profile updates:', updates);

            const response = await fetch(`${API_BASE}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(updates)
            });

            console.log('Save response status:', response.status);
            console.log('Save response headers:', Object.fromEntries(response.headers.entries()));

            const contentType = response.headers.get('content-type') || '';
            if (!response.ok) {
                let errorMsg = `HTTP ${response.status}`;
                if (contentType.includes('application/json')) {
                    const payload = await response.json();
                    console.log('Error payload:', payload);
                    errorMsg = payload.error || payload.message || errorMsg;
                } else {
                    const text = await response.text();
                    console.log('Error text:', text);
                    errorMsg = text || errorMsg;
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            console.log('Save success:', data);

            // Update the name in localStorage so navbar reflects it
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...storedUser, name: profile.name }));
            toast.success('Profile saved!');
        } catch (err) {
            console.error('Save profile full error:', err);
            const detail = err.message || 'Failed to save profile';
            toast.error(`Save failed: ${detail}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen px-4 pb-12 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto flex items-center justify-center py-20">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading profile...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen px-4 pb-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 px-6 py-8"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-indigo-400">
                            <User className="w-4 h-4" />
                            My Profile
                        </div>
                        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                            Your{' '}
                            <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">professional</span>
                            {' '}identity
                        </h1>
                        <p className="mt-2 text-sm text-slate-400">
                            Fill in your details so the AI can tailor analysis, interview questions, and recommendations to your background.
                        </p>
                    </div>
                </motion.div>

                {/* Form */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-5"
                >
                    {/* Basic info */}
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6">
                        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <User className="w-4 h-4 text-indigo-400" />
                            Basic information
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">Full name</label>
                                <input
                                    value={profile.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-600"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
                                <input
                                    value={profile.email}
                                    disabled
                                    className="w-full rounded-xl border border-white/5 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-500 outline-none cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">Professional title</label>
                                <input
                                    value={profile.title}
                                    onChange={(e) => updateField('title', e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-600"
                                    placeholder="e.g. Senior Frontend Developer"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone</label>
                                <input
                                    value={profile.phone}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-600"
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">Location</label>
                                <input
                                    value={profile.location}
                                    onChange={(e) => updateField('location', e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-600"
                                    placeholder="e.g. Bangalore, India"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">Date of Birth</label>
                                <input
                                    type="date"
                                    value={profile.dob}
                                    onChange={(e) => updateField('dob', e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-600 [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">Gender</label>
                                <select
                                    value={profile.gender}
                                    onChange={(e) => updateField('gender', e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 appearance-none"
                                >
                                    <option value="" disabled>Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                    <option value="prefer-not-to-say">Prefer not to say</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Professional links */}
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6">
                        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-indigo-400" />
                            Professional links
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
                                    <Github className="w-3.5 h-3.5" /> GitHub
                                </label>
                                <input
                                    value={profile.githubUrl}
                                    onChange={(e) => updateField('githubUrl', e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-600"
                                    placeholder="https://github.com/username"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
                                    <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                                </label>
                                <input
                                    value={profile.linkedinUrl}
                                    onChange={(e) => updateField('linkedinUrl', e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-600"
                                    placeholder="https://linkedin.com/in/username"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
                                    <Code className="w-3.5 h-3.5" /> LeetCode
                                </label>
                                <input
                                    value={profile.leetcodeUrl}
                                    onChange={(e) => updateField('leetcodeUrl', e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-600"
                                    placeholder="https://leetcode.com/u/username"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
                                    <Globe className="w-3.5 h-3.5" /> Portfolio
                                </label>
                                <input
                                    value={profile.portfolioUrl}
                                    onChange={(e) => updateField('portfolioUrl', e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-600"
                                    placeholder="https://yourportfolio.dev"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6">
                        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-indigo-400" />
                            Skills
                        </h2>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {profile.skills.map((skill) => (
                                <span key={skill} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 ring-1 ring-indigo-500/20">
                                    {skill}
                                    <button onClick={() => removeSkill(skill)} className="hover:text-indigo-200 transition">×</button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                onKeyDown={handleSkillKeyDown}
                                className="flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-600"
                                placeholder="Type a skill and press Enter..."
                            />
                            <button
                                onClick={addSkill}
                                className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:from-indigo-500 hover:to-blue-500 transition shadow-lg shadow-indigo-600/25"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6">
                        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-400" />
                            Professional summary
                        </h2>
                        <textarea
                            value={profile.summary}
                            onChange={(e) => updateField('summary', e.target.value)}
                            rows={4}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-600 resize-none"
                            placeholder="A brief summary of your experience, goals, and what you're looking for..."
                        />
                    </div>

                    {/* Save button */}
                    <div className="flex justify-end">
                        <button
                            onClick={saveProfile}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 transition shadow-lg shadow-indigo-600/25"
                        >
                            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save profile</>}
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}