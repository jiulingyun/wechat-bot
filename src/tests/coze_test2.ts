import { CozeManager } from '../core/coze_manager.ts';
import path from 'path'
import { FileBox } from 'file-box';

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
// const response = await cozeManager.runWorkflow(
//     '7536097541386502153',
//     '7536234049100234791',
//     {
//         "image_url": "http://wx.qlogo.cn/mmhead/ver_1/2S47LnVW7dibhwov36yMkF4PWwljDzjdaR99D326argEUXdliakHB77h7LvC4X32ibBS5RUlibsl9iakricRico9O9Z99ah5EicZZ6VdlKupC2uQorgCic7d0IibqfLevcsxJSUhwd/96"
//     }
// )
const file_box = FileBox.fromFile(path.join(process.cwd(), 'file', '2510417841337255795.mp3'))
const response = await cozeManager.audioTranscriptionsText(file_box)


console.log(response);