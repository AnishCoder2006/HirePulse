import mongoose from 'mongoose';

// Application pipeline statuses for the tracker.
export const APPLICATION_STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected'];

// Stores jobs that a user bookmarks on the search/saved pages.
// Previously these lived only in localStorage; persisting them server-side
// means they survive device switches and are available across sessions.
// Extended with application-tracker fields (status, notes, milestone dates).
const savedJobSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceId: { type: String, required: true },
    source: { type: String, default: 'adzuna' },
    title: { type: String, required: true },
    company: String,
    location: String,
    url: String,
    description: String,
    salaryMin: Number,
    salaryMax: Number,
    postedAt: Date,
    // Application tracker
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: 'saved',
      index: true
    },
    notes: { type: String, default: '' },
    appliedAt: Date,
    interviewAt: Date,
    offerAt: Date,
    rejectedAt: Date,
    statusUpdatedAt: Date
  },
  { timestamps: true }
);

// One user can't save the same external job twice.
savedJobSchema.index({ user: 1, sourceId: 1 }, { unique: true });
savedJobSchema.index({ user: 1, status: 1 });

export default mongoose.model('SavedJob', savedJobSchema);


