# API 文档

本文档描述了 SEO 博客生成系统的主要 API 接口。这些接口可用于与系统进行集成或开发第三方应用。

## 目录

- [认证](#认证)
- [文章管理](#文章管理)
- [主题管理](#主题管理)
- [内容生成](#内容生成)
- [SEO工具](#seo工具)

## 认证

所有API请求需要通过认证才能访问。我们使用JWT（JSON Web Token）进行认证。

### 获取访问令牌

```
POST /api/auth/login
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| email | string | 是 | 用户邮箱 |
| password | string | 是 | 用户密码 |

**响应：**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d21b4667d0d8992e610c85",
    "name": "用户名",
    "email": "user@example.com"
  }
}
```

### 使用令牌

在所有API请求的头部添加以下字段：

```
Authorization: Bearer YOUR_TOKEN
```

## 文章管理

### 获取文章列表

```
GET /api/posts
```

**查询参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| page | number | 否 | 页码，默认为1 |
| limit | number | 否 | 每页数量，默认为20 |
| status | string | 否 | 文章状态（published/draft/archived） |
| search | string | 否 | 搜索关键词 |

**响应：**

```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "60d21b4667d0d8992e610c85",
        "title": "文章标题",
        "slug": "article-slug",
        "excerpt": "文章摘要...",
        "status": "published",
        "createdAt": "2023-03-01T12:00:00Z",
        "updatedAt": "2023-03-01T12:00:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "pages": 5
    }
  }
}
```

### 获取文章详情

```
GET /api/posts/:id
```

**响应：**

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c85",
    "title": "文章标题",
    "slug": "article-slug",
    "content": "文章内容...",
    "excerpt": "文章摘要...",
    "keywords": ["关键词1", "关键词2"],
    "categories": ["分类1", "分类2"],
    "status": "published",
    "topic": {
      "id": "60d21b4667d0d8992e610c86",
      "name": "主题名称"
    },
    "metaTitle": "SEO标题",
    "metaDescription": "SEO描述",
    "createdAt": "2023-03-01T12:00:00Z",
    "updatedAt": "2023-03-01T12:00:00Z",
    "publishedAt": "2023-03-01T12:00:00Z"
  }
}
```

### 创建文章

```
POST /api/posts
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| title | string | 是 | 文章标题 |
| content | string | 是 | 文章内容 |
| excerpt | string | 否 | 文章摘要 |
| keywords | array | 否 | 关键词数组 |
| categories | array | 否 | 分类数组 |
| status | string | 否 | 文章状态，默认为draft |
| topic | string | 否 | 主题ID |
| metaTitle | string | 否 | SEO标题 |
| metaDescription | string | 否 | SEO描述 |

**响应：**

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c85",
    "title": "文章标题",
    "slug": "article-slug",
    "content": "文章内容...",
    "excerpt": "文章摘要...",
    "status": "draft",
    "createdAt": "2023-03-01T12:00:00Z",
    "updatedAt": "2023-03-01T12:00:00Z"
  }
}
```

### 更新文章

```
PUT /api/posts/:id
```

**请求参数：** 同创建文章

**响应：**

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c85",
    "title": "更新后的标题",
    "slug": "updated-slug",
    "content": "更新后的内容...",
    "excerpt": "更新后的摘要...",
    "status": "published",
    "updatedAt": "2023-03-02T12:00:00Z"
  }
}
```

### 删除文章

```
DELETE /api/posts/:id
```

**响应：**

```json
{
  "success": true,
  "message": "文章已删除"
}
```

## 主题管理

### 获取主题列表

```
GET /api/topics
```

**查询参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| status | string | 否 | 主题状态（active/inactive） |

**响应：**

```json
{
  "success": true,
  "data": [
    {
      "id": "60d21b4667d0d8992e610c86",
      "name": "主题名称",
      "description": "主题描述",
      "keywords": ["关键词1", "关键词2"],
      "status": "active",
      "postCount": 10
    }
  ]
}
```

### 获取主题详情

```
GET /api/topics/:id
```

**响应：**

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c86",
    "name": "主题名称",
    "description": "主题描述",
    "keywords": ["关键词1", "关键词2"],
    "categories": ["分类1", "分类2"],
    "status": "active",
    "priority": 1,
    "promptTemplate": "生成关于{{topic}}的文章...",
    "createdAt": "2023-03-01T12:00:00Z",
    "updatedAt": "2023-03-01T12:00:00Z"
  }
}
```

### 创建主题

```
POST /api/topics
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| name | string | 是 | 主题名称 |
| description | string | 否 | 主题描述 |
| keywords | array | 否 | 关键词数组 |
| categories | array | 否 | 分类数组 |
| status | string | 否 | 主题状态，默认为active |
| priority | number | 否 | 优先级，默认为0 |
| promptTemplate | string | 否 | 提示模板 |

**响应：**

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c86",
    "name": "主题名称",
    "description": "主题描述",
    "keywords": ["关键词1", "关键词2"],
    "status": "active",
    "createdAt": "2023-03-01T12:00:00Z"
  }
}
```

### 更新主题

```
PUT /api/topics/:id
```

**请求参数：** 同创建主题

**响应：**

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c86",
    "name": "更新后的主题名称",
    "description": "更新后的描述",
    "keywords": ["新关键词1", "新关键词2"],
    "status": "active",
    "updatedAt": "2023-03-02T12:00:00Z"
  }
}
```

### 删除主题

```
DELETE /api/topics/:id
```

**响应：**

```json
{
  "success": true,
  "message": "主题已删除"
}
```

## 内容生成

### 生成内容

```
POST /api/generate
```

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| topic | string | 否 | 主题ID |
| count | number | 否 | 生成数量，默认为1 |
| publishImmediately | boolean | 否 | 是否立即发布，默认为false |

**响应：**

```json
{
  "success": true,
  "data": {
    "generationId": "60d21b4667d0d8992e610c87",
    "posts": [
      {
        "id": "60d21b4667d0d8992e610c88",
        "title": "生成的文章标题",
        "slug": "generated-article-slug",
        "status": "draft"
      }
    ],
    "generationTime": 15
  }
}
```

### 获取生成历史

```
GET /api/generate/history
```

**查询参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| limit | number | 否 | 返回数量，默认为10 |

**响应：**

```json
{
  "success": true,
  "data": [
    {
      "id": "60d21b4667d0d8992e610c87",
      "topic": {
        "id": "60d21b4667d0d8992e610c86",
        "name": "主题名称"
      },
      "postCount": 1,
      "status": "completed",
      "createdAt": "2023-03-01T12:00:00Z"
    }
  ]
}
```

## SEO工具

### 生成站点地图

```
POST /api/seo/sitemap
```

**响应：**

```json
{
  "success": true,
  "data": {
    "url": "https://yourdomain.com/sitemap.xml",
    "generatedAt": "2023-03-01T12:00:00Z"
  }
}
```

### 获取SEO统计

```
GET /api/seo/stats
```

**响应：**

```json
{
  "success": true,
  "data": {
    "totalPosts": 100,
    "publishedPosts": 80,
    "totalKeywords": 150,
    "topPerformingPosts": [
      {
        "id": "60d21b4667d0d8992e610c85",
        "title": "文章标题",
        "views": 1250,
        "ranking": 3
      }
    ]
  }
}
``` 