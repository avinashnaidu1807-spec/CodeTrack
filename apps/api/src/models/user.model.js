import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  name: { type: String, default: "CodeTrack user", trim: true },
  avatarUrl: { type: String, default: "" },
  linkedProfiles: {
    codeforces: { type: mongoose.Schema.Types.Mixed, default: null },
    leetcode: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  problems: { type: [mongoose.Schema.Types.Mixed], default: [] },
  lastLoginAt: { type: Date, default: Date.now }
}, { timestamps: true, minimize: false });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
