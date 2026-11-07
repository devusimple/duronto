import type { Dialect } from "../types.js";
import type { IR, IRColumn, IRTable } from "../../core/ir.js";

export type { Dialect } from "../types.js";

function quote(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function columnType(col: IRColumn): string {
  switch (col.type) {
    case "id":
      return "INTEGER PRIMARY KEY AUTOINCREMENT";
    case "uuid":
      return "TEXT";
    case "text":
      return "TEXT";
    case "varchar":
      return "TEXT";
    case "int":
      return "INTEGER";
    case "bigint":
      return "INTEGER";
    case "real":
      return "REAL";
    case "bool":
      return "INTEGER";
    case "timestamp":
      return "TEXT";
    case "json":
      return "TEXT";
    case "enum":
      return "TEXT";
    default:
      return "TEXT";
  }
}

function literal(value: unknown): string {
  if (value === null) return "NULL";
  if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return `'${value.toISOString()}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function columnDef(table: IRTable, colName: string, col: IRColumn, allTables: Map<string, IRTable>): string {
  const parts: string[] = [quote(colName), columnType(col)];
  // type id already includes primary key; skip adding PK again
  if (col.type !== "id" && col.primaryKey) parts.push("PRIMARY KEY");
  if (col.notNull && col.type !== "id") parts.push("NOT NULL");
  if (col.unique) parts.push("UNIQUE");
  if (col.default) {
    if (col.default.kind === "now") parts.push("DEFAULT CURRENT_TIMESTAMP");
    else if (col.default.kind === "auto") {
      // no clause (autoincrement already in type)
    } else if (col.default.kind === "value") {
      parts.push(`DEFAULT ${literal(col.default.value)}`);
    }
  }
  if (col.check) parts.push(`CHECK (${col.check})`);
  if (col.references) {
    const ref = col.references;
    let clause = `REFERENCES ${quote(ref.table)}(${quote(ref.column)})`;
    if (ref.onDelete && ref.onDelete !== "no action") clause += ` ON DELETE ${ref.onDelete.toUpperCase().replace("SET NULL", "SET NULL")}`;
    if (ref.onUpdate && ref.onUpdate !== "no action") clause += ` ON UPDATE ${ref.onUpdate.toUpperCase().replace("SET NULL", "SET NULL")}`;
    parts.push(clause);
  }
  // enum check
  if (col.type === "enum" && col.enumValues && col.enumValues.length) {
    const allowed = col.enumValues.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
    parts.push(`CHECK (${quote(colName)} IN (${allowed}))`);
  }
  return parts.join(" ");
}

function columnDefFromIR(colName: string, col: IRColumn): string {
  const parts: string[] = [quote(colName), columnType(col)];
  if (col.type !== "id" && col.primaryKey) parts.push("PRIMARY KEY");
  if (col.notNull && col.type !== "id") parts.push("NOT NULL");
  if (col.unique) parts.push("UNIQUE");
  if (col.default) {
    if (col.default.kind === "now") parts.push("DEFAULT CURRENT_TIMESTAMP");
    else if (col.default.kind === "value") parts.push(`DEFAULT ${literal(col.default.value)}`);
  }
  if (col.check) parts.push(`CHECK (${col.check})`);
  if (col.references) {
    const ref = col.references;
    let clause = `REFERENCES ${quote(ref.table)}(${quote(ref.column)})`;
    if (ref.onDelete && ref.onDelete !== "no action") clause += ` ON DELETE ${ref.onDelete.toUpperCase().replace("SET NULL", "SET NULL")}`;
    if (ref.onUpdate && ref.onUpdate !== "no action") clause += ` ON UPDATE ${ref.onUpdate.toUpperCase().replace("SET NULL", "SET NULL")}`;
    parts.push(clause);
  }
  if (col.type === "enum" && col.enumValues && col.enumValues.length) {
    const allowed = col.enumValues.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
    parts.push(`CHECK (${quote(colName)} IN (${allowed}))`);
  }
  return parts.join(" ");
}

function createTable(table: IRTable, allTables: Map<string, IRTable>): string[] {
  const out: string[] = [];
  const colDefs: string[] = [];
  for (const [colName, col] of Object.entries(table.columns)) {
    colDefs.push(columnDef(table, colName, col, allTables));
  }
  // table-level primary key
  if (table.primaryKey.length > 1 || (table.primaryKey.length === 1 && !table.columns[table.primaryKey[0]!]?.primaryKey)) {
    // emit PK constraint if composite or not already column-level
    if (table.primaryKey.length > 0) {
      const pkCols = table.primaryKey.map(quote).join(", ");
      // avoid duplicate if single id col already PK
      const singleId = table.primaryKey.length === 1 && table.columns[table.primaryKey[0]!]?.type === "id";
      if (!singleId) colDefs.push(`PRIMARY KEY (${pkCols})`);
    }
  }
  // uniques
  for (const u of table.uniques) {
    colDefs.push(`UNIQUE (${u.map(quote).join(", ")})`);
  }
  // checks
  for (const c of table.checks) {
    colDefs.push(`CHECK (${c})`);
  }
  // foreign keys
  for (const fk of table.foreignKeys) {
    let clause = `FOREIGN KEY (${fk.columns.map(quote).join(", ")}) REFERENCES ${quote(fk.references.table)}(${fk.references.columns.map(quote).join(", ")})`;
    if (fk.onDelete !== "no action") clause += ` ON DELETE ${fk.onDelete.toUpperCase().replace("SET NULL", "SET NULL")}`;
    if (fk.onUpdate !== "no action") clause += ` ON UPDATE ${fk.onUpdate.toUpperCase().replace("SET NULL", "SET NULL")}`;
    colDefs.push(clause);
  }

  out.push(`CREATE TABLE ${quote(table.name)} (\n  ${colDefs.join(",\n  ")}\n);`);

  // indexes
  for (const idx of table.indexes) {
    const unique = idx.unique ? "UNIQUE " : "";
    out.push(`CREATE ${unique}INDEX ${quote(idx.name)} ON ${quote(table.name)} (${idx.columns.map(quote).join(", ")});`);
  }
  return out;
}

export const sqliteDialect = {
  name: "sqlite",
  quote,
  columnType,
  createTable: (table: IRTable) => createTable(table, new Map()),
  alterOps: (ops: any[]) => {
    const out: string[] = [];
    for (const op of ops) {
      switch (op.kind) {
        case "dropTable":
          out.push(`DROP TABLE ${quote(op.table)};`);
          break;
        case "addColumn":
          out.push(`ALTER TABLE ${quote(op.table)} ADD COLUMN ${columnDefFromIR(op.column, op.col)};`);
          break;
        case "dropColumn":
          out.push(`ALTER TABLE ${quote(op.table)} DROP COLUMN ${quote(op.column)};`);
          break;
        case "renameColumn":
          out.push(`ALTER TABLE ${quote(op.table)} RENAME COLUMN ${quote(op.from)} TO ${quote(op.to)};`);
          break;
        case "renameTable":
          out.push(`ALTER TABLE ${quote(op.from)} RENAME TO ${quote(op.to)};`);
          break;
        case "addIndex":
          out.push(`CREATE INDEX ${quote(op.index)} ON ${quote(op.table)} (${op.idx.columns.map(quote).join(", ")});`);
          break;
        case "dropIndex":
          out.push(`DROP INDEX ${quote(op.index)};`);
          break;
        case "alterColumn": {
          const newT = op.tableIR;
          const tmpName = op.table + "_new";
          const tmpTable = { ...newT, name: tmpName };
          const stmts = createTable(tmpTable as any, new Map());
          out.push(stmts[0]!);
          const oldCols = Object.keys(op.oldTableIR.columns);
          const common = Object.keys(newT.columns).filter((c: string) => oldCols.includes(c));
          const colList = common.map(quote).join(", ");
          out.push(`INSERT INTO ${quote(tmpName)} (${colList}) SELECT ${colList} FROM ${quote(op.table)};`);
          out.push(`DROP TABLE ${quote(op.table)};`);
          out.push(`ALTER TABLE ${quote(tmpName)} RENAME TO ${quote(op.table)};`);
          for (const idx of newT.indexes) {
            out.push(`CREATE INDEX ${quote(idx.name)} ON ${quote(op.table)} (${idx.columns.map(quote).join(", ")});`);
          }
          break;
        }
        default:
          break;
      }
    }
    return out;
  },
};

// adapt to Dialect interface with allTables param optional
export function createAllSql(ir: IR): string[] {
  const lines: string[] = [];
  const all = new Map(Object.entries(ir.tables));
  for (const t of Object.values(ir.tables)) {
    lines.push(...createTable(t, all));
  }
  return lines;
}
