// src/config/json_loader.ts
import fs from 'fs/promises'
import path from 'path'

interface ConfigData {
  [key: string]: any
}

class JsonLoader {
  private filePath: string
  private data: ConfigData
  private initialized: boolean = false

  /**
   * 构造函数
   * @param fileName 配置文件名（相对于 src/data 目录）
   */
  constructor(fileName: string) {
    // 将配置文件默认存储在 src/data 目录下
    this.filePath = path.join(process.cwd(), 'src', 'data', fileName)
    this.data = {}
  }

  /**
   * 初始化配置文件
   * 如果文件不存在，则创建一个空的 JSON 文件
   */
  public async init(defaultData: ConfigData = {}): Promise<void> {
    try {
      const fileContent = await fs.readFile(this.filePath, 'utf-8')
      this.data = JSON.parse(fileContent)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // 文件不存在，创建新文件
        this.data = defaultData
        await this.save()
      } else {
        throw new Error(`Failed to read config file: ${error.message}`)
      }
    }
    this.initialized = true
  }

  /**
   * 获取配置值
   * @param key 配置键，支持点号分隔的嵌套键（如 'user.name'）
   * @param defaultValue 默认值
   * @returns 配置值
   */
  public get<T = any>(key: string, defaultValue?: T): T {
    this.checkInitialized()
    
    const keys = key.split('.')
    let value: any = this.data
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return defaultValue as T
      }
    }
    
    return value as T
  }

  /**
   * 设置配置值
   * @param key 配置键，支持点号分隔的嵌套键
   * @param value 配置值
   */
  public async set(key: string, value: any): Promise<void> {
    this.checkInitialized()
    
    const keys = key.split('.')
    let current = this.data
    
    // 导航到倒数第二层
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {}
      }
      current = current[k]
    }
    
    // 设置值
    current[keys[keys.length - 1]] = value
    
    // 保存到文件
    await this.save()
  }

  /**
   * 删除配置项
   * @param key 配置键
   */
  public async delete(key: string): Promise<void> {
    this.checkInitialized()
    
    const keys = key.split('.')
    let current = this.data
    
    // 导航到倒数第二层
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      if (!(k in current) || typeof current[k] !== 'object') {
        return // 键不存在，无需删除
      }
      current = current[k]
    }
    
    // 删除值
    delete current[keys[keys.length - 1]]
    
    // 保存到文件
    await this.save()
  }

  /**
   * 检查是否存在某个配置项
   * @param key 配置键
   * @returns 是否存在
   */
  public has(key: string): boolean {
    this.checkInitialized()
    
    const keys = key.split('.')
    let value: any = this.data
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return false
      }
    }
    
    return true
  }

  /**
   * 获取所有配置数据
   * @returns 所有配置数据
   */
  public getAll(): ConfigData {
    this.checkInitialized()
    return { ...this.data } // 返回副本以防止外部修改
  }

  /**
   * 设置所有配置数据
   * @param data 新的配置数据
   */
  public async setAll(data: ConfigData): Promise<void> {
    this.checkInitialized()
    this.data = { ...data } // 创建副本
    await this.save()
  }

  /**
   * 重新加载配置文件（从磁盘读取最新数据）
   */
  public async reload(): Promise<void> {
    try {
      const fileContent = await fs.readFile(this.filePath, 'utf-8')
      this.data = JSON.parse(fileContent)
    } catch (error: any) {
      throw new Error(`Failed to reload config file: ${error.message}`)
    }
  }

  /**
   * 保存配置到文件
   */
  private async save(): Promise<void> {
    try {
      // 确保目录存在
      const dir = path.dirname(this.filePath)
      try {
        await fs.access(dir)
      } catch {
        await fs.mkdir(dir, { recursive: true })
      }
      
      // 写入文件
      await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (error: any) {
      throw new Error(`Failed to save config file: ${error.message}`)
    }
  }

  /**
   * 检查是否已初始化
   */
  private checkInitialized(): void {
    if (!this.initialized) {
      throw new Error('JsonLoader not initialized. Call init() first.')
    }
  }
}

export { JsonLoader }