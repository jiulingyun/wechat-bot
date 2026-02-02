# 安全策略 / Security Policy

## 支持的版本 / Supported Versions

当前项目处于活跃开发阶段，我们建议始终使用最新版本以获得最新的安全更新。

Current project is in active development phase, we recommend always using the latest version to get the latest security updates.

## 报告安全漏洞 / Reporting a Vulnerability

如果您发现安全漏洞，请通过以下方式联系我们：

If you discover a security vulnerability, please contact us through:

- 提交 GitHub Issue / Submit a GitHub Issue
- 邮件联系 / Email contact (如果项目中有维护者邮箱)

我们承诺会在48小时内响应安全相关的报告，并在合理时间内修复已确认的安全漏洞。

We promise to respond to security-related reports within 48 hours and fix confirmed vulnerabilities within a reasonable timeframe.

## 安全最佳实践 / Security Best Practices

### 环境变量安全 / Environment Variable Security

1. **永远不要将敏感信息硬编码到代码中**
   - Never hardcode sensitive information in code

2. **使用环境变量管理密钥**
   - Use environment variables for API keys and secrets
   - 已在 `.gitignore` 中排除 `.env.*` 文件
   - Excluded `.env.*` files in `.gitignore`

3. **敏感文件保护**
   - 私钥文件（如 `coze_private_key.pem`）不应提交到版本控制
   - Private key files (like `coze_private_key.pem`) should not be committed to version control
   - 已在 `.gitignore` 中排除 `*.pem` 文件
   - Excluded `*.pem` files in `.gitignore`

### API 密钥管理 / API Key Management

1. **限制 API 密钥权限**
   - 使用最小权限原则配置 API 密钥
   - Use principle of least privilege when configuring API keys

2. **定期轮换密钥**
   - 定期更换 API 密钥
   - Rotate API keys regularly

3. **监控 API 使用情况**
   - 监控 API 调用频率和模式
   - Monitor API call frequency and patterns

### 运行时安全 / Runtime Security

1. **输入验证**
   - 验证所有外部输入
   - Validate all external inputs

2. **数据加密**
   - 在存储和传输过程中加密敏感数据
   - Encrypt sensitive data during storage and transmission

3. **访问控制**
   - 实施适当的访问控制措施
   - Implement appropriate access controls

## 安全配置检查清单 / Security Configuration Checklist

- [ ] 确保 `.env.*` 文件不在版本控制中 / Ensure `.env.*` files are not in version control
- [ ] 确保私钥文件不在版本控制中 / Ensure private key files are not in version control  
- [ ] 定期审查依赖项的安全性 / Regularly review security of dependencies
- [ ] 验证 API 密钥的最小权限 / Verify least privilege for API keys
- [ ] 监控异常活动 / Monitor for anomalous activity