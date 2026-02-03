# WeChat-Ferry 智能个人代理助手

[![License](https://img.shields.io/github/license/iantsai/wechat-bot)](LICENSE)
[![Stars](https://img.shields.io/github/stars/iantsai/wechat-bot)](https://github.com/iantsai/wechat-bot)

简体中文 | [English](./README.en.md)

## 📖 项目简介

WeChat-Ferry 是一个智能个人代理助手项目，通过结合微信协议和Coze API，实现了一个能够自动处理微信消息的AI驱动聊天机器人。该项目最初是作者的个人智能代理尝试，现已发展为一个功能完整的微信自动化代理系统。



## ✨ 主要功能

- **AI驱动的消息处理** - 基于Coze API的智能对话系统
- **多媒体消息支持** - 处理文本、图片、语音、视频和文件消息
- **消息缓冲机制** - 防止消息抖动，合并连续消息
- **队列处理** - 确保消息按顺序处理，避免并发冲突
- **敷衍回复机制** - 在AI响应较慢时提供即时反馈
- **好友验证处理** - 自动处理好友请求并分析用户信息
- **未读消息处理** - 登录后自动处理未读消息
- **数据库持久化** - 使用SQLite存储会话和文件信息
- **微信表情识别** - 将微信表情转换为图像进行AI分析

## 🔧 技术栈

- **TypeScript** - 类型安全的编程语言
- **WeChat Ferry Agent** - 微信协议封装
- **Coze API** - AI对话和工作流引擎
- **SQLite** - 轻量级关系数据库
- **Fast XML Parser** - XML消息解析
- **Better-SQLite3** - SQLite数据库操作
- **File-Box** - 文件传输处理

## 🚀 快速开始

### 环境准备

1. **安装依赖**

```bash
npm install
```

2. **配置环境变量**

创建 `.env.development` 文件并填写必要信息：

```env
# API配置
COZE_API_DOMAIN=api.coze.cn
COZE_APP_ID=your_app_id
COZE_KEY_ID=your_key_id
COZE_BOT_ID=your_bot_id

# 工作流ID配置
COZE_IMAGE_UNDERSTAND_WORKFLOW_ID=your_workflow_id
COZE_INTENT_RECOGNITION_WORKFLOW_ID=your_workflow_id
COZE_APOLOGY_REPLY_WORKFLOW_ID=your_workflow_id

# 系统配置
COZE_APOLOGY_REPLY_TIMEOUT=30
MESSAGE_BUFFER_TIMEOUT=10000
SYSTEM_MESSAGE_MARK='[系统消息]-system_message'
```

### 运行项目

```bash
# 开发模式
npm run dev

# 生产构建
npm run build
npm start
```

### 环境配置

1. **Coze API 密钥**

   你需要从 [Coze](https://www.coze.cn/) 获取API密钥和相关配置：
   - API Domain (如 api.coze.cn)
   - App ID
   - Key ID
   - Bot ID

2. **Coze 私钥文件**

   将你的Coze私钥保存为 `coze_private_key.pem` 文件到项目根目录。

3. **微信客户端**

   确保已安装支持WeChat Ferry的微信客户端。

## 📁 项目结构

```
wechat-bot/
├── src/                    # 源代码目录
│   ├── app.ts             # 主入口文件
│   ├── config/            # 配置管理
│   │   ├── loader.ts      # 环境变量加载器
│   │   └── json_loader.ts # JSON配置加载器
│   ├── core/              # 核心功能模块
│   │   ├── wechat_manager.ts  # 微信消息处理器
│   │   ├── coze_manager.ts    # Coze API管理器
│   │   ├── sqlite_manager.ts  # SQLite数据库管理器
│   │   └── tools.ts           # 工具函数
│   ├── data/              # 数据文件
│   │   └── wechat_config.json # 微信配置
│   └── tests/             # 测试文件
├── docs/                  # 项目文档
│   ├── README.md                   # 文档概述
│   ├── architecture.md             # 系统架构和模块职责
│   ├── modules.md                  # 模块职责详解
│   ├── message_flow.md             # 消息流详解
│   └── multi_agent_architecture.md # 多Agent架构图
├── logs/                  # 日志目录
├── .env.development       # 开发环境配置
├── .env.production        # 生产环境配置
├── package.json           # 项目配置
└── README.md              # 项目说明
```

## 🛠️ 核心功能详解

### WeChat Manager (微信管理器)

微信管理器是项目的核心组件，负责处理各种类型的微信消息：

- **文本消息处理** - 直接转发给AI处理
- **多媒体消息处理** - 上传到Coze后处理
- **语音消息处理** - 转文字后处理
- **表情消息处理** - 解密并转换为图像
- **引用回复处理** - 解析XML格式的引用消息
- **好友验证处理** - 解析验证信息并通知AI

### Coze Manager (Coze管理器)

Coze管理器封装了与Coze API的所有交互：

- **JWT Token管理** - 自动刷新认证令牌
- **聊天会话管理** - 维护持续对话
- **工作流执行** - 运行预设的工作流
- **文件上传** - 处理多媒体文件
- **语音转文字** - 将语音转换为文本

### SQLite Manager (数据库管理器)

数据库管理器提供轻量级的数据持久化：

- **文件信息存储** - 保存上传到Coze的文件信息
- **会话信息存储** - 维护用户与机器人的对话历史
- **消息时间跟踪** - 记录用户最后消息时间

## ⚙️ 配置选项

### 环境变量配置

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| COZE_API_DOMAIN | Coze API域名 | api.coze.cn |
| COZE_APP_ID | Coze应用ID | - |
| COZE_KEY_ID | Coze密钥ID | - |
| COZE_BOT_ID | Coze机器人ID | - |
| COZE_APOLOGY_REPLY_TIMEOUT | 敷衍回复超时时间（秒） | 30 |
| MESSAGE_BUFFER_TIMEOUT | 消息缓冲时间（毫秒） | 10000 |

### 微信配置

在 `src/data/wechat_config.json` 中配置：

```json
{
  "admin_id": "",  // 管理员ID
  "pause_takeover_user_code": "[皱眉][皱眉][皱眉]",  // 暂停接管指令
  "resume_takeover_user_code": "[微笑][微笑][微笑]",  // 恢复接管指令
  "pause_takeover_user_list": []  // 暂停接管的用户列表
}
```



## 🤖 使用场景

- **个人助理** - 自动回复日常微信消息
- **客服机器人** - 处理客户咨询和常见问题
- **信息聚合** - 收集和整理重要信息
- **任务自动化** - 执行预设的微信操作
- **智能提醒** - 根据上下文发送提醒消息

## 🛡️ 安全注意事项

- 严格保护API密钥，不要提交到版本控制系统
- 确保运行环境的安全性，定期更新依赖
- 谨慎处理敏感信息，遵循最小权限原则
- 监控机器人行为，防止滥用
- 项目已配置.gitignore排除敏感文件（.env.*, *.pem等）

## 🤝 贡献指南

我们欢迎各种形式的贡献：

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

详情请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md) 文件。

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。



## 📞 支持

如果您有任何问题或建议，请随时提出 Issue 或 Pull Request。