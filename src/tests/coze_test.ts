import { CozeManager } from '../core/coze_manager.ts';
import path from 'path'

// 初始化配置
const cozeConfig = {
  baseURL: 'https://api.coze.cn', // 或 'https://api.coze.cn'
  appId: '1131949059667',
  keyid: 'wJNnWB-Esp0SQASNGGPjsKlAdjqOXHyjTGeo_oGfs3I',
  aud: 'api.coze.cn',
  privateKeyPath: path.join(process.cwd(), 'coze_private_key.pem')
};

// 创建管理器实例
const cozeManager = new CozeManager(cozeConfig);

// 发起聊天
// const response = await cozeManager.chat({
//     botId: "7536097541386502153",
//     content: '还记得怎么称呼我吗？',
//     user_id: 'xiaoxiya',
//     contentType: 'text'
// });

// console.log(response.messages);
await cozeManager.chatStream({
    botId: "7537876693227864103",
    content: '我是node.js发起测试消息，叫我node哥就行，给我打个简单招呼！',
    user_id: 'xiaoxiya',
    contentType: 'text'
}, (message) => { 
  console.log('会话被创建', message);
}, (message) => { 
  //console.log('增量消息', message);
}, (message) => { 
  console.log('最终会话消息', message);
}, (error) => { 
  console.log('会话失败', error);
});