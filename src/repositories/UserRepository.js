const User = require('../models/User');

/**
 * 根据ID查找用户
 * @param {string} id - 用户ID
 * @returns {Promise<Object>} - 用户对象
 */
exports.getUserById = async (id) => {
  return await User.findById(id);
};

/**
 * 根据邮箱查找用户
 * @param {string} email - 用户邮箱
 * @returns {Promise<Object>} - 用户对象
 */
exports.getUserByEmail = async (email) => {
  return await User.findOne({ email });
};

/**
 * 根据GitHub ID查找用户
 * @param {string} githubId - GitHub ID
 * @returns {Promise<Object>} - 用户对象
 */
exports.getUserByGithubId = async (githubId) => {
  return await User.findOne({ githubId });
};

/**
 * 创建新用户
 * @param {Object} userData - 用户数据
 * @returns {Promise<Object>} - 创建的用户对象
 */
exports.createUser = async (userData) => {
  const user = new User(userData);
  return await user.save();
};

/**
 * 更新用户信息
 * @param {string} id - 用户ID
 * @param {Object} updateData - 更新数据
 * @returns {Promise<Object>} - 更新后的用户对象
 */
exports.updateUser = async (id, updateData) => {
  return await User.findByIdAndUpdate(
    id, 
    updateData, 
    { new: true, runValidators: true }
  );
};

/**
 * 更新用户最后登录时间
 * @param {string} id - 用户ID
 * @returns {Promise<Object>} - 更新后的用户对象
 */
exports.updateLastLogin = async (id) => {
  return await User.findByIdAndUpdate(
    id,
    { lastLogin: new Date() },
    { new: true }
  );
};

/**
 * 获取所有用户
 * @param {Object} options - 查询选项
 * @returns {Promise<Array>} - 用户数组
 */
exports.getAllUsers = async (options = {}) => {
  const { role, isActive, limit = 100, skip = 0 } = options;
  
  const query = {};
  
  if (role) {
    query.role = role;
  }
  
  if (isActive !== undefined) {
    query.isActive = isActive;
  }
  
  return await User.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * 统计用户数量
 * @param {Object} options - 查询选项
 * @returns {Promise<number>} - 用户数量
 */
exports.countUsers = async (options = {}) => {
  const { role, isActive } = options;
  
  const query = {};
  
  if (role) {
    query.role = role;
  }
  
  if (isActive !== undefined) {
    query.isActive = isActive;
  }
  
  return await User.countDocuments(query);
}; 