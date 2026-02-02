import { WechatferryAgent } from '@wechatferry/agent'
import express from 'express'
import type { Request, Response } from 'express'
import fs from 'fs'
import path from 'path'


// 创建 agent 实例
const agent = new WechatferryAgent()

agent.on('login', (userInfo) => {
  console.log('登录成功', userInfo)
})

// 监听微信消息
agent.on('message', async (msg) => {
  console.log(msg)
  if(msg.type === 1){
    if(msg.content === 'coze'){
      // const fun = agent.wcf.acceptFriend(
      //   'v3_020b3826fd030100000000006ffb0f8ca55d89000000501ea9a3dba12f95f6b60a0536a1adb64e6a3697615aea972e7cbc7ffa3802ad546558548f3a3a831a3fb598425134d57735fe82cb636df588e4465098994f7e4b5659381544e99296780956af@stranger',
      //   'v4_000b708f0b040000010000000000c65cf301c8ce32d68f22ea2b96681000000050ded0b020927e3c97896a09d47e6e9efd76f7d45adfba548837e6fc0f83f58ccbe48931efad5ef9f881e0bea27821e6dd51297be1f1764f69f459a5f7bc3b36b2b735222a342c2e20e12213f47f98c486bb70578067ce53404eba41ac9a3d15a90c13f76758a37e3107e008022223c10811508b91c36041c2d3121817d3135fe01a69f0e4315b6b7edd71a6dab73d009c5401ca05d54ef1084f6e7c0cb7269c050c301c2b06729dd890587fa4bd9f274bde74dc49fe0e3c0c1a93e3ac549f5bc25f8d66de78ba66570284ad5453cfecd9b04f5f2ce3729af29601cd2975b0cb29c47d1c107c8a7c8fb757a1ef3eae1571491719d065c9a88d081f12381afc7e064df2e115f761194394a137241016d9acc1510d16dd318eaa01a93def3321409c6d8639480fba3d95@stranger'
      // )
      const fun = agent.getContactInfo('wxid_nx55f5ecx7jx22')
      console.log("好友同意结果：", fun)
    }
  }  
})

// 启动 wcf
agent.start()