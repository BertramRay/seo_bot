import * as userRepository from '../repositories/UserRepository';
import { logger } from '../utils/logger';
import { IUser } from '../types';

interface GithubProfile {
  id: string;
  username?: string;
  displayName?: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}

interface UserUpdateData {
  displayName?: string;
  settings?: Record<string, any>;
  githubId?: string;
  lastLogin?: Date;
  role?: 'user' | 'admin';
  isActive?: boolean;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
}

interface UserQueryOptions {
  isActive?: boolean;
  role?: string;
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
}

/**
 * 根据ID获取用户
 * @param id - 用户ID
 * @returns 用户对象
 */
export const getUserById = async (id: string): Promise<IUser> => {
  // @ts-ignore - 忽略模块声明文件缺失的错误
  return await userRepository.getUserById(id);
};

/**
 * 处理GitHub登录
 * @param profile - GitHub用户资料
 * @returns 用户对象
 */
export const handleGithubLogin = async (profile: GithubProfile): Promise<IUser> => {
  try {
    // 查找是否已存在该GitHub ID的用户
    // @ts-ignore - 忽略模块声明文件缺失的错误
    let user = await userRepository.getUserByGithubId(profile.id);
    
    if (user) {
      // 用户存在，更新最后登录时间
      logger.info(`GitHub用户登录: ${user.username} (${user._id})`);
      // @ts-ignore - 忽略模块声明文件缺失的错误
      return await userRepository.updateLastLogin(user._id);
    }
    
    // 查找是否有相同邮箱的用户
    if (profile.emails && profile.emails.length > 0) {
      const email = profile.emails[0].value;
      // @ts-ignore - 忽略模块声明文件缺失的错误
      user = await userRepository.getUserByEmail(email);
      
      if (user) {
        // 有相同邮箱的用户，关联GitHub ID
        logger.info(`关联GitHub账号到现有用户: ${user.username} (${user._id})`);
        // @ts-ignore - 忽略模块声明文件缺失的错误
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
    // @ts-ignore - 忽略模块声明文件缺失的错误
    return await userRepository.createUser(userData);
  } catch (error: any) {
    logger.error(`GitHub登录处理错误: ${error.message}`);
    throw error;
  }
};

/**
 * 更新用户资料
 * @param id - 用户ID
 * @param updateData - 更新数据
 * @returns 更新后的用户对象
 */
export const updateUserProfile = async (id: string, updateData: UserUpdateData): Promise<IUser> => {
  // 过滤掉不允许用户更新的字段
  const allowedFields = ['displayName', 'settings'];
  const filteredData: Partial<UserUpdateData> = {};
  
  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      // @ts-ignore - 忽略类型不兼容的错误
      filteredData[key as keyof UserUpdateData] = updateData[key as keyof UserUpdateData];
    }
  });
  
  // @ts-ignore - 忽略模块声明文件缺失的错误
  return await userRepository.updateUser(id, filteredData);
};

/**
 * 获取用户统计信息
 * @returns 统计信息
 */
export const getUserStats = async (): Promise<UserStats> => {
  // @ts-ignore - 忽略模块声明文件缺失的错误
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
 * @param options - 查询选项
 * @returns 用户数组
 */
export const getAllUsers = async (options: UserQueryOptions = {}): Promise<IUser[]> => {
  // @ts-ignore - 忽略模块声明文件缺失的错误
  return await userRepository.getAllUsers(options);
};

/**
 * 更改用户角色
 * @param id - 用户ID
 * @param role - 新角色
 * @returns 更新后的用户对象
 */
export const changeUserRole = async (id: string, role: 'user' | 'admin'): Promise<IUser> => {
  if (!['user', 'admin'].includes(role)) {
    throw new Error('无效的角色');
  }
  
  // @ts-ignore - 忽略模块声明文件缺失的错误
  return await userRepository.updateUser(id, { role });
};

/**
 * 激活/停用用户
 * @param id - 用户ID
 * @param isActive - 是否激活
 * @returns 更新后的用户对象
 */
export const toggleUserStatus = async (id: string, isActive: boolean): Promise<IUser> => {
  // @ts-ignore - 忽略模块声明文件缺失的错误
  return await userRepository.updateUser(id, { isActive });
}; 