import mongoose, { Schema, Document } from 'mongoose';
import { IGenerationHistory } from '../types';

const generationHistorySchema = new Schema<IGenerationHistory>(
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
      type: Schema.Types.ObjectId,
      ref: 'Topic'
    }],
    posts: [{
      type: Schema.Types.ObjectId,
      ref: 'Post'
    }],
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// 创建索引
generationHistorySchema.index({ user: 1 });
generationHistorySchema.index({ date: -1 });
generationHistorySchema.index({ status: 1 });

const GenerationHistory = mongoose.model<IGenerationHistory>('GenerationHistory', generationHistorySchema);

export default GenerationHistory; 