const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// 创建复合索引，确保每个用户的主题名称唯一
topicSchema.index({ name: 1, user: 1 }, { unique: true });

const Topic = mongoose.model('Topic', topicSchema);

module.exports = Topic; 