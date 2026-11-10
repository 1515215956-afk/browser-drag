# browser drag

**专注于淘宝、天猫等电商平台滑块验证处理的浏览器扩展实验项目。**

browser drag 基于 [Tencent/BrowserSkill](https://github.com/Tencent/BrowserSkill)，将滑块处理所需的原生鼠标拖拽、线性与 Bezier 曲线轨迹，以及配套 CLI/daemon 独立封装，便于接入电商浏览器自动化流程。

项目重点面向淘宝、天猫等电商页面出现滑块验证时的处理与同页结果核验；实际是否通过仍取决于页面和平台验证结果，不以拖拽命令完成代替验证通过。

本项目保留 MIT 许可证。独立发布不替换现用插件、全局 CLI 或用户采集 skills；账号资料与采集数据不包含在仓库中。

## 包含什么

| 目录 | 内容 |
| --- | --- |
| `extension/` | 可直接加载的 MV3 测试扩展，名称 `BrowserSkill Drag Test (isolated)` |
| `source/` | 完整配套源码：扩展、Rust CLI/daemon、协议及上游依赖包源码 |
| `tools/` | 独立调用入口、构建脚本、导出完整性验收 |
| `docs/` | 安装、构建及 GitHub 发布说明 |
| `PROVENANCE.json` | 来源版本及源码、扩展、配套程序的 SHA-256 |

**版本锁定：测试扩展/CLI 0.3.3、协议 1.6、端口 52841。** 这不是官方 0.4.1 更新版，不能与其 CLI/daemon 混用。

配套 Windows 程序在独立的 `BrowserSkill-Drag-windows-x64-20261110.zip` 中；解压后将 `runtime/` 合并到本项目根目录。该程序原样保留，未修改原二进制。`runtime/` 不提交 Git，应作为 GitHub Release 附件。Windows 优先使用 `.cmd` 入口，无需调整 PowerShell 执行策略。

## 能力边界

已有实现提供 `tool.drag` 原生鼠标按下、移动、释放，以及线性/可复现种子的 Bezier 曲线；保留会话、合作上下文、取消和未知效果处理。**它不是安装后自动运行的验证码识别服务。** 平台验证是否接受需要同页单独确认，不能以命令成功替代验证成功。

此次分离没有重新访问淘宝或进行真实验证码测试。用户采集规则、账号调度、恢复门禁与账号资料不在本项目中，也不随上传公开。

## 安装与调用

1. 解压项目和配套 runtime，运行 `python tools/verify_release.py --require-runtime` 核对文件。
2. 在需要使用的 Chromium profile 中打开扩展管理页，开启开发者模式，加载本项目的 **`extension/`** 目录。不要把 `source/` 当成可加载扩展。
3. 在一个单独的 PowerShell 终端执行：

   ```powershell
   .\tools\bsk-drag.cmd daemon-start
   ```

   该命令在前台运行独立服务；如端口被占用，应先确认占用者，不要停止原服务。

4. 在另一个 PowerShell 终端查询连接：

   ```powershell
   .\tools\bsk-drag.cmd browsers --json
   .\tools\bsk-drag.cmd drag --help
   ```

   每个新会话显式指定实际测试扩展的 `--browser` 实例，不能复用原版插件的 ID。服务状态保存在 `%LOCALAPPDATA%\BrowserSkillDragStandalone\bsk-home`，不会使用原来的 `.bsk`。不要把两个扩展同时用于同一标签页。

详见 [安装说明](docs/INSTALL.md)、[构建说明](docs/BUILD.md)、[GitHub 发布说明](docs/GITHUB.md)。

## 自检

```powershell
python tools/verify_release.py
python tools/verify_release.py --require-runtime
```

前者验证源码、扩展和公开包；后者额外校验配套 Windows 程序。验收不会连接浏览器、启动 daemon 或发送鼠标动作。

## 给 Agent 的可复用任务提示

```text
只使用此项目配套的 CLI、daemon 和测试扩展；先读 PROVENANCE.json 与安装说明。
显式绑定用户指定 profile 对应的测试扩展实例。先同步并核实当前目标，再执行获授权的动作。
保留合作状态、停止按钮和未知效果处理；不混用官方 CLI，不改已有采集 skills。
动作完成与页面业务结果分开验收；没有同页证据时不声称验证通过。
```

## 来源

上游版权：Copyright (c) 2026 Tencent。当前导出来自本地基线提交 `9f55bdfaeb6b04d2e32228d1735b1a901a531cc6` 加本地拖拽变更，不冒充上游正式 Release。见 [UPSTREAM.md](UPSTREAM.md) 和 [LICENSE](LICENSE)。
