// sqlite_manager.ts
import Database from 'better-sqlite3';
import path from 'path';

// 定义基础数据接口
interface BaseEntity {
  id?: number;
  created_at?: number;
  updated_at?: number;
}

// Coze文件参数接口（基于你已有的定义）
interface CozeFileParams extends BaseEntity {
  file_id: string;
  bytes: number;
  file_name: string;
  file_type: string;
  msg_content?: string;
  wx_msg_id: string;
}

// 扣子会话管理表
interface CozeConversationParams extends BaseEntity {
  conversation_id: string;
  user_id: string;
  bot_id: string;
}

// 微信联系人最近消息时间表
interface WechatContactLastMsgTimeParams extends BaseEntity {
  user_id: string;
  last_message_time: number;
}

// 数据实体类型映射
interface EntityMap {
  coze_files: CozeFileParams;
  // 可以在这里添加更多实体类型
  // example_entity: ExampleEntity;
  coze_conversations: CozeConversationParams;
  wechat_recent_messages: WechatContactLastMsgTimeParams;
}

// 实体类型
type EntityType = keyof EntityMap;
type EntityData<T extends EntityType> = EntityMap[T];

class SQLiteManager {
  private db: Database.Database;

  constructor(dbPath: string = path.join(process.cwd(), 'src', 'data', 'database.sqlite')) {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  // 工厂方法创建专用表操作实例
  public forTable<T extends EntityType>(tableName: T) {
    return new TableOperator<T>(this.db, tableName);
  }


  // 关闭数据库连接
  public close() {
    this.db.close();
  }


  /**
   * 初始化数据库表结构
   */
  private initializeDatabase(): void {
    // 创建Coze文件表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS coze_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id TEXT NOT NULL UNIQUE,
        bytes INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        msg_content TEXT,
        wx_msg_id TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // 创建扣子会话表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS coze_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`
    )

    // 创建微信联系人最近消息时间表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS wechat_recent_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        last_message_time INTEGER DEFAULT (strftime('%s', 'now')),
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`);

    // 创建更新触发器
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_coze_files_updated_at 
      AFTER UPDATE ON coze_files
      BEGIN
      UPDATE coze_files SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
      END
    `);

    // 可以在这里添加更多表的初始化
    // 示例:
    // this.db.exec(`
    //   CREATE TABLE IF NOT EXISTS example_entity (
    //     id INTEGER PRIMARY KEY AUTOINCREMENT,
    //     ...
    //   )
    // `);
  }
}


// 专用表操作类
class TableOperator<T extends EntityType> {

  private db: Database.Database;
  private tableName: T;
  constructor(
    db: Database.Database,
    tableName: T
  ) {
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * 插入数据
   * @param data 数据对象
   * @returns 插入记录的ID
   */
  public insert(data: Omit<EntityData<T>, 'id' | 'created_at' | 'updated_at'>): number {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');

    const stmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (${keys.join(', ')}, created_at, updated_at)
      VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(...values);
    return result.lastInsertRowid as number;
  }

  /**
   * 根据ID查询单条记录
   * @param id 记录ID
   * @returns 记录数据或null
   */
  public findById(id: number): EntityData<T> | null {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
    return stmt.get(id) as EntityData<T> | null;
  }

  /**
   * 根据条件查询多条记录
   * @param conditions 查询条件对象
   * @param limit 限制返回记录数
   * @returns 记录数组
   */
  public find(
    conditions?: Partial<EntityData<T>>,
    limit?: number
  ): EntityData<T>[] {
    let query = `SELECT * FROM ${this.tableName}`;
    const values: any[] = [];

    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
      values.push(...Object.values(conditions));
    }

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...values) as EntityData<T>[];
  }


  /**
   * 根据条件查询单一数据
   * @param conditions 查询条件
   * @returns 
   */
  /**
 * 根据条件查询单一数据
 * @param conditions 查询条件
 * @returns 
 */
  public findOne(conditions?: Partial<EntityData<T>>): EntityData<T> | null {
    const results = this.find(conditions, 1);
    return results.length > 0 ? results[0] : null;
  }


  /**
   * 更新记录
   * @param id 记录ID
   * @param data 更新数据
   * @returns 更新的记录数
   */
  public update(id: number, data: Partial<Omit<EntityData<T>, 'id' | 'created_at' | 'updated_at'>>): number {
    // 移除可能存在的id, created_at, updated_at字段
    const { id: _, created_at: __, updated_at: ___, ...updateData } = data as any;

    const keys = Object.keys(updateData);
    if (keys.length === 0) {
      return 0;
    }

    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updateData), id];

    const stmt = this.db.prepare(`
      UPDATE ${this.tableName} 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes;
  }

  /**
   * 根据ID删除记录
   * @param id 记录ID
   * @returns 删除的记录数
   */
  public deleteById(id: number): number {
    const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes;
  }

  /**
   * 根据条件删除记录
   * @param conditions 删除条件
   * @returns 删除的记录数
   */
  public delete(conditions: Partial<EntityData<T>>): number {
    const keys = Object.keys(conditions);
    if (keys.length === 0) {
      throw new Error('Delete conditions cannot be empty');
    }

    const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(conditions);

    const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE ${whereClause}`);
    const result = stmt.run(...values);
    return result.changes;
  }

  /**
   * 获取表中记录总数
   * @returns 记录总数
   */
  public count(conditions?: Partial<EntityData<T>>): number {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const values: any[] = [];

    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
      values.push(...Object.values(conditions));
    }

    const stmt = this.db.prepare(query);
    const result = stmt.get(...values) as { count: number };
    return result.count;
  }

  /**
   * 执行原生SQL查询
   * @param sql SQL语句
   * @param params 查询参数
   * @returns 查询结果
   */
  public rawQuery<U>(sql: string, ...params: any[]): U[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as U[];
  }


  /**
   * 执行原生SQL查询
   * @param sql SQL语句
   */
  public exec(sql: string): void {
  this.db.exec(sql);
}
}


export { SQLiteManager, type BaseEntity, type CozeFileParams, type EntityMap, type CozeConversationParams };
export default SQLiteManager;