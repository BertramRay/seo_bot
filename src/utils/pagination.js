/**
 * 创建分页信息对象
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 * @param {number} total - 总记录数
 * @returns {Object} 分页信息对象
 */
exports.createPagination = (page, limit, total) => {
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
 * @param {Object} query - Mongoose查询对象
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 * @returns {Object} 查询对象，添加了分页功能
 */
exports.paginateQuery = (query, page, limit) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
}; 