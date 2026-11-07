import { snakeCase } from "../core/naming.js";
import { isTable } from "../core/table.js";
import type { TableImpl, ConstraintDescriptor } from "../core/table.js";
import type { Column } from "../core/column.js";
import type { IR, IRTable, IRColumn, IRIndex, IRForeignKey, LogicalType } from "../core/ir.js";
import { IR_VERSION } from "../core/ir.js";
import { durontoError } from "../core/errors.js";
import { validateRefTarget, validateForeignKeyTarget } from "./validate.js";

type AnyCol = Column<any, any, any>;

interface ColLocation {
  table: TableImpl<any>;
  tsKey: string;
  column: AnyCol;
}

export function collectTables(mod: Record<string, unknown>): TableImpl<any>[] {
  const out: TableImpl<any>[] = [];
  for (const v of Object.values(mod)) {
    if (isTable(v)) out.push(v as TableImpl<any>);
  }
  return out;
}

function buildLocationMap(tables: TableImpl<any>[]): Map<AnyCol, ColLocation> {
  const m = new Map<AnyCol, ColLocation>();
  for (const t of tables) {
    for (const [k, c] of Object.entries(t.columns)) {
      m.set(c as AnyCol, { table: t, tsKey: k, column: c as AnyCol });
    }
  }
  return m;
}

function sqlName(col: AnyCol, tsKey: string): string {
  return col.state.sqlNameOverride ?? snakeCase(tsKey);
}

export function compileSchema(mod: Record<string, unknown>): IR {
  const tables = collectTables(mod);
  const locMap = buildLocationMap(tables);

  const deps = new Map<string, Set<string>>();
  for (const t of tables) deps.set(t.tableName, new Set());

  interface CompiledTable {
    table: TableImpl<any>;
    columnsSqlNames: Map<string, string>;
    irColumns: Record<string, IRColumn>;
    primaryKey: string[];
    uniques: string[][];
    indexes: IRIndex[];
    checks: string[];
    foreignKeys: IRForeignKey[];
  }

  const compiled = new Map<string, CompiledTable>();

  for (const t of tables) {
    const ct: CompiledTable = {
      table: t,
      columnsSqlNames: new Map(),
      irColumns: {},
      primaryKey: [],
      uniques: [],
      indexes: [],
      checks: [],
      foreignKeys: [],
    };
    compiled.set(t.tableName, ct);

    for (const tsKey of Object.keys(t.columns)) {
      const col = t.columns[tsKey] as AnyCol;
      ct.columnsSqlNames.set(tsKey, sqlName(col, tsKey));
    }

    for (const [tsKey, rawCol] of Object.entries(t.columns)) {
      const col = rawCol as AnyCol;
      const sName = ct.columnsSqlNames.get(tsKey)!;

      let kind: LogicalType = col.state.kind === "ref" ? "text" : (col.state.kind as LogicalType);
      let length = col.state.length;
      let enumValues = col.state.enumValues;
      let references: IRColumn["references"] | undefined;

      if (col.state.isRef) {
        const thunk = col.state.referencesThunk!;
        let target: AnyCol;
        try {
          target = thunk() as AnyCol;
        } catch {
          throw new durontoError(
            "REF_TARGET_NOT_FOUND",
            `Column "${tsKey}" on table "${t.tableName}" references a target that could not be resolved.`,
            "Ensure the referenced table/column exists and is exported.",
          );
        }
        const loc = validateRefTarget(t.tableName, tsKey, col, target, locMap);
        const targetCol = loc.column;
        const targetKind = targetCol.state.kind === "ref" ? "text" : targetCol.state.kind;
        kind = (targetKind === "id" ? "int" : targetKind) as LogicalType;
        length = targetCol.state.length;
        enumValues = targetCol.state.enumValues;

        const targetSqlName = sqlName(targetCol, loc.tsKey);
        references = {
          table: loc.table.tableName,
          column: targetSqlName,
          onDelete: col.state.onDelete,
          onUpdate: col.state.onUpdate,
        };

        if (loc.table.tableName !== t.tableName) {
          deps.get(t.tableName)!.add(loc.table.tableName);
        }
      }

      const irCol: IRColumn = {
        type: kind,
        notNull: col.state.notNullFlag,
        primaryKey: col.state.primaryKeyFlag,
        unique: col.state.uniqueFlag,
      };
      if (length !== undefined) irCol.length = length;
      if (enumValues !== undefined) irCol.enumValues = enumValues;
      if (col.state.defaultNowFlag) irCol.default = { kind: "now" };
      else if (col.state.hasDefaultFlag) {
        if (col.state.defaultVal !== undefined) irCol.default = { kind: "value", value: col.state.defaultVal };
        else if (col.state.kind === "id") irCol.default = { kind: "auto" };
      }
      if (col.state.kind === "id") {
        if (!irCol.default) irCol.default = { kind: "auto" };
      }
      if (col.state.checkExpr) irCol.check = col.state.checkExpr;
      if (references) irCol.references = references;
      if (col.state.renamedFrom) irCol.renamedFrom = col.state.renamedFrom;

      ct.irColumns[sName] = irCol;

      if (col.state.primaryKeyFlag) {
        if (!ct.primaryKey.includes(sName)) ct.primaryKey.push(sName);
      }
      if (col.state.indexFlag) {
        ct.indexes.push({ name: `${t.tableName}_${sName}_idx`, columns: [sName], unique: false });
      }
      if (col.state.isRef && !col.state.noIndexFlag && !col.state.uniqueFlag) {
        ct.indexes.push({ name: `${t.tableName}_${sName}_idx`, columns: [sName], unique: false });
      }
    }

    for (const c of t.constraints) {
      const colsSql = c.columns.map((cc: AnyCol) => {
        const loc = locMap.get(cc);
        if (loc && loc.table === t) return sqlName(loc.column, loc.tsKey);
        for (const [tsk, col] of Object.entries(t.columns)) {
          if (col === cc) return sqlName(col as AnyCol, tsk);
        }
        throw new durontoError("CONSTRAINT_COLUMN_NOT_FOUND", `Constraint references an unknown column on table "${t.tableName}".`);
      });

      switch (c.kind) {
        case "pk":
          ct.primaryKey = colsSql;
          break;
        case "unique":
          ct.uniques.push(colsSql);
          break;
        case "index":
          ct.indexes.push({ name: c.name ?? `${t.tableName}_${colsSql.join("_")}_idx`, columns: colsSql, unique: !!c.unique });
          break;
        case "check":
          if (c.checkExpr) ct.checks.push(c.checkExpr);
          break;
        case "fk": {
          const thunk = c.refThunk!;
          const res = validateForeignKeyTarget(t.tableName, colsSql, thunk, locMap);
          const raw = thunk();
          const targets = Array.isArray(raw) ? raw : [raw];
          const targetSqlNames = targets.map((tg) => {
            const l = locMap.get(tg as AnyCol)!;
            return sqlName(l.column, l.tsKey);
          });
          ct.foreignKeys.push({
            columns: colsSql,
            references: { table: res.table.tableName, columns: targetSqlNames },
            onDelete: c.onDelete ?? "no action",
            onUpdate: c.onUpdate ?? "no action",
          });
          if (res.table.tableName !== t.tableName) deps.get(t.tableName)!.add(res.table.tableName);
          break;
        }
      }
    }
  }

  // topological sort
  const sortedNames: string[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();
  function visit(name: string) {
    if (visited.has(name)) return;
    if (temp.has(name)) {
      if (!sortedNames.includes(name)) sortedNames.push(name);
      return;
    }
    temp.add(name);
    const d = deps.get(name);
    if (d) {
      for (const dep of d) {
        if (byName.has(dep)) visit(dep);
      }
    }
    temp.delete(name);
    visited.add(name);
    sortedNames.push(name);
  }
  const byName = new Map(tables.map((t) => [t.tableName, t]));
  for (const t of [...tables].sort((a, b) => a.tableName.localeCompare(b.tableName))) {
    visit(t.tableName);
  }
  for (const t of tables) {
    if (!sortedNames.includes(t.tableName)) sortedNames.push(t.tableName);
  }

  const irTables: Record<string, IRTable> = {};
  for (const name of sortedNames) {
    const ct = compiled.get(name)!;
    const sortedCols: Record<string, IRColumn> = {};
    for (const key of Object.keys(ct.irColumns).sort()) {
      sortedCols[key] = ct.irColumns[key]!;
    }
    ct.indexes.sort((a, b) => a.name.localeCompare(b.name));
    irTables[name] = {
      name,
      columns: sortedCols,
      primaryKey: ct.primaryKey,
      uniques: ct.uniques,
      indexes: ct.indexes,
      checks: ct.checks,
      foreignKeys: ct.foreignKeys,
    };
  }

  return { version: IR_VERSION, tables: irTables };
}
