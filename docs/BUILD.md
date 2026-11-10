# 从源码构建

此项目保留完整本地 fork，而非仅抽出一个脱离 BrowserSkill 的脚本。
原生动作需要 CLI → daemon → 协议 → 扩展成套匹配。

先安装 Rust stable（项目声明 Rust >= 1.85；源码保留自己的 toolchain 配置）、Node.js 和 `pnpm@10.17.0`。
Windows 构建另需对应 Rust target 的链接器/原生构建工具。依赖版本以 `Cargo.lock` 和 `pnpm-lock.yaml` 为准。

从项目根运行：

```powershell
.\tools\build.ps1 -Plan
.\tools\build.ps1
```

`-Plan` 只显示命令，不下载、不构建、不启动服务。构建流程为：

```powershell
cd source
pnpm install --frozen-lockfile
cargo build -p bsk --release --locked
$env:BSK_DAEMON_WS_URL='ws://127.0.0.1:52841'
pnpm --filter @browser-skill/extension build
```

构建产物位于 `source/target/release/bsk.exe` 和 `source/apps/extension/dist/chrome-mv3/`。
脚本不覆盖已打包 `extension/` 或预编译 runtime，也不安装到任何 profile；需维护者自行审核后发布。
保留源码中的默认 `52800` 是为了不改原实现，构建脚本显式设置 `52841` 才与独立配套 runtime 一致。

原拖拽测试可在安装依赖后于 `source/apps/extension` 运行：

```powershell
pnpm test src/tools/__tests__/drag.test.ts src/tools/__tests__/pointer-trajectory.test.ts
```

此次导出没有重新编译预编译程序；验收区分原样二进制校验、打包完整性和离线单元测试，不把它们表述为新的真实验证码测试。

若本机策略不允许执行 PowerShell 文件，直接在开发终端逐条运行上面的构建命令即可；不需要为了构建而修改系统策略。
