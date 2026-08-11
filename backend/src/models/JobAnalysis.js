import mongoose from 'mongoose';

const jobSnapshotSchema = new mongoose.Schema(
  {
    source: { type: String, default: 'adzuna' },
    sourceId: String,
    title: String,
    company: String,
    location: String,
    url: String,
    description: String
  },
  { _id: false }
);

const jobAnalysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true },
    job: { type: jobSnapshotSchema, required: true },
    status: { type: String, enum: ['queued', 'processing', 'complete', 'failed'], default: 'queued' },
    analysis: mongoose.Schema.Types.Mixed,
    tailoredResume: String,
    coverLetter: String,
    interviewPrep: mongoose.Schema.Types.Mixed,
    atsScore: mongoose.Schema.Types.Mixed,
    matchScore: mongoose.Schema.Types.Mixed,
    error: String
  },
  { timestamps: true }
);

jobAnalysisSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('JobAnalysis', jobAnalysisSchema);
