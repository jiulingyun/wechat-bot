import { SQLiteManager } from '../core/sqlite_manager.ts'

const cozeFileDB = new SQLiteManager()
const cozeFileTable = cozeFileDB.forTable('wechat_recent_messages')



cozeFileTable.update(1, {
    last_message_time: 1755058910
})