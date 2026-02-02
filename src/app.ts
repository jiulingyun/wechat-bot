// src/app.ts
import { loadConfig } from './config/loader.ts';
import { WechatferryAgent } from '@wechatferry/agent'
import { WechatManager } from './core/wechat_manager.ts';
import { JsonLoader } from './config/json_loader.ts'

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options: { [key: string]: string } = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      options[key] = value as string;
      if (value !== true) i++; // 跳过值参数
    }
  }
  
  return options;
}

// 解析并加载配置
const args = parseArgs();
const env = loadConfig({ env: args.env as string });
const wechatConfig = new JsonLoader('wechat_config.json');

await wechatConfig.init({
  "admin_id": "",
  "pause_takeover_user_code": "[皱眉][皱眉][皱眉]",
  "resume_takeover_user_code": "[微笑][微笑][微笑]",
  "pause_takeover_user_list": []
})

// 应用逻辑
// 创建 agent 实例
  const agent = new WechatferryAgent()
  const wechatManager = new WechatManager(agent, wechatConfig)

  // 登录成功监听
  agent.on('login', (userInfo) => {
    console.log('登录成功', userInfo)

    // 首次登录处理未读消息
    wechatManager.handleUnreadMessage()
  })

  // 监听微信消息
  agent.on('message', (msg) => {

    // 消息处理
    try {
        wechatManager.handleMessage(msg)
    } catch (error) {
        console.log('处理微信消息失败', error)
    }

    console.log(msg)
  })


  // 启动 wcf
  agent.start()