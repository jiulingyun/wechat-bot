// src/config/loader.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

interface LoadConfigOptions {
  env?: string;
  path?: string;
}

export function loadConfig(options: LoadConfigOptions = {}) {
  const env = options.env || process.env.NODE_ENV || 'development';
  const envPath = options.path || path.resolve(process.cwd(), `.env.${env}`);
  
  // 加载指定环境的 .env 文件
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.warn(`未能加载 ${envPath} 配置文件:`, result.error.message);
    // 尝试加载默认 .env 文件
    dotenv.config();
  }
  
  // 设置 NODE_ENV 环境变量
  process.env.NODE_ENV = env;
  
  console.log(`已加载 ${env} 环境配置`);
  return env;
}