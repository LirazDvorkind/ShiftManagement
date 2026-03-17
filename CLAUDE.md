# Shift Management — Claude Repository Rules

## Semver Version Bumping (REQUIRED on every commit)

Before every commit, you **must** update the `version` field in `package.json` following these rules:

| Change type | Bump | Examples |
|---|---|---|
| Bug fix, copy/style tweak, refactor with no behaviour change | **PATCH** (0.0.x) | fix typo, adjust colour, fix off-by-one |
| New user-visible feature or non-breaking API addition | **MINOR** (0.x.0) | new UI component, new endpoint, new config option |
| Breaking change to API contract, DB schema, or auth flow | **MAJOR** (x.0.0) | removing a field, changing auth mechanism |

### Rules
- The single source of truth for the version is the `version` field in `package.json`.
- Always increment — never decrement or leave unchanged after a real code change.
- When in doubt between PATCH and MINOR, choose MINOR.
- Include the new version number in the commit message, e.g. `feat: add calendar export (v1.2.0)`.
- The version is automatically shown in the app footer — no extra steps needed.
