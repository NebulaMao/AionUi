# aioncore-patches

Git patches applied to the [AionCore](https://github.com/iOfficeAI/AionCore)
backend **at build time** so unreleased core fixes can ship in an AionUi build
without owning an AionCore branch or cutting an AionCore release first.

## How they are used

The `🔨 Manual Build` workflow (`.github/workflows/build-manual.yml`) builds the
core from source when its `aioncore_ref` input is set. After checking out
AionCore at that ref it runs every `*.patch` in this directory against the
checkout, then compiles `aioncore` and bundles it.

- Patches are authored against the **pinned release tag** (`aioncoreVersion` in
  the repo-root `package.json`). Set `aioncore_ref` to that same tag (e.g.
  `v0.1.16`) to build "release + these patches".
- Apply order is lexical by filename — prefix with `NNNN-`.
- Already-applied patches are detected (reverse-check) and skipped; a real
  conflict fails the build with a `3-way merge failed` error.

Leaving `aioncore_ref` empty keeps the default behaviour: download the pinned
release binary as-is (no patching, no compilation).

## Lifecycle

A patch here is temporary. Once its change lands in an AionCore release:

1. Delete the patch file.
2. Bump `aioncoreVersion` in the repo-root `package.json` to that release.

## Current patches

| File | Purpose |
| ---- | ------- |
| `0001-acp-honor-cli-path-override-for-claude.patch` | Make the ACP factory inject a user-configured `cli_path` as `CLAUDE_CODE_EXECUTABLE`, and stop `spawn_sdk` from overwriting it with `$PATH` auto-detection. An explicit `conversation.extra.cli_path` wins; otherwise the factory falls back to the **global** `acp.config[key].cli_path` preference (`client_preferences`). The global fallback is what makes the Settings → Agents CLI-path override apply to *every* Claude spawn — UI conversations, **channels (Telegram/WeCom/Lark/…)**, cron jobs, and team teammates — not just conversations created through the desktop create-flow. Threads a `client_pref_repo` into `AgentFactoryDeps`. |
