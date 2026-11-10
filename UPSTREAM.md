# Upstream and local changes

- Upstream project: https://github.com/Tencent/BrowserSkill
- Upstream license: MIT; the original Tencent copyright notice is preserved.
- Local source base: `9f55bdfaeb6b04d2e32228d1735b1a901a531cc6`.
- This export preserves the existing local fork, including uncommitted changes.
- The export label `20261110` is a packaging date, not a new upstream version.

Primary local changes are the native `tool.drag` CLI/protocol/daemon/extension route,
bounded pointer trajectory generator, and associated tests. See:

- `source/crates/bsk-cli/src/cli/drag.rs`
- `source/crates/bsk-protocol/src/tools/interaction.rs`
- `source/apps/extension/src/tools/interaction.ts`
- `source/apps/extension/src/tools/pointer-trajectory.ts`
- `source/apps/extension/src/tools/__tests__/drag.test.ts`
- `source/apps/extension/src/tools/__tests__/pointer-trajectory.test.ts`

The complete local source snapshot is in `source/`, without its Git history,
dependency installs, build caches, local daemon home, browser profiles or logs.
Upstream example skills embedded in that source are upstream project material;
the user's separately installed collection/recovery skills are not included.

The exported prebuilt extension is intentionally byte-identical to the local
test extension, including the original test name. Build with the isolated
WebSocket endpoint described in `docs/BUILD.md`; the upstream default endpoint
in the retained source config is not the isolated runtime endpoint.

The Windows executable is a separate Release asset, not a Git source file.
Its original SHA-256 and all source/extension hashes are recorded in
`PROVENANCE.json`. No source-level functionality was changed for this export.

The retained upstream `remote-tls/cert.pem` and `remote-tls/key.pem` are public
loopback-TLS test fixtures required by upstream tests, not user certificates or
account secrets. The ignore rules allow only those two exact fixture paths.
