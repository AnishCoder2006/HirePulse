import mongoose from 'mongoose';

const starStorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Optional link to the analysis / job that inspired the story
    analysis: { type: mongoose.Schema.Types.ObjectId, ref: 'JobAnalysis' },
    jobTitle: String,
    company: String,
    question: { type: String, required: true },
    situation: { type: String, default: '' },
    task: { type: String, default: '' },
    action: { type: String, default: '' },
    result: { type: String, default: '' },
    resumeSource: { type: String, default: '' },
    // User can mark favorites for quick review before interviews
    starred: { type: Boolean, default: false },
    // generated | manual
    origin: { type: String, enum: ['generated', 'manual'], default: 'generated' }
  },
  { timestamps: true }
);

starStorySchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('StarStory', starStorySchema);
