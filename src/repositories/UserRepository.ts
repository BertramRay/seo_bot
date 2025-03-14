import User from '../models/User';
import { IUser } from '../types';

interface UserData {
  username: string;
  email: string;
  displayName?: string;
  githubId?: string;
  profilePicture?: string | null;
  role: 'user' | 'admin';
  lastLogin?: Date;
  isActive?: boolean;
}

interface UserUpdateData {
  displayName?: string;
  settings?: Record<string, any>;
  githubId?: string;
  lastLogin?: Date;
  role?: 'user' | 'admin';
  isActive?: boolean;
}

interface UserQueryOptions {
  role?: string;
  isActive?: boolean;
  limit?: number;
  skip?: number;
}

/**
 * 根据ID查找用户
 * @param id - 用户ID
 * @returns 用户对象
 */
export const getUserById = async (id: string): Promise<IUser | null> => {
  return await User.findById(id);
};

/**
 * 根据邮箱查找用户
 * @param email - 用户邮箱
 * @returns 用户对象
 */
export const getUserByEmail = async (email: string): Promise<IUser | null> => {
  return await User.findOne({ email });
};

/**
 * 根据GitHub ID查找用户
 * @param githubId - GitHub ID
 * @returns 用户对象
 */
export const getUserByGithubId = async (githubId: string): Promise<IUser | null> => {
  return await User.findOne({ githubId });
};

/**
 * 创建新用户
 * @param userData - 用户数据
 * @returns 创建的用户对象
 */
export const createUser = async (userData: UserData): Promise<IUser> => {
  const user = new User(userData);
  return await user.save();
};

/**
 * 更新用户信息
 * @param id - 用户ID
 * @param updateData - 更新数据
 * @returns 更新后的用户对象
 */
export const updateUser = async (id: string, updateData: UserUpdateData): Promise<IUser | null> => {
  return await User.findByIdAndUpdate(
    id, 
    updateData, 
    { new: true, runValidators: true }
  );
};

/**
 * 更新用户最后登录时间
 * @param id - 用户ID
 * @returns 更新后的用户对象
 */
export const updateLastLogin = async (id: string): Promise<IUser | null> => {
  return await User.findByIdAndUpdate(
    id,
    { lastLogin: new Date() },
    { new: true }
  );
};

/**
 * 获取所有用户
 * @param options - 查询选项
 * @returns 用户数组
 */
export const getAllUsers = async (options: UserQueryOptions = {}): Promise<IUser[]> => {
  const { role, isActive, limit = 100, skip = 0 } = options;
  
  const query: Record<string, any> = {};
  
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
 * @param options - 查询选项
 * @returns 用户数量
 */
export const countUsers = async (options: { role?: string; isActive?: boolean } = {}): Promise<number> => {
  const { role, isActive } = options;
  
  const query: Record<string, any> = {};
  
  if (role) {
    query.role = role;
  }
  
  if (isActive !== undefined) {
    query.isActive = isActive;
  }
  
  return await User.countDocuments(query);
}; 