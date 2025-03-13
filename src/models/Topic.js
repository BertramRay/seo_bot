const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
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
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true
    },
    postsGenerated: {
      type: Number,
      default: 0,
      index: true
    },
    lastGenerated: {
      type: Date,
      index: true
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
      required: true,
      index: true
    }
  },
  { 
    timestamps: true,
    // 添加复合索引
    indexes: [
      // 按用户和状态查询
      { user: 1, status: 1 },
      // 按优先级排序
      { priority: -1 },
      // 按创建时间排序
      { createdAt: -1 },
      // 全文搜索索引
      {
        name: 'text',
        description: 'text',
        keywords: 'text',
        categories: 'text'
      }
    ]
  }
);

// 创建复合索引，确保每个用户的主题名称唯一
topicSchema.index({ name: 1, user: 1 }, { unique: true });

const Topic = mongoose.model('Topic', topicSchema);

module.exports = Topic; 