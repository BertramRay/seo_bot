import mongoose, { Schema, Document } from 'mongoose';
import { ITopic } from '../types';

const topicSchema = new Schema<ITopic>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Topic',
    },
    seo: {
      title: {
        type: String
      },
      description: {
        type: String
      },
      keywords: [{
        type: String,
        trim: true
      }],
      focusKeyword: {
        type: String
      }
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { 
    timestamps: true
  }
);

// 创建索引
topicSchema.index({ name: 1 });
topicSchema.index({ slug: 1 }, { unique: true });
topicSchema.index({ parent: 1 });
topicSchema.index({ createdAt: -1 });

// 添加全文搜索索引
topicSchema.index(
  { 
    name: 'text',
    description: 'text',
    'seo.keywords': 'text'
  },
  {
    weights: {
      name: 10,
      description: 5,
      'seo.keywords': 3
    }
  }
);

// 虚拟属性：文章数量
topicSchema.virtual('postCount').get(function(this: ITopic) {
  return 0; // 这里应该实现实际的文章计数逻辑
});

const Topic = mongoose.model<ITopic>('Topic', topicSchema);

export default Topic; 