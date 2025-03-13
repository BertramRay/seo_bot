# SEO 博客生成系统

<div align="center">
  <img src="public/images/logo.png" alt="SEO Bot Logo" width="200" height="auto">
  <p>基于AI的SEO优化博客内容自动生成系统</p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-green.svg)](https://www.mongodb.com/)
</div>

## 📖 项目介绍

SEO 博客生成系统是一个基于 Node.js 和大型语言模型的自动化内容生成平台，专为需要持续产出高质量SEO内容的网站设计。系统可以根据预设主题和关键词，自动生成、发布和管理针对搜索引擎优化的博客文章，帮助提升网站的搜索排名和流量。

### 🌟 主要特性

- **内容自动生成**：基于预设主题和关键词自动生成高质量、原创的博客文章
- **SEO优化**：自动优化文章标题、描述、关键词和URL结构
- **主题管理**：创建和管理多个内容主题，每个主题有独立的关键词和生成策略
- **定时发布**：支持自定义发布计划，按照设定的频率自动发布内容
- **站点地图生成**：自动生成和更新网站地图，提升搜索引擎索引效率
- **管理后台**：直观的Web界面，轻松管理所有内容和配置
- **数据分析**：跟踪内容性能和访问统计

## 🔧 技术栈

- **后端框架**：Node.js + Express
- **数据库**：MongoDB
- **模板引擎**：EJS
- **AI内容生成**：OpenAI API (GPT-4)
- **认证**：Passport.js (支持GitHub登录)
- **定时任务**：node-cron
- **日志**：Winston
- **SEO工具**：自动站点地图生成、元标签优化

## 🚀 快速开始

### 前置要求

- Node.js (>= 14.0.0)
- MongoDB (>= 4.4)
- OpenAI API 密钥

### 安装步骤

1. **克隆仓库**

```bash
git clone https://github.com/bertramray/seo_bot.git
cd seo_bot
```

2. **安装依赖**

```bash
npm install
```

3. **配置环境变量**

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写必要的配置信息，特别是：
- MongoDB 连接URI
- OpenAI API 密钥
- 站点URL和博客路径
- GitHub OAuth 配置（如需使用GitHub登录）

4. **启动应用**

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

5. **访问应用**

打开浏览器访问 `http://localhost:3000` (或您在 .env 中配置的端口)

## ⚙️ 配置说明

系统的主要配置通过 `.env` 文件进行管理，主要配置项包括：

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| PORT | 应用监听端口 | 3000 |
| MONGODB_URI | MongoDB连接字符串 | mongodb://localhost:27017/seo_bot |
| OPENAI_API_KEY | OpenAI API密钥 | sk-... |
| OPENAI_MODEL | 使用的OpenAI模型 | gpt-4o |
| BLOG_TITLE | 博客标题 | 我的SEO博客 |
| SITE_URL | 网站URL | https://yourdomain.com |
| CONTENT_GENERATION_FREQUENCY | 内容生成频率 | daily, weekly, custom |
| POSTS_PER_BATCH | 每批生成的文章数量 | 5 |
| CONTENT_AUTO_PUBLISH | 是否自动发布生成的内容 | true |

更多配置项请参考 `.env.example` 文件。

## 🛠️ 开发指南

### 项目结构

```
seo_bot/
├── src/                  # 源代码
│   ├── config/           # 配置文件
│   ├── controllers/      # 控制器
│   ├── middlewares/      # 中间件
│   ├── models/           # 数据模型
│   ├── repositories/     # 数据访问层
│   ├── routes/           # 路由定义
│   ├── services/         # 业务逻辑服务
│   ├── utils/            # 工具函数
│   ├── views/            # EJS模板
│   └── index.js          # 应用入口
├── public/               # 静态资源
├── logs/                 # 日志文件
├── .env                  # 环境变量
├── .env.example          # 环境变量示例
└── package.json          # 项目依赖
```

### 架构说明

本项目采用分层架构设计：

1. **控制器层 (Controllers)**：处理HTTP请求和响应
2. **服务层 (Services)**：实现业务逻辑
3. **仓库层 (Repositories)**：处理数据访问
4. **模型层 (Models)**：定义数据结构

### 扩展指南

#### 添加新的内容生成策略

1. 在 `src/services/contentGenerator.js` 中添加新的生成方法
2. 在管理界面中添加相应的配置选项

#### 自定义主题模板

1. 修改 `src/models/Topic.js` 添加新的模板字段
2. 在 `src/views/admin/topicEdit.ejs` 中添加模板编辑界面

## 🤝 贡献指南

我们欢迎所有形式的贡献，无论是新功能、bug修复还是文档改进。

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

请确保您的代码符合项目的编码规范，并且包含适当的测试。

## 📄 许可证

本项目采用 MIT 许可证 - 详情请参见 [LICENSE](LICENSE) 文件。

## 📞 联系方式

如有任何问题或建议，请通过以下方式联系我们：

- 提交 [Issue](https://github.com/bertramray/seo_bot/issues)
- 发送邮件至 [bertramray2000@gmail.com](mailto:bertramray2000@gmail.com)

---

<div align="center">
  <p>Made with ❤️ by BertramRay</p>
</div> 