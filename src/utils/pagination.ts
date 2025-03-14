import { Query } from 'mongoose';

/**
 * 分页信息接口
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * 创建分页信息对象
 * @param page - 当前页码
 * @param limit - 每页数量
 * @param total - 总记录数
 * @returns 分页信息对象
 */
export const createPagination = (page: number, limit: number, total: number): Pagination => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * 使用QueryBuilder构建分页查询
 * @param query - Mongoose查询对象
 * @param page - 当前页码
 * @param limit - 每页数量
 * @returns 查询对象，添加了分页功能
 */
export const paginateQuery = <T>(query: Query<T[], T>, page: number, limit: number): Query<T[], T> => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
}; 