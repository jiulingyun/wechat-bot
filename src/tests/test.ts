import { WechatferryAgent } from '@wechatferry/agent'

// 创建 agent 实例
const agent = new WechatferryAgent()


agent.on('login', (userInfo) => {
  console.log('登录成功', userInfo)
})

agent.on('logout', () => {
  console.log('登出')
})

// 监听微信消息
agent.on('message', async (msg) => {
  if (msg.type === 1) {
    console.log(msg)
    if (msg.content === '测试') {
      const historyMessageList = await agent.getHistoryMessageList('iantian1995', (query) => {
        query.where('msgSvrId', '=', '7137323339897484949')
      })
      console.log(historyMessageList)
    }
  }
})

agent.on('error', (err) => {
  console.error('wcf 错误:', err)
})



// 启动 wcf
agent.start()