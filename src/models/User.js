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
    settings: {
      theme: {
        type: String,
        default: 'light',
      },
      notifications: {
        type: Boolean,
        default: true,
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