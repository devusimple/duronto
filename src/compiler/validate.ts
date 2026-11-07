import { durontoError } from "../core/errors.js";
import type { TableImpl } from "../core/table.js";
import type { Column } from "../core/column.js";
;

export type AnyCol = Column<any, any, any>;

export function validateRefTarget(
  tableName: string,
  tsKey: string,
  col: AnyCol,
  target: AnyCol,
  locMap: Map<AnyCol, { table: TableImpl<any>; tsKey: string; column: AnyCol }>,
): { table: TableImpl<any>; tsKey: string; column: AnyCol } {
  const loc = locMap.get(target);
  if (!loc) {
    throw new durontoError(
      "REF_TARGET_NOT_FOUND",
      `Column "${tsKey}" on table "${tableName}" references an unknown column.`,
      "The ref() target must be a column of a table in the schema.",
    );
  }
  const targetCol = loc.column;
  const targetIsKey =
    targetCol.state.primaryKeyFlag ||
    targetCol.state.uniqueFlag ||
    loc.table.constraints.some(
      (c) => (c.kind === "unique" || c.kind === "pk") && c.columns.includes(targetCol),
    );
  if (!targetIsKey) {
    throw new durontoError(
      "REF_TARGET_NOT_UNIQUE",
      `Column "${tsKey}" on table "${tableName}" references "${loc.table.tableName}.${loc.tsKey}" which is not unique or a primary key.`,
      "Add .unique() or .primaryKey() to the referenced column.",
    );
  }
  if ((col.state.onDelete === "set null" || col.state.onUpdate === "set null") && col.state.notNullFlag) {
    throw new durontoError(
      "REF_SET_NULL_NOT_NULL",
      `Column "${tsKey}" on table "${tableName}" uses ON DELETE/UPDATE SET NULL but is NOT NULL.`,
      "Remove .notNull() or change the referential action.",
    );
  }
  return loc;
}

export function validateForeignKeyTarget(
  tableName: string,
  colNames: string[],
  targetThunk: () => AnyCol | AnyCol[],
  locMap: Map<AnyCol, { table: TableImpl<any>; tsKey: string; column: AnyCol }>,
): { table: TableImpl<any>; columns: string[] } {
  const raw = targetThunk();
  const targets = Array.isArray(raw) ? raw : [raw];
  const locs = targets.map((t) => {
    const loc = locMap.get(t);
    if (!loc) {
      throw new durontoError(
        "FK_TARGET_NOT_FOUND",
        `Foreign key on table "${tableName}" references an unknown column.`,
        "Ensure the referenced columns exist.",
      );
    }
    return loc;
  });
  const tables = new Set(locs.map((l) => l.table.tableName));
  if (tables.size > 1) {
    throw new durontoError(
      "FK_TARGET_MIXED_TABLES",
      `Foreign key on table "${tableName}" references columns from multiple tables.`,
      "All referenced columns must belong to the same table.",
    );
  }
  return { table: locs[0]!.table, columns: locs.map((l) => l.tsKey) };
}

export function findCycles(tables: TableImpl<any>[]): string[][] {
  // returns list of cycles (each as array of table names)
  const byName = new Map(tables.map((t) => [t.tableName, t]));
  // build adjacency lazily in compile; this helper just does generic cycle detection on provided adjacency
  return [];
}

export function detectCycles(adj: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  function dfs(n: string) {
    visited.add(n);
    stack.push(n);
    onStack.add(n);
    for (const m of adj.get(n) ?? []) {
      if (!visited.has(m)) dfs(m);
      else if (onStack.has(m)) {
        const idx = stack.indexOf(m);
        cycles.push(stack.slice(idx));
      }
    }
    stack.pop();
    onStack.delete(n);
  }
  for (const n of adj.keys()) {
    if (!visited.has(n)) dfs(n);
  }
  return cycles;
}