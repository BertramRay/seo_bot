import Topic from '../models/Topic';
import User from '../models/User';
import { logger } from './logger';
import { IUser } from '../types';

/**
 * 创建示例主题
 */
export const seedTopics = async (): Promise<void> => {
  try {
    logger.info('开始创建示例主题...');
    
    // 查找管理员用户
    const adminUser = await User.findOne({ role: 'admin' }) as IUser | null;
    if (!adminUser) {
      logger.warn('未找到管理员用户，无法创建示例主题');
      return;
    }
    
    // 检查管理员用户是否已有主题
    const adminTopicCount = await Topic.countDocuments({ user: adminUser._id });
    
    if (adminTopicCount > 0) {
      logger.info(`管理员已有 ${adminTopicCount} 个主题，跳过示例主题创建`);
      return;
    }
    
    // 示例主题数据
    const sampleTopics = [
      {
        name: '人工智能和机器学习入门',
        description: '面向初学者的人工智能和机器学习基础知识、应用案例和发展趋势',
        keywords: ['人工智能', '机器学习', 'AI', '深度学习', '神经网络', '算法'],
        categories: ['技术', '人工智能'],
        priority: 10,
        status: 'active',
        user: adminUser._id,
      },
      {
        name: '健康饮食与营养指南',
        description: '科学的健康饮食知识、营养搭配和减肥食谱',
        keywords: ['健康饮食', '营养学', '食谱', '减肥', '健康生活', '膳食平衡'],
        categories: ['健康', '生活'],
        priority: 8,
        status: 'active',
        user: adminUser._id,
      },
      {
        name: '旅游攻略与目的地推荐',
        description: '热门旅游目的地推荐、旅行经验分享和省钱技巧',
        keywords: ['旅游', '旅行', '目的地', '攻略', '自助游', '景点'],
        categories: ['旅游', '生活'],
        priority: 9,
        status: 'active',
        user: adminUser._id,
      },
      {
        name: '个人理财与投资基础',
        description: '理财基础知识、投资策略和财务规划方法',
        keywords: ['理财', '投资', '财务规划', '股票', '基金', '储蓄', '理财产品'],
        categories: ['财经', '投资'],
        priority: 7,
        status: 'active',
        user: adminUser._id,
      },
      {
        name: '职场技能提升指南',
        description: '职场必备软技能、沟通技巧和职业发展策略',
        keywords: ['职场', '技能', '职业发展', '沟通', '领导力', '面试', '简历'],
        categories: ['职场', '自我提升'],
        priority: 8,
        status: 'active',
        user: adminUser._id,
      },
    ];
    
    // 批量创建主题
    await Topic.insertMany(sampleTopics);
    
    logger.info(`成功为管理员创建 ${sampleTopics.length} 个示例主题`);
  } catch (error: any) {
    logger.error(`创建示例主题出错: ${error.message}`);
  }
}; 