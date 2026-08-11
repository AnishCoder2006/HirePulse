import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rawText: { type: String, required: true },
    fileName: String,
    // Cached lazily on first analysis so repeat matches against the same
    // resume don't re-embed identical text.
    embedding: { type: [Number], default: undefined }
  },
  { timestamps: true }
);

export default mongoose.model('Resume', resumeSchema);
