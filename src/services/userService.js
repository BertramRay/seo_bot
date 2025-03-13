const userRepository = require('../repositories/UserRepository');
const { logger } = require('../utils/logger');

/**
 * 根据ID获取用户
 * @param {string} id - 用户ID
 * @returns {Promise<Object>} - 用户对象
 */
exports.getUserById = async (id) => {
  return await userRepository.getUserById(id);
};

/**
 * 处理GitHub登录
 * @param {Object} profile - GitHub用户资料
 * @returns {Promise<Object>} - 用户对象
 */
exports.handleGithubLogin = async (profile) => {
  try {
    // 查找是否已存在该GitHub ID的用户
    let user = await userRepository.getUserByGithubId(profile.id);
    
    if (user) {
      // 用户存在，更新最后登录时间
      logger.info(`GitHub用户登录: ${user.username} (${user._id})`);
      return await userRepository.updateLastLogin(user._id);
    }
    
    // 查找是否有相同邮箱的用户
    if (profile.emails && profile.emails.length > 0) {
      const email = profile.emails[0].value;
      user = await userRepository.getUserByEmail(email);
      
      if (user) {
        // 有相同邮箱的用户，关联GitHub ID
        logger.info(`关联GitHub账号到现有用户: ${user.username} (${user._id})`);
        return await userRepository.updateUser(user._id, {
          githubId: profile.id,
          lastLogin: new Date()
        });
      }
    }
    
    // 创建新用户
    const userData = {
      username: profile.username || profile.displayName || `github_${profile.id}`,
      email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : `${profile.id}@github.user`,
      displayName: profile.displayName || profile.username,
      githubId: profile.id,
      profilePicture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
      role: 'user',
      lastLogin: new Date(),
      isActive: true
    };
    
    logger.info(`创建新GitHub用户: ${userData.username}`);
    return await userRepository.createUser(userData);
  } catch (error) {
    logger.error(`GitHub登录处理错误: ${error.message}`);
    throw error;
  }
};

/**
 * 更新用户资料
 * @param {string} id - 用户ID
 * @param {Object} updateData - 更新数据
 * @returns {Promise<Object>} - 更新后的用户对象
 */
exports.updateUserProfile = async (id, updateData) => {
  // 过滤掉不允许用户更新的字段
  const allowedFields = ['displayName', 'settings'];
  const filteredData = {};
  
  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      filteredData[key] = updateData[key];
    }
  });
  
  return await userRepository.updateUser(id, filteredData);
};

/**
 * 获取用户统计信息
 * @returns {Promise<Object>} - 统计信息
 */
exports.getUserStats = async () => {
  const [totalUsers, activeUsers, adminUsers] = await Promise.all([
    userRepository.countUsers(),
    userRepository.countUsers({ isActive: true }),
    userRepository.countUsers({ role: 'admin' })
  ]);
  
  return {
    totalUsers,
    activeUsers,
    adminUsers
  };
};

/**
 * 获取所有用户
 * @param {Object} options - 查询选项
 * @returns {Promise<Array>} - 用户数组
 */
exports.getAllUsers = async (options = {}) => {
  return await userRepository.getAllUsers(options);
};

/**
 * 更改用户角色
 * @param {string} id - 用户ID
 * @param {string} role - 新角色
 * @returns {Promise<Object>} - 更新后的用户对象
 */
exports.changeUserRole = async (id, role) => {
  if (!['user', 'admin'].includes(role)) {
    throw new Error('无效的角色');
  }
  
  return await userRepository.updateUser(id, { role });
};

/**
 * 激活/停用用户
 * @param {string} id - 用户ID
 * @param {boolean} isActive - 是否激活
 * @returns {Promise<Object>} - 更新后的用户对象
 */
exports.toggleUserStatus = async (id, isActive) => {
  return await userRepository.updateUser(id, { isActive });
}; 