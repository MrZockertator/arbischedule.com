# Changelog

All notable changes to this project are documented in this file.

## [1.0.0] - 2026-03-05

### Added

- Tooling baseline with lint, typecheck, and test scripts.
- CI workflow for lint, typecheck, tests, and dependency audit.
- Dependency automation via Dependabot.
- Runtime validation and resilient fetch path for upstream data.
- Modularized app structure for search, nodes, table, timezone, theme, and services.
- Unit and smoke tests for critical parsing, formatting, storage, and rendering flows.
- Global browser error capture with local ring-buffer logging.

### Changed

- Hardened CSP and related security headers in `vercel.json`.
- Consolidated duplicate faction, DOM helper, and countdown logic into shared modules.
- Reworked theme preview to event-driven updates without polling.

### Removed

- Duplicate deployment config artifact `nul`.
