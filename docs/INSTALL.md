# 安装与独立运行

需要 Windows x64、兼容的 Chromium 浏览器，扩展最低 Chromium 版本为 125。源码构建可以在其他平台另行进行，当前预编译程序仅为 Windows x64。

1. 从源码包取出项目；从 Windows runtime ZIP 取出 `runtime/` 并合并到项目根。得到 `runtime/windows-x64/bsk-drag.exe`。
2. 运行 `python tools/verify_release.py --require-runtime`。
3. 在目标 profile 的扩展管理页选择“加载已解压的扩展程序”，选 `extension/`。现用官方插件无需覆盖或卸载；两个实例的 ID 不相同。
4. 新终端运行 `tools/bsk-drag.cmd daemon-start`，此终端保持打开。包装入口固定独立端口 `52841`、独立 `BSK_HOME`、`BSK_AUTO_START=0`。
5. 另一终端用 `tools/bsk-drag.cmd browsers --json` 查询实际连接，再按配套 CLI 的 `session start --help` 创建明确绑定实例的会话。

Windows 优先使用 `.cmd` 入口，不需要调整系统 PowerShell 执行策略。`.ps1` 是可选入口，只在本机策略已允许脚本时使用；本项目不改变系统策略。

浏览器操作和借用确认仍遵循测试扩展自己的设置。已有官方实例不能当成测试实例。端口占用、页面人工接管、授权待定或拒绝时不通过换后端恢复。

不使用上游 `install.ps1` 或 `bsk update` 安装本导出版；它们属于上游官方发行流程，不负责安装本测试分支。

## 结束与回退

- 按 CLI 的会话生命周期先结束自己的会话、归还借用页面。
- `tools/bsk-drag.cmd daemon-stop` 只读取本导出版自己的 runtime home，不能用来停止原版服务。
- 在相应 profile 中禁用或移除此测试扩展即可结束使用；原插件和原采集 skills 不变。
- 不删除浏览器 profile、账号配置或原 `.bsk` 来回退。

本次打包没有替你安装、启用、禁用或更新任何插件，也没有运行以上服务命令。
