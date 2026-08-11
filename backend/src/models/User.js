import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    // Professional profile fields
    title: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    githubUrl: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },
    leetcodeUrl: { type: String, default: '' },
    portfolioUrl: { type: String, default: '' },
    skills: { type: [String], default: [] },
    summary: { type: String, default: '' },
    dob: { type: String, default: '' },
    gender: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
