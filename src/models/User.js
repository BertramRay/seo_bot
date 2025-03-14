const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    displayName: {
      type: String,
      trim: true
    },
    githubId: {
      type: String,
      sparse: true,  // 允许为空，但设置了的话必须唯一
      unique: true,
      index: true
    },
    profilePicture: {
      type: String,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true
    },
    lastLogin: {
      type: Date,
      default: Date.now,
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
      theme: {
        type: String,
        default: 'light',
      },
      notifications: {
        type: Boolean,
        default: true,
      },
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
        logo: {
          type: String
        },
        primaryColor: {
          type: String,
          default: '#3498db'
        },
        secondaryColor: {
          type: String,
          default: '#2ecc71'
        },
        // 语言设置
        language: {
          type: String,
          default: 'zh-CN'
        },
        // 联系邮箱
        contactEmail: {
          type: String
        },
        // 内容生成设置
        content: {
          model: {
            type: String,
            default: 'gpt-4o'
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
          enableFeaturedImages: {
            type: Boolean,
            default: true
          }
        },
        // SEO设置
        seo: {
          metaTitle: {
            type: String
          },
          metaDescription: {
            type: String
          },
          generateSitemap: {
            type: Boolean,
            default: true
          },
          enableCanonical: {
            type: Boolean,
            default: true
          },
          robotsTxt: {
            type: String
          }
        },
        // 自动发布设置
        schedule: {
          enableScheduledGeneration: {
            type: Boolean,
            default: false
          },
          generationCronExpression: {
            type: String,
            default: '0 3 * * *'
          },
          postsPerScheduledRun: {
            type: Number,
            default: 1
          }
        }
      }
    }
  },
  { 
    timestamps: true,
    // 创建复合索引
    indexes: [
      // 按角色和活跃状态查询
      { role: 1, isActive: 1 },
      // 按创建时间排序
      { createdAt: -1 }
    ]
  }
);

// 创建模型
const User = mongoose.model('User', userSchema);

module.exports = User; 