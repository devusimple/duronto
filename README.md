# duronto

Development-time-only tool for designing database schemas in TypeScript and converting them to SQL.

- Write schemas in a simple, strictly typed TypeScript API.
- CLI turns them into SQL (`CREATE TABLE`, `ALTER TABLE`, ...) and TypeScript types.
- Installed as a `devDependency`; nothing ships in the production bundle.

## Quick start

```bash
npm i -D duronto
npx duronto init
npx duronto sql
```

## Documentation

See the [`docs/`](./docs) folder.

## License

MIT