# 贡献指南 / Contribution Guide

[简体中文](#简体中文) | [English](#english)

## 简体中文

感谢您有兴趣为 WeChat-Ferry 项目做出贡献！WeChat-Ferry 是一个智能微信机器人项目，结合了WeChat Ferry和Coze API，能够自动处理微信消息。以下是参与项目开发的指南。

### 开发环境设置

1. Fork 此仓库到您的账户
2. 克隆仓库到本地
```bash
git clone https://github.com/<your-username>/wechat-bot.git
cd wechat-bot
```

3. 安装依赖
```bash
npm install
```

4. 配置环境变量
```bash
cp .env.example .env.development
# 编辑 .env.development 文件，填入必要的配置
```

### 开发流程

1. 创建新分支
```bash
git checkout -b feature/your-feature-name
```

2. 编写代码并添加测试（如适用）

3. 运行测试
```bash
npm run test
```

4. 构建项目
```bash
npm run build
```

5. 提交更改
```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

6. 创建 Pull Request

### 代码规范

- 使用 TypeScript 编写代码，确保类型安全
- 遵循 ESLint 配置进行代码风格检查
- 为新功能添加适当的单元测试
- 在提交前运行 `npm run lint` 检查代码质量

### 提交信息格式

请使用以下格式编写提交信息：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码样式调整（不影响代码逻辑）
- `refactor`: 重构代码
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动

---

## English

Thank you for your interest in contributing to the WeChat-Ferry project! WeChat-Ferry is an intelligent WeChat bot project that combines WeChat Ferry and Coze API to automatically handle WeChat messages. Here are the guidelines for participating in project development.

### Setting Up Development Environment

1. Fork this repository to your account
2. Clone the repository locally
```bash
git clone https://github.com/<your-username>/wechat-bot.git
cd wechat-bot
```

3. Install dependencies
```bash
npm install
```

4. Configure environment variables
```bash
cp .env.example .env.development
# Edit .env.development file and fill in necessary configurations
```

### Development Process

1. Create a new branch
```bash
git checkout -b feature/your-feature-name
```

2. Write code and add tests (if applicable)

3. Run tests
```bash
npm run test
```

4. Build the project
```bash
npm run build
```

5. Commit changes
```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

6. Create a Pull Request

### Code Standards

- Write code in TypeScript, ensuring type safety
- Follow ESLint configuration for code style checks
- Add appropriate unit tests for new features
- Run `npm run lint` to check code quality before committing

### Commit Message Format

Please use the following format for commit messages:

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation updates
- `style`: Code style adjustments (doesn't affect code logic)
- `refactor`: Code refactoring
- `test`: Testing related
- `chore`: Build process or auxiliary tool changes