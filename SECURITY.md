# 安全与隐私

## 组件能访问什么？

测试扩展沿用 BrowserSkill 的浏览器自动化架构。其 manifest 包含 `debugger`、`tabs`、`scripting`、`storage` 等权限及页面访问声明；原生输入由相应浏览器会话中的扩展执行。这些是敏感能力，不应把“本地服务”理解为天然隔离或无风险。

安装前可以直接审阅 [扩展 manifest](extension/manifest.json) 与 [完整源码](source/)。端口使用 `52841`，独立包装入口使用 `%LOCALAPPDATA%\BrowserSkillDragStandalone\bsk-home`。这些配置用于区分运行环境，不是对恶意本地程序的安全沙箱。

## 使用中的检查

- 从本仓库和对应 Release 获取成套组件，核对 SHA-256。
- 显式核对 profile、测试扩展实例、session 与 tab；不让原版与测试版同时控制同一标签页。
- 保留页面借用、合作状态、人工接管和停止机制。
- 不公开 daemon 运行目录，不把服务擅自暴露到公网。
- 输入返回未知、取消或拒绝时先检查状态，不盲目重复动作。
- 完成后结束自有会话、归还用户页面并停止独立服务。

## 发布与反馈中应隐藏的资料

Cookie、token、登录二维码、手机号、收货地址、订单、完整浏览器 profile、认证请求载荷、账号映射和原始会话日志均不应公开。

普通 Bug 可以在脱敏后提交 Issue。报告漏洞时，优先查看仓库 Security 页面是否提供私密的 **Report a vulnerability** 入口；若没有，先向维护者询问非公开沟通方式，不要在公开 Issue 中贴出秘密或可直接滥用的载荷。本项目没有在此虚构邮箱或保证响应时效。

## 公开测试证书

`source/crates/bsk-cli/tests/fixtures/remote-tls/` 内的证书与密钥是保留的上游回环 TLS 测试夹具，不是用户证书。它们是公开资料，不应用于实际服务、账号或生产通信。
