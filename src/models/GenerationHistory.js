const mongoose = require('mongoose');

const generationHistorySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: Date.now,
    },
    requestedCount: {
      type: Number,
      required: true,
    },
    successCount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'completed',
    },
    error: {
      type: String,
    },
    topics: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic'
    }],
    posts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    }],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

const GenerationHistory = mongoose.model('GenerationHistory', generationHistorySchema);

module.exports = GenerationHistory; 