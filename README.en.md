# WeChat-Ferry Intelligent Personal Agent Assistant

[![License](https://img.shields.io/github/license/iantsai/wechat-bot)](LICENSE)
[![Stars](https://img.shields.io/github/stars/iantsai/wechat-bot)](https://github.com/iantsai/wechat-bot)

[简体中文](./README.md) | English

## 📖 Project Overview

WeChat-Ferry is an intelligent personal agent project that combines WeChat protocols with Coze API to create an AI-powered chatbot capable of automatically handling WeChat messages. Originally started as the author's personal AI agent experiment, it has evolved into a feature-complete WeChat automation proxy system.

WeChat-Ferry is an intelligent personal agent project that combines WeChat protocols with Coze API to create an AI-powered chatbot capable of automatically handling WeChat messages. Originally started as the author's personal AI agent experiment, it has evolved into a feature-complete WeChat automation proxy system.

## ✨ Key Features

- **AI-Powered Message Processing** - Intelligent conversation system based on Coze API
- **Multi-media Support** - Handle text, images, voice, video and file messages
- **Message Buffering** - Prevent message jitter, merge consecutive messages
- **Queue Processing** - Ensure messages are processed in order, avoiding concurrency conflicts
- **Placeholder Reply Mechanism** - Provide instant feedback when AI response is slow
- **Friend Verification Handling** - Automatically process friend requests and analyze user information
- **Unread Message Processing** - Automatically process unread messages after login
- **Database Persistence** - Store sessions and file information using SQLite
- **WeChat Emoji Recognition** - Convert WeChat emojis to images for AI analysis

## 🔧 Tech Stack

- **TypeScript** - Type-safe programming language
- **WeChat Ferry Agent** - WeChat protocol wrapper
- **Coze API** - AI conversation and workflow engine
- **SQLite** - Lightweight relational database
- **Fast XML Parser** - XML message parsing
- **Better-SQLite3** - SQLite database operations
- **File-Box** - File transfer processing

## 🚀 Quick Start

### Environment Preparation

1. **Install Dependencies**

```bash
npm install
```

2. **Configure Environment Variables**

Create `.env.development` file and fill in the required information:

```env
# API Configuration
COZE_API_DOMAIN=api.coze.cn
COZE_APP_ID=your_app_id
COZE_KEY_ID=your_key_id
COZE_BOT_ID=your_bot_id

# Workflow ID Configuration
COZE_IMAGE_UNDERSTAND_WORKFLOW_ID=your_workflow_id
COZE_INTENT_RECOGNITION_WORKFLOW_ID=your_workflow_id
COZE_APOLOGY_REPLY_WORKFLOW_ID=your_workflow_id

# System Configuration
COZE_APOLOGY_REPLY_TIMEOUT=30
MESSAGE_BUFFER_TIMEOUT=10000
SYSTEM_MESSAGE_MARK='[System Message]-system_message'
```

### Running the Project

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

### Environment Configuration

1. **Coze API Keys**

   You need to obtain API keys and related configurations from [Coze](https://www.coze.cn/):
   - API Domain (e.g. api.coze.cn)
   - App ID
   - Key ID
   - Bot ID

2. **Coze Private Key File**

   Save your Coze private key as `coze_private_key.pem` file in the project root directory.

3. **WeChat Client**

   Ensure you have installed a WeChat client that supports WeChat Ferry.

## 📁 Project Structure

```
wechat-bot/
├── src/                    # Source code directory
│   ├── app.ts             # Main entry file
│   ├── config/            # Configuration management
│   │   ├── loader.ts      # Environment variable loader
│   │   └── json_loader.ts # JSON configuration loader
│   ├── core/              # Core functional modules
│   │   ├── wechat_manager.ts  # WeChat message processor
│   │   ├── coze_manager.ts    # Coze API manager
│   │   ├── sqlite_manager.ts  # SQLite database manager
│   │   └── tools.ts           # Utility functions
│   ├── data/              # Data files
│   │   └── wechat_config.json # WeChat configuration
│   └── tests/             # Test files
├── logs/                  # Log directory
├── .env.development       # Development environment configuration
├── .env.production        # Production environment configuration
├── package.json           # Project configuration
└── README.md              # Project documentation
```

## 🛠️ Core Function Details

### WeChat Manager

The WeChat manager is the core component of the project, responsible for handling various types of WeChat messages:

- **Text Message Processing** - Direct forwarding to AI for processing
- **Multi-media Message Processing** - Upload to Coze then process
- **Voice Message Processing** - Convert to text then process
- **Emoji Message Processing** - Decrypt and convert to image
- **Quote Reply Processing** - Parse quoted messages in XML format
- **Friend Verification Processing** - Parse verification info and notify AI

### Coze Manager

The Coze manager encapsulates all interactions with the Coze API:

- **JWT Token Management** - Automatic refresh of authentication tokens
- **Chat Session Management** - Maintain continuous conversations
- **Workflow Execution** - Run preset workflows
- **File Upload** - Handle multimedia files
- **Speech-to-Text** - Convert speech to text

### SQLite Manager

The database manager provides lightweight data persistence:

- **File Information Storage** - Save uploaded file information to Coze
- **Session Information Storage** - Maintain conversation history between users and bots
- **Message Time Tracking** - Record user's last message time

## ⚙️ Configuration Options

### Environment Variable Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| COZE_API_DOMAIN | Coze API domain | api.coze.cn |
| COZE_APP_ID | Coze app ID | - |
| COZE_KEY_ID | Coze key ID | - |
| COZE_BOT_ID | Coze bot ID | - |
| COZE_APOLOGY_REPLY_TIMEOUT | Placeholder reply timeout (seconds) | 30 |
| MESSAGE_BUFFER_TIMEOUT | Message buffering time (milliseconds) | 10000 |

### WeChat Configuration

Configure in `src/data/wechat_config.json`:

```json
{
  "admin_id": "",  // Administrator ID
  "pause_takeover_user_code": "[皱眉][皱眉][皱眉]",  // Pause takeover command
  "resume_takeover_user_code": "[微笑][微笑][微笑]",  // Resume takeover command
  "pause_takeover_user_list": []  // List of users paused from takeover
}
```



## 🤖 Use Cases

- **Personal Assistant** - Automatically reply to daily WeChat messages
- **Customer Service Bot** - Handle customer inquiries and common questions
- **Information Aggregation** - Collect and organize important information
- **Task Automation** - Execute preset WeChat operations
- **Smart Reminders** - Send reminder messages based on context

## 🛡️ Security Considerations

- Securely protect API keys, never commit to version control systems
- Ensure runtime environment security, update dependencies regularly
- Carefully handle sensitive information, follow least privilege principle
- Monitor bot behavior to prevent abuse
- Project configured with .gitignore to exclude sensitive files (.env.*, *.pem, etc.)

## 🤝 Contribution Guidelines

We welcome contributions in all forms:

1. Fork the project
2. Create a feature branch
3. Commit your changes
4. Submit a Pull Request

See the [CONTRIBUTING.md](./CONTRIBUTING.md) file for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

Thanks to the community developers for continuous contributions and support.

## 📞 Support

If you have any questions or suggestions, feel free to raise an Issue or Pull Request.