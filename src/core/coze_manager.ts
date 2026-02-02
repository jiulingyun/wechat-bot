import fs from 'fs';
import { FileBox } from 'file-box';
import { SQLiteManager, type CozeConversationParams } from './sqlite_manager.ts'

import { CozeAPI, getJWTToken, RoleType, ChatEventType } from '@coze/api';
import type { ObjectStringItem, StreamChatData, ChatV3Message } from '@coze/api';

// 定义配置接口
interface CozeConfig {
  baseURL: string;
  appId: string;
  keyid: string;
  aud: string;
  privateKeyPath: string;
}

// 定义聊天参数接口
interface ChatParams {
  botId: string;
  user_id: string;
  conversationId?: string;
  customVariables?: Record<string, any>;
  content: string | ObjectStringItem[];
  contentType: ContentTypes;
}

// 定义上传扣子文件响应参数接口
interface UploadFileResponse {
  id: string;
  file_name: string;
  bytes: number;
  created_at: number;
}


const ContentTypes = {
  Text: 'text',
  ObjectString: 'object_string',
  Card: 'card'
} as const;

type ContentTypes = typeof ContentTypes[keyof typeof ContentTypes];

const ObjectStringTypes = {
  Text: 'text',
  Image: 'image',
  Audio: 'audio',
  File: 'file'
} as const;
type ObjectStringTypes = typeof ObjectStringTypes[keyof typeof ObjectStringTypes];

class CozeManager {
  private config: CozeConfig;
  private jwtToken: any;
  private client?: CozeAPI;
  private privateKey: string;

  private cozeFileDB = new SQLiteManager()
  private cozeConversationsTable = this.cozeFileDB.forTable('coze_conversations')

  /**
   * 初始化 Coze 管理器
   * @param config 配置参数
   */
  constructor(config: CozeConfig) {
    this.config = config;
    this.privateKey = fs.readFileSync(config.privateKeyPath, 'utf8');
    this.initializeClient();
  }

  /**
   * 初始化 Coze API 客户端
   */
  private async initializeClient() {
    await this.refreshToken();

    this.client = new CozeAPI({
      baseURL: this.config.baseURL,
      token: async () => {
        // 如果 token 将在 5 秒内过期，则刷新 token
        if (this.jwtToken.expires_in * 1000 > Date.now() + 5000) {
          return this.jwtToken.access_token;
        }

        await this.refreshToken();
        return this.jwtToken.access_token;
      },
    });
  }

  /**
   * 刷新 JWT token
   */
  private async refreshToken() {
    this.jwtToken = await getJWTToken({
      baseURL: this.config.baseURL,
      appId: this.config.appId,
      aud: this.config.aud,
      keyid: this.config.keyid,
      privateKey: this.privateKey,
      sessionName: 'coze-manager'
    });
  }

  /**
   * 发起聊天会话-非流式响应
   * @param params 聊天参数
   * @returns 非流式响应
   */
  public async chat(params: ChatParams) {
    if (!this.client) {
      await this.initializeClient();
    }

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const cozeConversation = this.cozeConversationsTable.findOne({
      user_id: params.user_id,
      bot_id: params.botId,
    });

    const result = await this.client.chat.createAndPoll({
      bot_id: params.botId,
      user_id: params.user_id, // 可根据需要修改
      auto_save_history: true,
      conversation_id: cozeConversation?.conversation_id,
      additional_messages: [
        {
          role: RoleType.User,
          content: params.content,
          content_type: params.contentType
        },
      ],
    });

    // 如果创建会话成功，则保存会话ID
    if (!cozeConversation) {
      this.cozeConversationsTable.insert({
        conversation_id: result.chat.conversation_id,
        user_id: params.user_id,
        bot_id: params.botId,
      });
    }
    return result
  }


  /**
 * 发起流式聊天会话
 * @param params 聊天参数
 * @param onMessageCreate 会话创建成功的回调函数
 * @param onMessageDelta 增量消息的回调函数
 * @param onChatCompleted 会话完成的回调函数
 * @param onChatFailed 会话失败的回调函数
 */
  public async chatStream(
    params: ChatParams,
    onMessageCreate?: (message: StreamChatData) => void,
    onMessageDelta?: (message: ChatV3Message) => void,
    onChatCompleted?: (usage: ChatV3Message) => void,
    onDone?: (data: any) => void,
    onChatFailed?: (error: any) => void
  ) {
    if (!this.client) {
      await this.initializeClient();
    }

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const cozeConversation = this.cozeConversationsTable.findOne({
      user_id: params.user_id,
      bot_id: params.botId,
    });

    const stream = this.client.chat.stream({
      bot_id: params.botId,
      user_id: params.user_id,
      conversation_id: cozeConversation?.conversation_id,
      additional_messages: [
        {
          role: RoleType.User,
          content: params.content,
          content_type: params.contentType
        },
      ],
    });

    for await (const event of stream) {
      switch (event.event) {
        case ChatEventType.CONVERSATION_CHAT_CREATED:
          // 如果创建会话成功，则保存会话ID
          if (!cozeConversation) {
            this.cozeConversationsTable.insert({
              conversation_id: event.data.conversation_id,
              user_id: params.user_id,
              bot_id: params.botId,
            });
          }
          onMessageCreate?.(event)
          break;

        case ChatEventType.CONVERSATION_MESSAGE_DELTA:
          onMessageDelta?.(event.data)
          break;

        case ChatEventType.CONVERSATION_MESSAGE_COMPLETED:
          onChatCompleted?.(event.data);
          break;

        case ChatEventType.DONE:
          onDone?.(event.data);
          break;

        case ChatEventType.CONVERSATION_CHAT_FAILED:
          onChatFailed?.(event.data);
          break;
      }
    }
  }

  /**
   * 执行工作流
   * @param botId 
   * @param workflowId 
   * @param params 
   * @returns 
   */
  public async runWorkflow(botId: string, workflowId: string, params: Record<string, any>) {
    if (!this.client) {
      await this.initializeClient();
    }

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const workflow = await this.client.workflows.runs.create({
        workflow_id: workflowId,
        parameters: params,
        bot_id: botId,
      });
      if (workflow && workflow.data) {
        try {
          return JSON.parse(workflow.data);
        } catch (e) {
          console.error('json parse error:', e);
          return null;
        }
      }
    } catch (error) {
      console.error('Error running workflow:', error);
      return null;
    }

  }


  /**
   * 将fileBox类型的文件转换成formData
   * @param fileBox 
   * @param paramNmae 
   * @returns 
   */
  private async fileBoxToFormData(fileBox: FileBox, paramNmae: string = 'file') {
    // 将 FileBox 转换为 Buffer
    const fileBuffer = await fileBox.toBuffer();

    // 创建 FormData 并附加文件
    const formData = new FormData();
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    // 确保是普通 ArrayBuffer，避免 SharedArrayBuffer 报错
    const safeArrayBuffer = arrayBuffer instanceof SharedArrayBuffer
      ? new Uint8Array(arrayBuffer).buffer
      : arrayBuffer;

    const uint8Array = new Uint8Array(safeArrayBuffer);
    const safeBuffer = uint8Array.buffer instanceof SharedArrayBuffer
      ? new Uint8Array(uint8Array).slice().buffer
      : uint8Array.buffer;

    formData.append(paramNmae, new Blob([safeBuffer], { type: fileBox.mediaType }), fileBox.name);
    return formData;
  }


  /**
   * 音频转文本
   * @param fileBox 
   * @returns { text: 'xxx' }
   */
  public async audioTranscriptionsText(fileBox: FileBox): Promise<any> {
    const formData = await this.fileBoxToFormData(fileBox, 'file');

    const apiUrl = `/v1/audio/transcriptions`;
    if (!this.client) {
      await this.initializeClient();
    }

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const response: any = await this.client.post(apiUrl, formData, false, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Transcription response:', response);
      if (response.code === 0) {
        return response.data;
      } else {
        throw new Error(`Failed to get audio transcriptions. Status: ${response.status}`);
      }
    } catch (error) {
      console.error('Audio transcription error:', error);
      throw error;
    }
  }


  /**
   * 上传文件到扣子
   * @param fileBox 
   * @returns 
   */
  public async uploadFile(fileBox: FileBox): Promise<UploadFileResponse> {
    const formData = await this.fileBoxToFormData(fileBox, 'file');
    const apiUrl = `/v1/files/upload`;
    if (!this.client) {
      await this.initializeClient();
    }

    if (!this.client) {
      throw new Error('Client not initialized');
    }
    try {
      const response: any = await this.client.post(apiUrl, formData, false, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Transcription response:', response);
      if (response.code === 0) {
        return response.data;
      } else {
        throw new Error(`Failed to upload file. Status: ${response.status}`);
      }
    } catch (error) {
      console.error('upload file error:', error);
      throw error;
    }

  }


  /**
   * 获取客户端实例（用于更高级的操作）
   * @returns CozeAPI 客户端实例
   */
  public getClient(): CozeAPI {
    if (!this.client) {
      throw new Error('Client not initialized');
    }
    return this.client;
  }
}

export { CozeManager, type CozeConfig, type ChatParams, type UploadFileResponse, ContentTypes, ObjectStringTypes };