# 上传 GitHub

将本项目 `github/` **里面的内容**作为新仓库根目录上传。
公开源码 ZIP 和 Windows runtime ZIP 分开，避免把大体积二进制混进 Git 历史。

## 源码仓库

在 `github/` 目录初始化并审核：

```powershell
python tools/verify_release.py
git init
git add .
git diff --cached --stat
```

核对后在自己的新仓库提交和推送。此包没有预设远程地址、账号、token、profile ID 或登录信息。
`runtime/` 已被忽略，不会随 `git add .` 加入；不要使用 `git add -f runtime`。

## Release 附件

把以下 ZIP 作为 Release 附件，不把解压后的可执行文件直接提交到 Git：

- `BrowserSkill-Drag-source-20261110.zip`：源码、可加载扩展、文档与校验工具。
- `BrowserSkill-Drag-windows-x64-20261110.zip`：原样的 Windows CLI/daemon。
- 对应的 `.sha256` 校验文件。

预编译程序原始大小约 277 MiB，因此与源码仓库分离。公开项目包不包含本机测试日志、会话、截图、账号映射、采集数据、浏览器 profile 或用户采集 skills。

上游 `source/.github/` 仅作为源码保留，其 workflows 不位于新仓库根 `.github/workflows/`，不会因这次上传而作为本项目的发布流水线执行。
根目录只提供无密钥、只读验收的 Python CI，不自动发布 npm、扩展或二进制。
