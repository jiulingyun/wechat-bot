/**
 * @file src/core/wechat_manager.ts
 * @description 微信管理器
 */
import { WechatMessageType } from '@wechatferry/core'
import type { WxMsg } from '@wechatferry/core'
import { WechatferryAgent } from '@wechatferry/agent'
import { CozeManager, ContentTypes, ObjectStringTypes } from './coze_manager.ts'
import { SQLiteManager, type CozeFileParams } from './sqlite_manager.ts'
import { ChatStatus } from '@coze/api';
import type { CreateChatPollData, ObjectStringItem } from '@coze/api';
import { XMLParser } from 'fast-xml-parser'
import { JsonLoader } from '../config/json_loader.ts'
import path from 'path'
import axios from 'axios';
import os from 'os';
import crypto from 'crypto';
import fs, { rename } from 'fs';
import { FileBox } from 'file-box';
import dayjs from 'dayjs';

// 发送微信消息对象
interface SendwechatMessageObject {
    tpye: WechatMessageType,
    text?: string,
    file?: FileBox,
    mentionIdList?: string[]
}


class WechatManager {
    private coze: CozeManager
    private wechat: WechatferryAgent
    private userMessageQueues: Map<string, Promise<void>> = new Map()
    private handleMessageQueues: Map<string, Promise<void>> = new Map()
    // 发送微信消息队列
    private sendWechatMessageQueues: Map<string, Promise<void>> = new Map()
    // 跟踪主列队（AI）处理状态，用于判断是否需要敷衍回复
    private userProcessingStatus: Map<string, boolean> = new Map();
    private static parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        textNodeName: 'text',
        allowBooleanAttributes: true,
        parseAttributeValue: true
    })
    // 提取常量
    private readonly COZE_BOT_ID: string
    private readonly COZE_IMAGE_UNDERSTAND_WORKFLOW_ID: string
    private wechatConfig: JsonLoader

    // coze文件数据库
    private cozeFileDB = new SQLiteManager()
    private cozeFilesTable = this.cozeFileDB.forTable('coze_files')

    // 扣子消息缓冲区，用于存储待处理的消息
    private cozeMessageBuffer: Map<string, ObjectStringItem[]> = new Map()
    // 时间窗口（毫秒）
    private readonly MESSAGE_BUFFER_TIMEOUT: number = 15000
    // 存储定时器ID的Map
    private messageBufferTimers: Map<string, NodeJS.Timeout> = new Map()

    // 扣子敷衍回复等待时长
    private COZE_APOLOGY_REPLY_TIMEOUT: number = 10


    constructor(wechatAgent: WechatferryAgent, wechatConfig: JsonLoader) {
        // 校验必要环境变量
        const requiredEnvVars = ['COZE_API_DOMAIN', 'COZE_APP_ID', 'COZE_KEY_ID', 'COZE_BOT_ID'];
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Missing required environment variable: ${envVar}`);
            }
        }

        this.COZE_BOT_ID = process.env.COZE_BOT_ID!
        this.COZE_IMAGE_UNDERSTAND_WORKFLOW_ID = process.env.COZE_IMAGE_UNDERSTAND_WORKFLOW_ID!

        this.MESSAGE_BUFFER_TIMEOUT = parseInt(process.env.MESSAGE_BUFFER_TIMEOUT!) || 15000
        this.COZE_APOLOGY_REPLY_TIMEOUT = parseInt(process.env.COZE_APOLOGY_REPLY_TIMEOUT!) * 1000 || 30000 

        this.wechatConfig = wechatConfig

        const cozeConfig = {
            baseURL: `https://${process.env.COZE_API_DOMAIN}`,
            appId: `${process.env.COZE_APP_ID}`,
            keyid: `${process.env.COZE_KEY_ID}`,
            aud: `${process.env.COZE_API_DOMAIN}`,
            privateKeyPath: path.join(process.cwd(), 'coze_private_key.pem')
        };
        this.coze = new CozeManager(cozeConfig)
        this.wechat = wechatAgent
    }


    /**
     * 处理的消息进行回复
     * @param message 微信消息
     */
    public async handleMessage(message: WxMsg) {

        // 暂停接管模式
        if (this.isPauseTakeover(message)) {
            console.debug(`${message.roomid} 当前用户被暂停接管`)
            return
        }

        // 如果是自己发送的消息则忽略
        if (message.is_self == true) {
            this.handleSelfTextMessage(message)
            return
        }

        // 更新最近消息时间
        this.updateLastMessageTime(message.sender, message.ts)

        // 文本消息处理
        if (message.type === WechatMessageType.Text) {
            this.enqueueHndleMessage(message.sender, () => this.handleTextMessage(message))
        }

        // 表情消息处理
        if (message.type === WechatMessageType.Emoticon) {
            this.enqueueHndleMessage(message.sender, () => this.handleEmoticonMessage(message))
        }

        // 图片消息处理
        if (message.type === WechatMessageType.Image) {
            this.enqueueHndleMessage(message.sender, () => this.handleImageMessage(message))
        }

        // 视频消息处理
        if (message.type === WechatMessageType.Video) {
            this.enqueueHndleMessage(message.sender, () => this.handleVideoMessage(message))
        }

        // 语音消息处理
        if (message.type === WechatMessageType.Voice) {
            this.enqueueHndleMessage(message.sender, () => this.handleVoiceMessage(message))
        }

        // 文件消息处理
        if (message.type === WechatMessageType.File) {
            this.enqueueHndleMessage(message.sender, () => this.handleFileMessage(message))
        }

        if (message.type === WechatMessageType.VerifyMsg) {
            this.enqueueHndleMessage(`${message.sender}_verify`, () => this.handleVerifyMessage(message))
        }

        if (message.type === WechatMessageType.Sys) {
            this.enqueueHndleMessage(`${message.sender}_sys`, () => this.handSysMessage(message))
        }

        // 引用回复消息使用独立队列
        if (message.type === WechatMessageType.App) {
            this.enqueueHndleMessage(message.sender, () => this.handleQuoteReplyMessage(message))
        }
    }


    /**
     * 每个用户的消息单独列队处理
     * @param sender 
     * @param handler 
     */
    private enqueueHndleMessage(sender: string, handler: () => Promise<void>) {
        const existingPromise = this.handleMessageQueues.get(sender) || Promise.resolve()
        const newPromise = existingPromise.then(handler)
        this.handleMessageQueues.set(sender, newPromise)

        newPromise.finally(() => {
            if (this.handleMessageQueues.get(sender) === newPromise) {
                this.handleMessageQueues.delete(sender)
            }
        })
    }


    /**
     * 每个用户的单独发送微信消息列队
     * @param sender 
     * @param handler 
     */
    private addSendWechatMsgQueue(sender: string, msgObj: SendwechatMessageObject) {
        const existingPromise = this.sendWechatMessageQueues.get(sender) || Promise.resolve()
        const newPromise = existingPromise.then(() => this.sendWechatMessage(sender, msgObj));
        this.sendWechatMessageQueues.set(sender, newPromise)

        newPromise.finally(() => {
            if (this.sendWechatMessageQueues.get(sender) === newPromise) {
                this.sendWechatMessageQueues.delete(sender)
            }
        })
    }


    /**
     * 将消息发送给指定用户-列队加入消息缓冲区
     * @param sender 
     * @param handler 
     */
    private enqueueMessage(sender: string, handler: () => Promise<void>) {
        const existingPromise = this.userMessageQueues.get(sender) || Promise.resolve()
        const newPromise = existingPromise.then(handler)
        this.userMessageQueues.set(sender, newPromise)

        newPromise.finally(() => {
            if (this.userMessageQueues.get(sender) === newPromise) {
                this.userMessageQueues.delete(sender)
            }
        })
    }


    /**
     * 处理文本消息
     * @param message 
     * @returns 
     */
    private async handleTextMessage(message: WxMsg) {
        if (message.is_group == true) {
            return
        }
        if (!this.COZE_BOT_ID) {
            throw new Error("COZE_BOT_ID is not defined");
        }

        try {
            this.addToMessageBuffer({
                type: ObjectStringTypes.Text,
                text: message.content
            }, message.sender)
        } catch (error) {
            console.error('调用扣子创建会话失败', error)
        }
    }


    /**
     * 处理自己发送的消息
     * @param message 微信消息
     */
    private async handleSelfTextMessage(message: WxMsg) {
        if (message.type !== WechatMessageType.Text) {
            return
        }
        const pauseTakeoverUserCode = this.wechatConfig.get('pause_takeover_user_code', '[皱眉][皱眉][皱眉]')
        const resumeTakeoverUserCode = this.wechatConfig.get('resume_takeover_user_code', '[开心][开心][开心]')
        const pauseTakeoverUserList: string[] = this.wechatConfig.get('pause_takeover_user_list', [])
        if (message.content === pauseTakeoverUserCode) {
            pauseTakeoverUserList.push(message.roomid)
            this.wechatConfig.set('pause_takeover_user_list', pauseTakeoverUserList)
            console.debug('暂停接管用户', message.roomid)
        }
        if (message.content === resumeTakeoverUserCode) {
            pauseTakeoverUserList.splice(pauseTakeoverUserList.indexOf(message.roomid), 1)
            this.wechatConfig.set('pause_takeover_user_list', pauseTakeoverUserList)
            console.debug('恢复接管用户', message.roomid)
        }

    }


    /**
    * 处理敷衍回复，如果扣子请求存在列队任务。则发送敷衍回复
    * @param userId 
    */
    private async handleApologyReply(userId: string) {
        // 获取用户coze的列队任务
        const buffer = this.cozeMessageBuffer.get(userId);
        const sendQueue = this.sendWechatMessageQueues.get(userId);

        // 如果已经有消息在发送队列中，说明AI已经完成处理并开始发送回复，不需要敷衍回复
        if (sendQueue) {
            console.log(`用户 ${userId} 已有消息在发送队列中，跳过敷衍回复`);
            return;
        }

        // 如果用户正在处理中（有缓冲区消息且正在处理），发送敷衍回复并拦截消息
        if (this.userProcessingStatus.get(userId)) {
            const COZE_APOLOGY_REPLY_WORKFLOW_ID = process.env.COZE_APOLOGY_REPLY_WORKFLOW_ID || ''
            try {
                // 获取用户的聊天记录
                const chatLog = this.generateReadableChatLog(userId, buffer || [])
                const ret = await this.coze.runWorkflow(
                    this.COZE_BOT_ID,
                    COZE_APOLOGY_REPLY_WORKFLOW_ID,
                    { content: chatLog }
                );
                if (ret) {
                    console.log('coze reply:', ret)
                    // 不用列队发送，直接插队发送
                    this.wechat.sendText(userId, ret.data)
                }
            } catch (err) {
                console.error('coze runWorkflow error', err)
            }
            return;
        }

        // 只有当缓冲区为空且没有发送队列时才发送敷衍回复
        if (!buffer || buffer.length === 0) {
            // 原有逻辑保持不变
            const COZE_APOLOGY_REPLY_WORKFLOW_ID = process.env.COZE_APOLOGY_REPLY_WORKFLOW_ID || ''
            try {
                // 获取用户的聊天记录
                const chatLog = this.generateReadableChatLog(userId, buffer)
                const ret = await this.coze.runWorkflow(
                    this.COZE_BOT_ID,
                    COZE_APOLOGY_REPLY_WORKFLOW_ID,
                    { content: chatLog }
                );
                if (ret) {
                    console.log('coze reply:', ret)
                    // 不用列队发送，直接插队发送
                    this.wechat.sendText(userId, ret.data)
                }
            } catch (err) {
                console.error('coze runWorkflow error', err)
            }
        }
    }



    /**
     * 是否暂停接管
     * @param message 
     * @returns 
     */
    private isPauseTakeover(message: WxMsg) {
        const pauseTakeoverUserList: string[] = this.wechatConfig.get('pause_takeover_user_list', [])
        return pauseTakeoverUserList.includes(message.sender)
    }


    /**
    * 处理消息缓冲区
    * @param userId 用户ID
    */
    private async processMessageBuffer(userId: string) {
        const buffer = this.cozeMessageBuffer.get(userId);
        if (!buffer || buffer.length === 0) return;

        // 设置用户处理状态为true
        this.userProcessingStatus.set(userId, true);

        // 清空缓冲区
        this.cozeMessageBuffer.delete(userId);

        console.log(`本次处理的缓存区消息：`, buffer);

        // 调用AI处理组合消息
        if (this.COZE_BOT_ID) {
            // 设置一个延迟执行时间，用于发送敷衍回复
            const apologyReply = setTimeout(async () => {
                this.handleApologyReply(userId)
            }, this.COZE_APOLOGY_REPLY_TIMEOUT)

            try {
                const response = await this.coze.chat({
                    botId: this.COZE_BOT_ID,
                    user_id: userId,
                    content: buffer,
                    contentType: ContentTypes.ObjectString,
                });

                // 成功获取响应，清除敷衍回复定时器
                clearTimeout(apologyReply);
                await this.cozeReplyTextMessage(response, userId);
            } catch (error) {
                // 出错时也清除定时器
                clearTimeout(apologyReply);
                console.error('Coze chat error:', error);
                // 可以在这里处理错误情况
            } finally {
                // 清除用户处理状态
                this.userProcessingStatus.delete(userId);
            }
        } else {
            // 如果没有COZE_BOT_ID也要清除处理状态
            this.userProcessingStatus.delete(userId);
        }
    }


    /**
    * 添加消息到扣子缓冲区
    * @param message 微信消息
    */
    private addToMessageBuffer(message: ObjectStringItem, user_id: string) {
        const userId = user_id;

        // 如果用户正在处理中，可以直接发送敷衍回复而不添加到缓冲区
        if (this.userProcessingStatus.get(userId)) {
            // 立即处理敷衍回复
            this.handleApologyReply(userId);
            return;
        }

        if (!this.cozeMessageBuffer.has(userId)) {
            this.cozeMessageBuffer.set(userId, []);
        }

        const buffer = this.cozeMessageBuffer.get(userId)!;
        buffer.push(message);

        // 清除之前的定时器（如果存在）
        if (this.messageBufferTimers.has(userId)) {
            clearTimeout(this.messageBufferTimers.get(userId)!);
        }

        // 设置新的定时器并保存其引用
        const timerId = setTimeout(() => {
            this.enqueueMessage(userId, () => this.processMessageBuffer(userId));
            // 处理完成后从Map中清除定时器ID
            this.messageBufferTimers.delete(userId);
        }, this.MESSAGE_BUFFER_TIMEOUT);

        // 保存定时器ID
        this.messageBufferTimers.set(userId, timerId);
    }


    /**
     * 处理系统消息
     * @param message 
     * @returns 
     */
    private async handSysMessage(message: WxMsg) {
        if (message.is_group == true) {
            return
        }
        const content = `
        ## ${process.env.SYSTEM_MESSAGE_MARK}
        注意：这个是当前用户微信的系统消息，不是用户主动发送的消息。你需要根据消息内容来处理。
        ### 消息内容
        ${message.content}
        ### 发送的用户名
        ${message.sender}
        `
        try {
            if (!this.COZE_BOT_ID) {
                throw new Error("COZE_BOT_ID is not defined");
            }
            const response = await this.coze.chat({
                botId: this.COZE_BOT_ID,
                user_id: message.sender,
                content: content,
                contentType: ContentTypes.Text,
            })
            await this.cozeReplyTextMessage(response, message.sender)
        } catch (error) {
            console.error('调用扣子创建会话失败', error)
        }
    }

    private async handleVerifyMessage(message: WxMsg) {
        try {
            const xml = WechatManager.parser.parse(message.content)
            console.log('xml:', xml)

            if (!xml || !xml.msg) {
                console.error('解析xml失败')
                return
            }

            let sns_img_text = '无背景图片'
            let head_img_text = '无头像'

            if (xml.msg.snsbgimgid && typeof xml.msg.snsbgimgid === 'string' && xml.msg.snsbgimgid.length > 0) {
                const workflow = await this.coze.runWorkflow(
                    this.COZE_BOT_ID,
                    this.COZE_IMAGE_UNDERSTAND_WORKFLOW_ID,
                    {
                        "image_url": xml.msg.snsbgimgid,
                    }
                )
                if (workflow) {
                    sns_img_text = workflow.data
                }
            }

            if (xml.msg.bigheadimgurl && typeof xml.msg.bigheadimgurl === 'string') {
                const workflow1 = await this.coze.runWorkflow(
                    this.COZE_BOT_ID,
                    this.COZE_IMAGE_UNDERSTAND_WORKFLOW_ID,
                    {
                        "image_url": xml.msg.bigheadimgurl,
                    }
                )
                if (workflow1) {
                    head_img_text = workflow1.data
                }
            }

            // 接受好友
            const fun = this.wechat.wcf.acceptFriend(
                xml.msg.encryptusername,
                xml.msg.ticket,
                parseInt(xml.msg.scene, 10)
            )

            if (fun == 1) {
                const genderMap: { [key: string]: string } = { '1': '男', '2': '女' };
                const gender = genderMap[xml.msg.sex] || '未知';

                const msgContent = `
                ## ${process.env.SYSTEM_MESSAGE_MARK}
                消息类型：微信验证消息\n
                你只需要记住以下信息，无需过多回复。此条消息用户是不可见的。\n
                ### 用户微信信息\n
                昵称：${xml.msg.fromnickname}\n
                性别：${gender}\n
                个性签名：${xml.msg.sign || '无'}\n
                微信号：${xml.msg.alias || '无'}\n
                省份拼音：${xml.msg.province || '无'}\n
                城市拼音：${xml.msg.city || '无'}\n
                头像文字描述（大模型识别）：${head_img_text}\n
                朋友圈图片描述（大模型识别）: ${sns_img_text}\n
                ### 当前微信操作\n
                操作：申请好友验证\n
                ### 用户消息内容\n
                ${xml.msg.content}
                `

                console.log('发送给扣子的消息：', msgContent)

                if (this.COZE_BOT_ID) {
                    throw new Error("COZE_BOT_ID is not defined");
                }

                const response = await this.coze.chat({
                    botId: this.COZE_BOT_ID,
                    user_id: xml.msg.fromusername,
                    content: msgContent,
                    contentType: ContentTypes.Text,
                })
            }
        } catch (error) {
            console.error('处理好友验证消息失败', error)
        }
    }


    /**
     * 通过扣子响应回复微信消息
     * @param response 扣子响应
     * @param receiver 要发送的接收者
     */
    private async cozeReplyTextMessage(response: CreateChatPollData, receiver: string) {
        if (response.chat.status === ChatStatus.COMPLETED) {
            for (const item of response.messages || []) {
                try {
                    if (item.role === 'assistant' && item.type === 'answer') {
                        const contentArray = item.content.split('&&&');

                        for (const contentItem of contentArray) {

                            // 添加到消息发送列队
                            this.addSendWechatMsgQueue(receiver, { tpye: WechatMessageType.Text, text: contentItem })
                        }
                        // 更新最近消息时间text
                        this.updateLastMessageTime(receiver)
                    }
                } catch (error) {
                    console.error('Send Wechat msg error:', error)
                }
            }
        }
        if (response.chat.status === ChatStatus.FAILED) {
            this.addToMessageBuffer({
                type: 'text',
                text: '**[coze API请求失败]\n coze API返回的错误信息：' + response.chat.last_error?.msg + '\n 你找个理由重新回复用户。'
            }, receiver)
            console.log('Coze chat failed:', response.chat.last_error)
        }
    }


    /**
     * 发送微信消息
     * @param receiver 接收者
     * @param message 消息对象
     */
    private async sendWechatMessage(receiver: string, message: SendwechatMessageObject) {
        switch (message.tpye) {
            case WechatMessageType.Text:
                if (message.text) {
                    await new Promise(resolve => setTimeout(resolve, this.calculateTypingDuration(message.text || '')))
                    this.wechat.sendText(receiver, message.text, message.mentionIdList)
                }
                break
            case WechatMessageType.Image:
                if (message.file) {
                    this.wechat.sendImage(receiver, message.file)
                }
                break
            case WechatMessageType.File:
                if (message.file) {
                    this.wechat.sendFile(receiver, message.file)
                }
                break
            case WechatMessageType.Video:
                if (message.file) {
                    this.wechat.sendFile(receiver, message.file)
                }
                break
        }
    }


    /**
     * 处理语音消息
     * @param message 
     * @returns 
     */
    private async handleVoiceMessage(message: WxMsg) {
        // 参数边界检查
        if (!message) {
            console.error('handleVoiceMessage received null or undefined message');
            return;
        }

        try {
            // 上传语音消息
            const file = await this.uploadFileToCoze(message)
            if (!file) {
                throw new Error('Failed to download voice file');
            }

            message.content = '[语音消息]' + file.msg_content;
            message.type = WechatMessageType.Text
            await this.handleTextMessage(message);
        } catch (error) {
            console.error('Error handling voice message:', error);
            // 降级处理：即使语音转文字失败，也尝试处理原始消息
            message.content = '[语音消息]语音转文字失败';
            message.type = WechatMessageType.Text
            await this.handleTextMessage(message);
        }
    }


    /**
     * 处理表情消息
     * @param message 
     * @returns 
     */
    private async handleEmoticonMessage(message: WxMsg) {
        if (message.is_group == true) {
            return
        }
        if (!this.COZE_BOT_ID) {
            throw new Error("COZE_BOT_ID is not defined");
        }
        try {
            const imgNmae = await this.decryptEmojiImage(message.content)
            const fileBox = FileBox.fromFile(imgNmae)
            const file = await this.coze.uploadFile(fileBox)

            const insertParams: CozeFileParams = {
                file_id: file.id,
                bytes: file.bytes,
                file_name: file.file_name,
                file_type: ObjectStringTypes.Image,
                wx_msg_id: message.id,
                msg_content: '这是一个表情消息'
            }
            this.cozeFilesTable.insert(insertParams)

            try {
                this.addToMessageBuffer({
                    type: ObjectStringTypes.Image,
                    file_id: file.id
                }, message.sender)
                this.addToMessageBuffer({
                    type: ObjectStringTypes.Text,
                    text: '[图片是用户发来的微信表情]'
                }, message.sender)
            } catch (error) {
                console.error('❌ 调用扣子创建会话失败', error)
            }
        } catch (error) {
            console.error("❌ 处理表情文件失败，原因：", error)
            return
        }
    }


    /**
     * 处理图片消息
     * @param message 
     * @returns 
     */
    private async handleImageMessage(message: WxMsg) {
        if (message.is_group == true) {
            return
        }
        if (!this.COZE_BOT_ID) {
            throw new Error("COZE_BOT_ID is not defined");
        }
        try {
            const file = await this.uploadFileToCoze(message)
            this.addToMessageBuffer({
                type: ObjectStringTypes.Image,
                file_id: file.file_id
            }, message.sender)
        } catch (error) {
            console.error('调用扣子创建会话失败', error)
        }
    }


    /**
     * 处理视频消息
     * @param message 
     * @returns 
     */
    private async handleVideoMessage(message: WxMsg) {
        if (message.is_group == true) {
            return
        }
        if (!this.COZE_BOT_ID) {
            throw new Error("COZE_BOT_ID is not defined");
        }
        try {
            const file = await this.uploadFileToCoze(message)
            this.addToMessageBuffer({
                type: ObjectStringTypes.File,
                file_id: file.file_id
            }, message.sender)
        } catch (error) {
            console.error('调用扣子创建会话失败', error)
        }
    }



    /**
     * 处理文件消息
     * @param message 
     * @returns 
     */
    private async handleFileMessage(message: WxMsg) {
        if (message.is_group == true) {
            return
        }
        if (!this.COZE_BOT_ID) {
            throw new Error("COZE_BOT_ID is not defined");
        }
        try {
            const file = await this.uploadFileToCoze(message)
            this.addToMessageBuffer({
                type: ObjectStringTypes.File,
                file_id: file.file_id
            }, message.sender)
        } catch (error) {
            console.error('调用扣子创建会话失败', error)
        }
    }


    /**
     * 处理引用回复消息，类型=49
     * @param message
     */
    private async handleQuoteReplyMessage(message: WxMsg) {
        try {
            const xml = WechatManager.parser.parse(message.content)
            //console.debug('xml parsed successfully', xml)

            if (!xml || !xml.msg) {
                console.error('解析xml失败')
                return
            }

            // 检查必需的字段是否存在
            if (!xml.msg.appmsg || !xml.msg.appmsg.refermsg) {
                console.error('XML消息缺少必要字段')
                return
            }


            const refermsg = xml.msg.appmsg.refermsg

            //refermsg.svrid 是消息ID，refermsg.type 是消息类型，refermsg.fromusr ,refermsg.chatusr ,refermsg.displayname=发送者昵称

            // 检查refermsg中的content和title是否存在
            if (!refermsg.content || !xml.msg.appmsg.title) {
                console.error('XML消息缺少refermsg中的必要字段')
                return
            }

            // 查找已经存在的文件
            const cozeFiles = this.cozeFilesTable.find({ wx_msg_id: refermsg.svrid })

            switch (refermsg.type) {
                //引用的是文本消息
                case WechatMessageType.Text:
                    this.addToMessageBuffer({
                        type: ObjectStringTypes.Text,
                        text: `[用户引用的消息][发送人：${refermsg.fromusr}]${refermsg.content}`

                    }, message.sender)
                    break
                case WechatMessageType.Image:
                    if (cozeFiles.length > 0) {
                        this.addToMessageBuffer({
                            type: ObjectStringTypes.Image,
                            file_id: cozeFiles[0].file_id

                        }, message.sender)
                    }
                    break
                case WechatMessageType.File:
                    if (cozeFiles.length > 0) {
                        this.addToMessageBuffer({
                            type: ObjectStringTypes.File,
                            file_id: cozeFiles[0].file_id

                        }, message.sender)
                    }
                    break
                case WechatMessageType.Voice:
                    if (cozeFiles.length > 0) {
                        this.addToMessageBuffer({
                            type: ObjectStringTypes.Text,
                            text: cozeFiles[0].msg_content || `[用户引用的消息][发送人：${refermsg.fromusr}][语音]`
                        }, message.sender)
                    }
                    break
            }

            // 插入本次消息
            this.addToMessageBuffer({
                type: ObjectStringTypes.Text,
                text: xml.msg.appmsg.title
            }, message.sender)
        } catch (error) {
            console.error('解析XML时发生错误:', error)
            return
        }
    }


    /**
     * 将微信消息的文件上传到Coze
     * @param message 
     * @returns 
     */
    private async uploadFileToCoze(message: WxMsg): Promise<CozeFileParams> {

        // 定义微信消息类型与Coze对象字符串类型之间的映射
        const fileTypeMap: { [key in WechatMessageType]?: ObjectStringTypes } = {
            [WechatMessageType.Image]: ObjectStringTypes.Image,
            [WechatMessageType.Video]: ObjectStringTypes.File,
            [WechatMessageType.File]: ObjectStringTypes.File,
            [WechatMessageType.Voice]: ObjectStringTypes.Audio,
            [WechatMessageType.Emoticon]: ObjectStringTypes.Image,
        };
        try {
            const fileType = fileTypeMap[message.type];
            if (!fileType) {
                throw new Error('[文件上传]不支持的消息类型')
            }

            const fileBox = await this.wechat.downloadFile(message, 300000)
            const file = await this.coze.uploadFile(fileBox)
            let msg_content = message.content

            // 如果是音频消息，将音频转文本
            if (message.type === WechatMessageType.Voice) {
                const response = await this.coze.audioTranscriptionsText(fileBox)
                msg_content = response.text
            }

            const insertParams: CozeFileParams = {
                file_id: file.id,
                bytes: file.bytes,
                file_name: file.file_name,
                file_type: fileType,
                msg_content: msg_content,
                wx_msg_id: message.id

            }

            if (file) {
                // 存储文件信息到数据库
                try {
                    this.cozeFilesTable.insert(insertParams)
                } catch (error) {
                    console.error('存储文件信息到数据库失败', error)
                }
            }
            return insertParams
        } catch (error) {
            console.error('上传文件到Coze失败', error)
            // 抛出错误信息
            throw new Error('上传文件到Coze失败，原因：' + error)
        }
    }


    /**
     * 处理未读消息(应用程序未读消息)
     * @returns 
     */
    public handleUnreadMessage() {
        const wechatRecentMessagesTable = this.cozeFileDB.forTable('wechat_recent_messages');
        const lastMsgTimeList = wechatRecentMessagesTable.find()
        if (lastMsgTimeList.length < 1) {
            return
        }
        for (const lastMsgTime of lastMsgTimeList) {
            // 获取所有未读消息
            const unreadMessages = this.wechat.getHistoryMessageList(
                lastMsgTime.user_id,
                (sql) => {
                    sql.where('createTime', '>', lastMsgTime.last_message_time)
                        .where('isSender', 0)
                        .where('type', 1)
                }
            )
            if (unreadMessages.length > 0) {
                for (const message of unreadMessages) {
                    const dataTime = dayjs(message.createTime * 1000).format('YYYY-MM-DD HH:mm:ss')
                    this.addToMessageBuffer({
                        type: 'text',
                        text: '[未读消息]\n消息时间：' + dataTime + '\n消息内容：' + message.strContent
                    }, lastMsgTime.user_id)
                }
                this.addToMessageBuffer({
                    type: 'text',
                    text: '[**系统提示：未读消息处理**以上是未处理的微信消息，注意消息时间和当前时间差，找个合适的理由解释]'
                }, lastMsgTime.user_id)
            }
        }

    }


    /**
     * 通过文本内容计算打字速度
     * @param text 要发送的文本内容
     * @param charDuration 每一个字符的打字速度（毫秒），默认200毫秒
     * @returns 
     */
    private calculateTypingDuration(text: string, charDuration: number = 70): number {
        if (!text) {
            return 0;
        }

        charDuration += Math.floor(Math.random() * 30);
        return text.length * charDuration;
    }


    /**
     * 更新最近消息的时间
     * @param userId 微信用户
     * @param time 时间
     */
    private async updateLastMessageTime(userId: string, time: number = Date.now()) {
        try {
            const wechatRecentMessagesTable = this.cozeFileDB.forTable('wechat_recent_messages');

            // 使用upsert操作避免竞态条件
            const existingRecord = wechatRecentMessagesTable.findOne(
                { 'user_id': userId }
            );

            // time如果是毫秒，则转换为秒
            if (time > 1000000000000) {
                time = Math.floor(time / 1000);
            }

            if (!existingRecord) {
                wechatRecentMessagesTable.insert({
                    user_id: userId,
                    last_message_time: time
                });
            } else {
                wechatRecentMessagesTable.update(existingRecord.id!, {
                    last_message_time: time
                });
            }
        } catch (error) {
            console.error('Failed to update last message time:', error);
            // 根据业务需求决定是否需要重新抛出异常
            throw error;
        }
    }


    /**
     * 解密微信表情图片
     * @param xmlText 
     * @returns 返回解密后的本地文件路径
     */
    public async decryptEmojiImage(xmlText: string): Promise<string> {
        let encryptedPath: string | null = null;

        try {
            const xml = WechatManager.parser.parse(xmlText)
            // 1. 下载加密文件
            const tempFileName = `${crypto.randomUUID()}.dat`;
            encryptedPath = path.join(os.tmpdir(), tempFileName);

            const response = await axios.get(xml.msg.emoji.cdnurl, { responseType: 'arraybuffer' });
            await fs.promises.writeFile(encryptedPath, response.data);

            // 2. 解密图片
            const outputDir = path.join(process.cwd(), 'file', 'emoji');
            if (!fs.existsSync(outputDir)) {
                await fs.promises.mkdir(outputDir, { recursive: true });
            }

            const resultPath = this.wechat.wcf.decryptImage(encryptedPath, outputDir);

            if (resultPath) {
                console.log(`✅ emoji解密成功: ${resultPath}`);
                return resultPath;
            } else {
                throw new Error('❌ emoji解密失败，请查看 wechatferry 日志');
            }
        } catch (error) {
            console.error('❌ emoji解密过程出错:', error);
            throw error;
        } finally {
            // 清理临时文件
            if (encryptedPath && fs.existsSync(encryptedPath)) {
                try {
                    await fs.promises.unlink(encryptedPath);
                } catch (unlinkError) {
                    console.warn('⚠️ emoji临时文件清理失败:', unlinkError);
                }
            }
        }
    }


    /**
     * 生成AI可读的聊天记录
     * @param userId 微信用户ID/群ID
     * @param msgObjects 附加消息对象，要发送给AI的对象
     * @param limit 限制消息数量，默认15条消息
     * @returns 
     */
    public generateReadableChatLog(userId: string, msgObjects: ObjectStringItem[] = [], limit: number = 15) {
        let chatLog = '';
        const msgList = this.wechat.getHistoryMessageList(userId, (query) => {
            query.limit(limit)
        })
        for (const msg of msgList.reverse()) {
            switch (msg.type) {
                case WechatMessageType.Text:
                    if (msg.isSender === 1) {
                        chatLog += `智能体：${msg.strContent}\n`;
                    } else {
                        chatLog += `用户：${msg.strContent}\n`;
                    }
                    break
                case WechatMessageType.Image:
                case WechatMessageType.Emoticon:
                    if (msg.isSender === 1) {
                        chatLog += `智能体：[图片消息]\n`;
                    } else {
                        chatLog += `用户：[图片消息]\n`;
                    }
                    break
                case WechatMessageType.File:
                    if (msg.isSender === 1) {
                        chatLog += `智能体：[文件消息]\n`;
                    } else {
                        chatLog += `用户：[文件消息]\n`;
                    }
                    break
                case WechatMessageType.Video:
                    if (msg.isSender === 1) {
                        chatLog += `智能体：[视频消息]\n`;
                    } else {
                        chatLog += `用户：[视频消息]\n`;
                    }
                    break    
                case WechatMessageType.Voice:
                    if (msg.isSender === 1) {
                        chatLog += `智能体：[语音消息]\n`;
                    } else {
                        chatLog += `用户：[语音消息]\n`;
                    }
                    break
            }
        }
        for (const msg of msgObjects) {
            if (msg.type === 'text') {
                chatLog += `用户: ${msg.text}\n`;
            }
            if (msg.type === 'image') {
                chatLog += `用户: [图片]\n`;
            }
            if (msg.type === 'file') {
                chatLog += `用户: [文件]\n`;
            }
            if (msg.type === 'audio') {
                chatLog += `用户: [语音]\n`;
            }
        }
        return chatLog ?? '暂无聊天记录'
    }


}

export { WechatManager };