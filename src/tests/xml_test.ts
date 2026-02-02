import { XMLParser } from 'fast-xml-parser'
import { WechatferryAgent } from '@wechatferry/agent'
import { SQLiteManager } from '../core/sqlite_manager.ts'

const xmlText = `<msg><emoji fromusername = "iantian1995" tousername = "wxid_aivt4q0wdspw22" type="1" idbuffer="media:0_0" md5="cff83445ec0adc5164e20fc3757f2012" len = "49073" productid="" androidmd5="cff83445ec0adc5164e20fc3757f2012" androidlen="49073" s60v3md5 = "cff83445ec0adc5164e20fc3757f2012" s60v3len="49073" s60v5md5 = "cff83445ec0adc5164e20fc3757f2012" s60v5len="49073" cdnurl = "http://vweixinf.tc.qq.com/110/20401/stodownload?m=cff83445ec0adc5164e20fc3757f2012&amp;filekey=30440201010430302e02016e0402535a04206366663833343435656330616463353136346532306663333735376632303132020300bfb1040d00000004627466730000000131&amp;hy=SZ&amp;storeid=323032323031313030393432343330303064623162613562396336336637653130633935306230303030303036653031303034666231&amp;ef=1&amp;bizid=1022" designerid = "" thumburl = "" encrypturl = "http://vweixinf.tc.qq.com/110/20402/stodownload?m=2fe97127fe6d794e9f29470c561f288b&amp;filekey=30440201010430302e02016e0402535a04203266653937313237666536643739346539663239343730633536316632383862020300bfc0040d00000004627466730000000131&amp;hy=SZ&amp;storeid=323032323031313030393432343330303065353362663562396336336637653130633935306230303030303036653032303034666232&amp;ef=2&amp;bizid=1022" aeskey= "6f01feacf6144aa3859df4ef5696ff99" externurl = "http://vweixinf.tc.qq.com/110/20403/stodownload?m=33b7a5d48ed5a05e599d8038c836c3b4&amp;filekey=3043020101042f302d02016e0402535a0420333362376135643438656435613035653539396438303338633833366333623402025a40040d00000004627466730000000131&amp;hy=SZ&amp;storeid=323032323031313030393432343330303066323664363562396336336637653130633935306230303030303036653033303034666233&amp;ef=3&amp;bizid=1022" externmd5 = "5c3fa95373d7d138a64fe636ac56ac4f" width= "569" height= "458" tpurl= "" tpauthkey= "" attachedtext= "" attachedtextcolor= "" lensid= "" emojiattr= "" linkid= "" desc= "" ></emoji>  </msg>`

const parser = new XMLParser({
  ignoreAttributes: false,  // 不忽略属性
  attributeNamePrefix: '',  // 属性名前缀（空字符串表示不添加前缀）
  textNodeName: 'text'      // 文本节点名称
})


// 创建 agent 实例
const agent = new WechatferryAgent()

agent.on('login', (userInfo) => {
  console.log('登录成功', userInfo)
  // 获取最新24小时，类型为1的消息
  let msgContent = ''
  const msgList = agent.getHistoryMessageList('iantian1995', (sql) => {
    sql.where('type', 1).limit(5)
    console.log('Generated SQL:', sql.toSQL());
  })
  for (const msg of msgList.reverse()) { 
    if(msg.type === 1){
      if(msg.isSender === 1){
        msgContent += `智能体：${msg.strContent}\n`
      }else{
        msgContent += `用户：${msg.strContent}\n`
      }
    }
  }
  console.log(msgList)
  console.log("可都消息记录：", msgContent)

})

agent.on('error', (err) => {
  console.error('wcf 错误:', err)
})



// 启动 wcf
agent.start()
