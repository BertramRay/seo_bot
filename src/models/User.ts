import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types';

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    githubId: {
      type: String,
      sparse: true,  // 允许为空，但设置了的话必须唯一
      unique: true,
      index: true
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    // 域名相关字段
    subdomain: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
      index: true,
      match: [/^[a-z0-9](?:[a-z0-9\-]{1,61}[a-z0-9])?$/, '子域名格式不正确']
    },
    customDomain: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
      index: true
    },
    domainStatus: {
      type: String,
      enum: ['pending', 'active', 'failed', 'inactive'],
      default: 'inactive'
    },
    domainVerifiedAt: {
      type: Date
    },
    sslStatus: {
      type: String,
      enum: ['pending', 'active', 'failed', 'inactive'],
      default: 'inactive'
    },
    settings: {
      // 博客设置
      blog: {
        title: {
          type: String,
          default: '我的SEO博客'
        },
        description: {
          type: String,
          default: '自动生成的高质量SEO博客内容'
        },
        language: {
          type: String,
          default: 'zh-CN'
        },
        postsPerPage: {
          type: Number,
          default: 10
        },
        showAuthor: {
          type: Boolean,
          default: true
        },
        showDate: {
          type: Boolean,
          default: true
        },
        showSocialShare: {
          type: Boolean,
          default: true
        }
      },
      // SEO设置
      seo: {
        defaultTitle: {
          type: String
        },
        defaultDescription: {
          type: String
        },
        defaultKeywords: {
          type: [String]
        },
        useSitemaps: {
          type: Boolean,
          default: true
        },
        useRobotsTxt: {
          type: Boolean,
          default: true
        },
        useStructuredData: {
          type: Boolean,
          default: true
        },
        useCanonicalUrls: {
          type: Boolean,
          default: true
        }
      },
      // 内容生成设置
      content: {
        autoGenerate: {
          type: Boolean,
          default: false
        },
        frequency: {
          type: String,
          default: 'daily'
        },
        postsPerBatch: {
          type: Number,
          default: 1
        },
        minWordsPerPost: {
          type: Number,
          default: 800
        },
        maxWordsPerPost: {
          type: Number,
          default: 1500
        },
        autoPublish: {
          type: Boolean,
          default: false
        },
        customCronExpression: {
          type: String,
          default: '0 3 * * *'
        }
      },
      // 域名设置
      domain: {
        customDomain: {
          type: String
        },
        useCustomDomain: {
          type: Boolean,
          default: false
        },
        verificationStatus: {
          type: String,
          enum: ['pending', 'verified', 'failed'],
          default: 'pending'
        },
        lastVerified: {
          type: Date
        }
      }
    }
  },
  { 
    timestamps: true
  }
);

// 创建复合索引
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

// 创建模型
const User = mongoose.model<IUser>('User', userSchema);

export default User; 