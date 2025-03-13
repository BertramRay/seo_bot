# 贡献指南

感谢您对 SEO 博客生成系统的关注！我们非常欢迎社区成员的贡献，无论是功能增强、bug修复、文档改进还是性能优化。本指南将帮助您了解如何为项目做出贡献。

## 目录

- [行为准则](#行为准则)
- [开始贡献](#开始贡献)
- [开发环境设置](#开发环境设置)
- [代码风格](#代码风格)
- [提交规范](#提交规范)
- [分支策略](#分支策略)
- [Pull Request流程](#pull-request流程)
- [测试指南](#测试指南)
- [文档贡献](#文档贡献)
- [问题反馈](#问题反馈)

## 行为准则

我们希望所有参与者都能创造一个友好、包容的环境。请尊重其他贡献者，保持建设性的沟通方式。

## 开始贡献

1. 首先，在GitHub上Fork本仓库
2. 将Fork后的仓库克隆到本地
   ```bash
   git clone https://github.com/YOUR_USERNAME/seo_bot.git
   cd seo_bot
   ```
3. 添加上游仓库
   ```bash
   git remote add upstream https://github.com/bertramray/seo_bot.git
   ```
4. 创建新分支进行开发
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 开发环境设置

1. 安装依赖
   ```bash
   npm install
   ```

2. 复制环境变量文件并配置
   ```bash
   cp .env.example .env
   ```
   
3. 启动开发服务器
   ```bash
   npm run dev
   ```

## 代码风格

我们使用ESLint和Prettier来保持代码风格的一致性。请确保您的代码符合项目的代码风格规范。

- 使用2个空格缩进
- 使用单引号而非双引号
- 每行代码不超过100个字符
- 使用驼峰命名法(camelCase)命名变量和函数
- 使用帕斯卡命名法(PascalCase)命名类和组件

在提交代码前，请运行以下命令检查代码风格：

```bash
npm run lint
```

## 提交规范

我们使用[约定式提交](https://www.conventionalcommits.org/)规范来标准化提交信息。每个提交消息应该包含以下结构：

```
<类型>[可选的作用域]: <描述>

[可选的正文]

[可选的脚注]
```

常用的提交类型包括：

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码风格修改（不影响代码功能）
- `refactor`: 代码重构（既不是新功能也不是修复bug）
- `perf`: 性能优化
- `test`: 添加或修改测试
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(admin): 添加主题批量操作功能

- 支持批量删除主题
- 支持批量更新主题状态

解决了 #123 问题
```

## 分支策略

- `main`: 主分支，保持稳定可发布状态
- `develop`: 开发分支，包含最新的开发代码
- `feature/*`: 功能分支，用于开发新功能
- `bugfix/*`: 修复分支，用于修复bug
- `docs/*`: 文档分支，用于更新文档
- `release/*`: 发布分支，用于准备新版本发布

## Pull Request流程

1. 确保您的分支与最新的上游代码同步
   ```bash
   git fetch upstream
   git rebase upstream/develop
   ```

2. 推送您的分支到GitHub
   ```bash
   git push origin feature/your-feature-name
   ```

3. 在GitHub上创建Pull Request，从您的分支到原仓库的`develop`分支

4. 在PR描述中清晰地说明您的更改内容、解决的问题或添加的功能

5. 等待代码审查，并根据反馈进行必要的修改

6. 一旦PR被批准，它将被合并到主仓库

## 测试指南

为了确保代码质量，我们鼓励为所有新功能和bug修复编写测试。

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- tests/services/contentGenerator.test.js
```

## 文档贡献

文档是项目的重要组成部分。如果您发现文档中的错误或需要改进的地方，请提交PR。

- API文档位于`docs/api`目录
- 用户指南位于`docs/guide`目录
- 开发者文档位于`docs/dev`目录

## 问题反馈

如果您发现bug或有新功能建议，请在GitHub上[创建Issue](https://github.com/bertramray/seo_bot/issues/new/choose)。

创建Issue时，请尽可能提供详细信息：

- 对于bug：描述问题、复现步骤、预期行为和实际行为
- 对于功能请求：描述功能、使用场景和预期效果

---

再次感谢您的贡献！如有任何问题，请随时联系项目维护者。 