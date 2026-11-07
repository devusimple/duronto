# duronto Documentation

duronto is a development-time-only tool for designing database schemas in TypeScript and converting them to SQL.

## Contents

- [Getting started](./getting-started.md)
- [Writing a schema](./schema.md)
- [Type inference](./types.md)
- [CLI](./cli.md)
- [IR (Intermediate Representation)](./ir.md)
- [Migrations](./migrations.md)

## Core principles

1. Easiest possible schema design.
2. Strict type safety (types inferred from schema).
3. Zero runtime footprint (devDependency only).
4. Lightweight.
5. Scalable (dialects are pluggable).

See [AGENTS.md](../AGENTS.md) for the full specification.