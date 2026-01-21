# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-20

### Added
- Initial release
- TrackedPool class that extends pg.Pool
- Automatic SQL query tracking with function name, file path, and line number
- Support for both direct pool queries and client-based queries
- Smart path extraction (workspace folders, node_modules handling, fallback to filename)
- Full TypeScript support with type definitions
- Zero-configuration drop-in replacement for pg.Pool
- Comprehensive documentation and examples

### Features
- Minimal performance overhead (~100μs per query)
- No storage overhead (comments stripped by PostgreSQL)
- Compatible with pg.Pool API (callbacks and promises)
- Works with pg_stat_statements for query performance tracking
- Supports PostgreSQL log analysis tools (pgBadger, PgHero, etc.)
