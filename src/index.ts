export * from "./core/column.js";
export * from "./core/table.js";
export * from "./core/types.js";
export * from "./core/ir.js";
export * from "./core/naming.js";
export * from "./core/errors.js";
export { compileSchema, collectTables } from "./compiler/compile.js";
export { sqliteDialect } from "./dialects/sqlite/index.js";
import { sqliteDialect } from "./dialects/sqlite/index.js";
export { postgresDialect } from "./dialects/postgres/index.js";
import { postgresDialect } from "./dialects/postgres/index.js";
export type { Dialect } from "./dialects/types.js";

import type { Dialect } from "./dialects/types.js";

export interface durontoConfig {
  schema: string;
  out: string;
  dialect: "sqlite" | "postgres";
  naming?: "snake_case" | "camelCase";
}

export function defineConfig(config: durontoConfig): durontoConfig {
  return config;
}

export function getDialect(name: string): Dialect {
  if (name === "sqlite") return sqliteDialect as unknown as Dialect;
  if (name === "postgres") return postgresDialect as unknown as Dialect;
  throw new Error(`Unknown dialect: ${name}`);
}