# 测试与证据边界

## 已有离线测试

2026-11-10，对保留的两个拖拽相关测试文件实际执行后，49 项用例全部通过：

- `source/apps/extension/src/tools/__tests__/drag.test.ts`
- `source/apps/extension/src/tools/__tests__/pointer-trajectory.test.ts`

这些测试覆盖参数约束、确定性轨迹、输入分发、过期或越界目标、按下/移动/释放、取消、期限、释放失败及同 tab 串行处理等相关分支。测试使用受控夹具，不应据此得出淘宝/天猫通用通过率。

本次文档发布未将私人测试日志和账号页面公开。这里记录的是当时执行结果，不把它包装成读者已经在自己机器上复现的结果。

## 如何复现源码测试

按 [BUILD.md](BUILD.md) 准备对应开发依赖；`pnpm install --frozen-lockfile` 的扩展准备步骤会生成 WXT 配置。然后在 `source/apps/extension` 中运行：

```powershell
pnpm test src/tools/__tests__/drag.test.ts src/tools/__tests__/pointer-trajectory.test.ts
```

新环境依赖、平台与工具链可能影响运行。首次遇到缺少 `.wxt` 生成配置或 workspace 依赖时，应先完成构建准备，不通过删测试或跳过分支消除错误。

## 公开包完整性

在项目根目录执行：

```powershell
python tools/verify_release.py
python tools/verify_release.py --require-runtime
```

第一条验证源码、扩展和公开文件清单；第二条还要求配套 Windows runtime 存在且哈希匹配。它们不启动服务，不证明当前浏览器已经连接，也不执行真实页面输入。

## 真实页面结果如何描述

依次记录：

1. 当前获授权的 profile、实例、session、tab 与目标是否匹配。
2. 输入是否实际发送、是否完成、鼠标是否释放，是否存在未知效果。
3. 同页验证是否明确接受，或挑战是否消失且页面状态稳定。
4. 原业务流程是否仍存在登录、访问异常或数据质量问题。

动作成功、页面接受和业务恢复是不同结果。没有相应证据就保留未知，不将历史单页现象扩展成通用成功率。

README 中的图片为原理与安装示意；本次首页更新不包含新的在线验证码测试。
