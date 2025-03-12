const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    keywords: [{
      type: String,
      trim: true,
    }],
    relatedTopics: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
    }],
    priority: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    postsGenerated: {
      type: Number,
      default: 0,
    },
    lastGenerated: {
      type: Date,
    },
    promptTemplate: {
      type: String,
    },
    categories: [{
      type: String,
      trim: true,
    }],
  },
  { timestamps: true }
);

const Topic = mongoose.model('Topic', topicSchema);

module.exports = Topic; 